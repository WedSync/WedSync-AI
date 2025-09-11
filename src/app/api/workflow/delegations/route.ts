import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

const CreateDelegationSchema = z.object({
  task_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  delegation_type: z
    .enum(['assignment', 'approval', 'review', 'collaboration'])
    .default('assignment'),
  authority_level: z.number().min(1).max(5).default(1),
  deadline: z.string().datetime().optional(),
  instructions: z.string().optional(),
});

const UpdateDelegationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'auto_approved']),
  response_notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { searchParams } = new URL(request.url);

    // Get current team member
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id, user_role, authority_level')
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 },
      );
    }

    // Parse filters
    const type = searchParams.get('type') || 'all'; // 'sent', 'received', 'all'
    const status = searchParams.get('status');
    const taskId = searchParams.get('task_id');

    let query = supabase
      .from('delegation_requests')
      .select(
        `
        *,
        task:workflow_tasks(id, title, priority, deadline, status),
        from_user:team_members!delegation_requests_from_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        to_user:team_members!delegation_requests_to_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        delegated_by_user:team_members!delegation_requests_delegated_by_fkey(
          id, name, email, role, avatar_url
        )
      `,
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (type === 'sent') {
      query = query.eq('delegated_by', teamMember.id);
    } else if (type === 'received') {
      query = query.eq('to_user_id', teamMember.id);
    } else {
      query = query.or(
        `delegated_by.eq.${teamMember.id},` +
          `to_user_id.eq.${teamMember.id},` +
          `from_user_id.eq.${teamMember.id}`,
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (taskId) {
      query = query.eq('task_id', taskId);
    }

    const { data: delegations, error } = await query;

    if (error) {
      console.error('Error fetching delegations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch delegations' },
        { status: 500 },
      );
    }

    return NextResponse.json({ delegations });
  } catch (error) {
    console.error('GET /api/workflow/delegations error:', error);
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
    const body = await request.json();

    // Validate input
    const delegationData = CreateDelegationSchema.parse(body);

    // Get current team member
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: teamMember } = await supabase
      .from('team_members')
      .select(
        'id, user_role, authority_level, can_delegate, max_delegation_level',
      )
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 },
      );
    }

    // Check if user can delegate
    if (!teamMember.can_delegate) {
      return NextResponse.json(
        { error: 'User does not have delegation authority' },
        { status: 403 },
      );
    }

    // Check delegation level limits
    if (delegationData.authority_level > teamMember.max_delegation_level) {
      return NextResponse.json(
        {
          error: `Authority level exceeds maximum allowed (${teamMember.max_delegation_level})`,
        },
        { status: 403 },
      );
    }

    // Verify task exists and user has access
    const { data: task } = await supabase
      .from('workflow_tasks')
      .select('id, assigned_to, created_by, assigned_by')
      .eq('id', delegationData.task_id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user has authority over the task
    const canDelegate =
      task.assigned_to === teamMember.id ||
      task.created_by === teamMember.id ||
      task.assigned_by === teamMember.id;

    if (!canDelegate) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delegate this task' },
        { status: 403 },
      );
    }

    // Get target user's authority level
    const { data: targetUser } = await supabase
      .from('team_members')
      .select('id, authority_level, user_role')
      .eq('id', delegationData.to_user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 },
      );
    }

    // Check authority hierarchy (can only delegate down)
    if (teamMember.authority_level <= targetUser.authority_level) {
      return NextResponse.json(
        {
          error: 'Cannot delegate to user with equal or higher authority',
        },
        { status: 403 },
      );
    }

    // Create delegation using stored procedure
    const { data: delegation, error: delegationError } = await supabase.rpc(
      'delegate_task_assignment',
      {
        task_uuid: delegationData.task_id,
        from_user_uuid: task.assigned_to || teamMember.id,
        to_user_uuid: delegationData.to_user_id,
        delegated_by_uuid: teamMember.id,
        delegation_type_val: delegationData.delegation_type,
        instructions_val: delegationData.instructions,
      },
    );

    if (delegationError) {
      console.error('Error creating delegation:', delegationError);
      return NextResponse.json(
        { error: 'Failed to create delegation' },
        { status: 500 },
      );
    }

    // Fetch the created delegation with related data
    const { data: createdDelegation } = await supabase
      .from('delegation_requests')
      .select(
        `
        *,
        task:workflow_tasks(id, title, priority, deadline, status),
        from_user:team_members!delegation_requests_from_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        to_user:team_members!delegation_requests_to_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        delegated_by_user:team_members!delegation_requests_delegated_by_fkey(
          id, name, email, role, avatar_url
        )
      `,
      )
      .eq('id', delegation)
      .single();

    return NextResponse.json(
      { delegation: createdDelegation },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/workflow/delegations error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid delegation data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const delegationId = searchParams.get('id');

    if (!delegationId) {
      return NextResponse.json(
        { error: 'Delegation ID required' },
        { status: 400 },
      );
    }

    // Validate input
    const updateData = UpdateDelegationSchema.parse(body);

    // Get current team member
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 },
      );
    }

    // Get delegation details
    const { data: delegation } = await supabase
      .from('delegation_requests')
      .select('*')
      .eq('id', delegationId)
      .single();

    if (!delegation) {
      return NextResponse.json(
        { error: 'Delegation not found' },
        { status: 404 },
      );
    }

    // Check if user can respond to this delegation
    const canRespond =
      delegation.to_user_id === teamMember.id ||
      delegation.delegated_by === teamMember.id;

    if (!canRespond) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update delegation' },
        { status: 403 },
      );
    }

    // Update delegation
    const { data: updatedDelegation, error: updateError } = await supabase
      .from('delegation_requests')
      .update({
        status: updateData.status,
        response_notes: updateData.response_notes,
        responded_at: new Date().toISOString(),
      })
      .eq('id', delegationId)
      .select(
        `
        *,
        task:workflow_tasks(id, title, priority, deadline, status),
        from_user:team_members!delegation_requests_from_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        to_user:team_members!delegation_requests_to_user_id_fkey(
          id, name, email, role, avatar_url
        ),
        delegated_by_user:team_members!delegation_requests_delegated_by_fkey(
          id, name, email, role, avatar_url
        )
      `,
      )
      .single();

    if (updateError) {
      console.error('Error updating delegation:', updateError);
      return NextResponse.json(
        { error: 'Failed to update delegation' },
        { status: 500 },
      );
    }

    // If approved, update task assignment
    if (updateData.status === 'approved') {
      await supabase
        .from('workflow_tasks')
        .update({ assigned_to: delegation.to_user_id })
        .eq('id', delegation.task_id);

      // Create notification for task assignment
      await supabase.rpc('create_task_notification', {
        task_uuid: delegation.task_id,
        recipient_uuid: delegation.to_user_id,
        notif_type: 'assignment',
        notif_title: 'Task Assignment Approved',
        notif_message:
          'Your task assignment has been approved and you are now the assignee.',
      });
    }

    return NextResponse.json({ delegation: updatedDelegation });
  } catch (error) {
    console.error('PATCH /api/workflow/delegations error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
