import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { TaskStatus } from '@/types/workflow';

interface StatusHistoryRecord {
  id: string;
  task_id: string;
  previous_status: TaskStatus;
  new_status: TaskStatus;
  updated_by: string;
  updated_by_name: string;
  comment?: string;
  progress_percentage?: number;
  created_at: string;
}

// GET /api/workflow/tasks/[id]/status-history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const taskId = params.id;

    // Verify user has access to this task
    const { data: taskAccess, error: accessError } = await supabase
      .from('workflow_tasks')
      .select(
        `
        id,
        wedding_id,
        team_members!workflow_tasks_assigned_to_fkey(user_id),
        created_by_member:team_members!workflow_tasks_created_by_fkey(user_id)
      `,
      )
      .eq('id', taskId)
      .single();

    if (accessError || !taskAccess) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if user has access to this wedding's tasks
    const { data: userTeamMember } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('wedding_id', taskAccess.wedding_id)
      .single();

    if (!userTeamMember) {
      return NextResponse.json(
        { error: 'Access denied to this wedding' },
        { status: 403 },
      );
    }

    // Fetch status history
    const { data: statusHistory, error: historyError } = await supabase
      .from('task_status_history')
      .select(
        `
        id,
        task_id,
        previous_status,
        new_status,
        updated_by,
        comment,
        progress_percentage,
        created_at,
        updater:team_members!task_status_history_updated_by_fkey(
          name,
          role
        )
      `,
      )
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching status history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch status history' },
        { status: 500 },
      );
    }

    // Format the response
    const formattedHistory: StatusHistoryRecord[] = (statusHistory || []).map(
      (record) => ({
        id: record.id,
        task_id: record.task_id,
        previous_status: record.previous_status as TaskStatus,
        new_status: record.new_status as TaskStatus,
        updated_by: record.updated_by,
        updated_by_name: record.updater?.name || 'Unknown User',
        comment: record.comment,
        progress_percentage: record.progress_percentage,
        created_at: record.created_at,
      }),
    );

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error('Unexpected error in status history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/workflow/tasks/[id]/status-history - Update task status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const taskId = params.id;

    const body = await request.json();
    const {
      new_status,
      comment,
      progress_percentage,
    }: {
      new_status: TaskStatus;
      comment?: string;
      progress_percentage?: number;
    } = body;

    // Validate required fields
    if (!new_status || !Object.values(TaskStatus).includes(new_status)) {
      return NextResponse.json(
        { error: 'Valid new_status is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get current task and verify access
    const { data: currentTask, error: taskError } = await supabase
      .from('workflow_tasks')
      .select(
        `
        id,
        status,
        wedding_id,
        assigned_to,
        created_by,
        progress_percentage,
        team_members!workflow_tasks_assigned_to_fkey(user_id),
        created_by_member:team_members!workflow_tasks_created_by_fkey(user_id)
      `,
      )
      .eq('id', taskId)
      .single();

    if (taskError || !currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get user's team member record
    const { data: userTeamMember } = await supabase
      .from('team_members')
      .select('id, role, name')
      .eq('user_id', user.id)
      .eq('wedding_id', currentTask.wedding_id)
      .single();

    if (!userTeamMember) {
      return NextResponse.json(
        { error: 'Access denied to this wedding' },
        { status: 403 },
      );
    }

    // Check if user can update this task
    const canUpdate =
      currentTask.assigned_to === userTeamMember.id || // Assigned to user
      currentTask.created_by === userTeamMember.id || // Created by user
      ['admin', 'manager', 'coordinator'].includes(userTeamMember.role); // Admin roles

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Permission denied to update this task' },
        { status: 403 },
      );
    }

    // Validate status transition
    const validTransitions = getValidStatusTransitions(
      currentTask.status as TaskStatus,
    );
    if (!validTransitions.includes(new_status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentTask.status} to ${new_status}`,
        },
        { status: 400 },
      );
    }

    // Start a transaction
    const { data: transaction, error: transactionError } = await supabase.rpc(
      'update_task_status_with_history',
      {
        task_id_param: taskId,
        new_status_param: new_status,
        updated_by_param: userTeamMember.id,
        comment_param: comment || null,
        progress_param: progress_percentage || null,
      },
    );

    if (transactionError) {
      console.error('Error updating task status:', transactionError);
      return NextResponse.json(
        { error: 'Failed to update task status' },
        { status: 500 },
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      previous_status: currentTask.status,
      new_status,
      updated_by: userTeamMember.name,
      comment,
      progress_percentage,
    });
  } catch (error) {
    console.error('Unexpected error in status update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function getValidStatusTransitions(currentStatus: TaskStatus): TaskStatus[] {
  switch (currentStatus) {
    case TaskStatus.PENDING:
      return [TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, TaskStatus.CANCELLED];
    case TaskStatus.IN_PROGRESS:
      return [TaskStatus.COMPLETED, TaskStatus.ON_HOLD, TaskStatus.CANCELLED];
    case TaskStatus.ON_HOLD:
      return [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED];
    case TaskStatus.COMPLETED:
      return [TaskStatus.IN_PROGRESS]; // Allow reopening
    case TaskStatus.CANCELLED:
      return [TaskStatus.PENDING, TaskStatus.IN_PROGRESS];
    default:
      return [];
  }
}
