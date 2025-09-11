/**
 * WS-159: Task Progress Update API
 * SECURITY: Uses mandatory withSecureValidation middleware
 * Handles task progress updates with analytics and bottleneck detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '@/lib/validation/middleware';
import { taskProgressUpdateSchema } from '@/lib/validation/schemas';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type {
  TaskProgressUpdateRequest,
  TaskProgressUpdateResponse,
  TaskProgressHistory,
  TaskBottleneckAnalysis,
  TaskTrackingRealtimeEvent,
} from '@/types/task-tracking';

/**
 * Update task progress with analytics and notifications
 * POST /api/tasks/[id]/progress
 */
export const POST = withSecureValidation(
  taskProgressUpdateSchema,
  async (request: NextRequest, validatedData: TaskProgressUpdateRequest) => {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );
      const url = new URL(request.url);
      const taskId = url.pathname.split('/tasks/')[1].split('/progress')[0];

      // Get authenticated user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json(
          { error: 'UNAUTHORIZED', message: 'Authentication required' },
          { status: 401 },
        );
      }

      // Get user's team member record
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('id, name, role')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Team member not found' },
          { status: 403 },
        );
      }

      // Verify task assignment and get task details
      const { data: taskAssignment, error: assignmentError } = await supabase
        .from('task_assignments')
        .select(
          `
          id,
          task_id,
          assigned_to,
          is_primary,
          workflow_tasks!inner (
            id,
            title,
            wedding_id,
            status,
            progress_percentage,
            estimated_duration,
            deadline,
            start_date,
            assigned_to,
            created_by,
            assigned_by
          )
        `,
        )
        .eq('id', validatedData.assignment_id)
        .eq('assigned_to', teamMember.id)
        .single();

      if (assignmentError || !taskAssignment) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Task assignment not found or access denied',
          },
          { status: 403 },
        );
      }

      const task = taskAssignment.workflow_tasks;

      // Validate progress update rules
      if (task.status === 'completed') {
        return NextResponse.json(
          {
            error: 'INVALID_OPERATION',
            message: 'Cannot update progress for completed tasks',
          },
          { status: 400 },
        );
      }

      if (task.status === 'cancelled') {
        return NextResponse.json(
          {
            error: 'INVALID_OPERATION',
            message: 'Cannot update progress for cancelled tasks',
          },
          { status: 400 },
        );
      }

      // Record progress history
      const { data: progressHistory, error: historyError } = await supabase
        .from('task_progress_history')
        .insert({
          task_id: task.id,
          progress_percentage: validatedData.progress_percentage,
          recorded_by: teamMember.id,
          notes: validatedData.status_notes,
          milestone: validatedData.milestone_reached,
          estimated_completion: validatedData.estimated_completion,
          blocking_issues: validatedData.blocking_issues,
        })
        .select()
        .single();

      if (historyError) {
        console.error('Progress history insert failed:', historyError);
        return NextResponse.json(
          {
            error: 'HISTORY_FAILED',
            message: 'Failed to record progress history',
          },
          { status: 500 },
        );
      }

      // Update task progress and auto-update status if needed
      let newStatus = task.status;
      if (
        validatedData.progress_percentage === 100 &&
        task.status !== 'completed'
      ) {
        newStatus = 'completed';
      } else if (
        validatedData.progress_percentage > 0 &&
        task.status === 'pending'
      ) {
        newStatus = 'in_progress';
      }

      const updatePayload: any = {
        progress_percentage: validatedData.progress_percentage,
        updated_at: new Date().toISOString(),
        last_progress_update: new Date().toISOString(),
      };

      // Add status update if changed
      if (newStatus !== task.status) {
        updatePayload.status = newStatus;
        if (newStatus === 'completed') {
          updatePayload.completion_date = new Date().toISOString();
        } else if (newStatus === 'in_progress' && !task.start_date) {
          updatePayload.start_date = new Date().toISOString();
        }
      }

      // Update the task
      const { data: updatedTask, error: updateError } = await supabase
        .from('workflow_tasks')
        .update(updatePayload)
        .eq('id', task.id)
        .select(
          `
          *,
          assigned_to_member:team_members!workflow_tasks_assigned_to_fkey(
            id, name, email, role
          )
        `,
        )
        .single();

      if (updateError) {
        console.error('Task progress update failed:', updateError);
        return NextResponse.json(
          { error: 'UPDATE_FAILED', message: 'Failed to update task progress' },
          { status: 500 },
        );
      }

      // If status changed, create status history entry
      if (newStatus !== task.status) {
        await supabase.from('task_status_history').insert({
          task_id: task.id,
          previous_status: task.status,
          new_status: newStatus,
          updated_by: teamMember.id,
          comment: `Status auto-updated to ${newStatus} based on progress (${validatedData.progress_percentage}%)`,
          progress_percentage: validatedData.progress_percentage,
          automated_change: true,
        });
      }

      // Get progress history for analysis
      const { data: allProgressHistory } = await supabase
        .from('task_progress_history')
        .select(
          `
          id,
          progress_percentage,
          recorded_by,
          recorded_at,
          notes,
          milestone,
          estimated_completion,
          team_members!task_progress_history_recorded_by_fkey (
            id, name, role
          )
        `,
        )
        .eq('task_id', task.id)
        .order('recorded_at', { ascending: false })
        .limit(10);

      // Calculate completion estimate
      const completionEstimate = calculateCompletionEstimate(
        allProgressHistory || [],
        validatedData.progress_percentage,
        task.estimated_duration,
        task.deadline,
      );

      // Perform bottleneck analysis
      const bottleneckAnalysis = await analyzeTaskBottleneck(
        supabase,
        task.id,
        task.wedding_id,
        validatedData.progress_percentage,
        allProgressHistory || [],
      );

      // Send real-time notification
      const realtimeEvent: TaskTrackingRealtimeEvent = {
        type: 'task_progress_updated',
        task_id: task.id,
        wedding_id: task.wedding_id,
        data: {
          progress_percentage: validatedData.progress_percentage,
          updated_by: teamMember.name,
          timestamp: new Date().toISOString(),
          ...(newStatus !== task.status && {
            previous_status: task.status,
            new_status: newStatus,
          }),
        },
        recipients: [
          task.created_by,
          task.assigned_by,
          task.assigned_to,
        ].filter(Boolean),
      };

      // Send to Supabase Realtime channel
      await supabase.channel(`wedding:${task.wedding_id}`).send({
        type: 'broadcast',
        event: 'task_progress_updated',
        payload: realtimeEvent,
      });

      // Create notifications for significant progress milestones
      if (
        shouldNotifyProgressMilestone(
          task.progress_percentage,
          validatedData.progress_percentage,
        )
      ) {
        const notificationPromises = realtimeEvent.recipients.map(
          (recipientId) =>
            supabase.from('task_notifications').insert({
              task_id: task.id,
              recipient_id: recipientId,
              notification_type: 'status_change',
              title: `Task Progress Update: ${task.title}`,
              message: `${teamMember.name} updated progress to ${validatedData.progress_percentage}%${validatedData.milestone_reached ? ` - Milestone: ${validatedData.milestone_reached}` : ''}`,
              is_read: false,
            }),
        );

        await Promise.allSettled(notificationPromises);
      }

      const response: TaskProgressUpdateResponse = {
        success: true,
        task: updatedTask,
        progress_history: allProgressHistory || [],
        completion_estimate: completionEstimate,
        bottleneck_analysis: bottleneckAnalysis,
      };

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      console.error('Task progress update error:', error);
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during progress update',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * Get task progress history and analytics
 * GET /api/tasks/[id]/progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { id: taskId } = await params;

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get task with progress data and verify access
    const { data: taskData, error: taskError } = await supabase
      .from('workflow_tasks')
      .select(
        `
        id,
        title,
        status,
        progress_percentage,
        wedding_id,
        estimated_duration,
        deadline,
        start_date,
        assigned_to,
        created_by,
        assigned_by,
        last_progress_update,
        task_progress_history!task_progress_history_task_id_fkey (
          id,
          progress_percentage,
          recorded_by,
          recorded_at,
          notes,
          milestone,
          estimated_completion,
          blocking_issues,
          team_members!task_progress_history_recorded_by_fkey (
            id, name, role
          )
        )
      `,
      )
      .eq('id', taskId)
      .single();

    if (taskError) {
      return NextResponse.json(
        { error: 'TASK_NOT_FOUND', message: 'Task not found' },
        { status: 404 },
      );
    }

    // Verify user has access to this task
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied' },
        { status: 403 },
      );
    }

    const hasAccess =
      taskData.assigned_to === teamMember.id ||
      taskData.created_by === teamMember.id ||
      taskData.assigned_by === teamMember.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied to task progress' },
        { status: 403 },
      );
    }

    // Calculate completion estimate
    const completionEstimate = calculateCompletionEstimate(
      taskData.task_progress_history,
      taskData.progress_percentage,
      taskData.estimated_duration,
      taskData.deadline,
    );

    // Perform bottleneck analysis
    const bottleneckAnalysis = await analyzeTaskBottleneck(
      supabase,
      taskData.id,
      taskData.wedding_id,
      taskData.progress_percentage,
      taskData.task_progress_history,
    );

    return NextResponse.json({
      success: true,
      task_id: taskData.id,
      title: taskData.title,
      current_progress: taskData.progress_percentage,
      status: taskData.status,
      last_updated: taskData.last_progress_update,
      progress_history: taskData.task_progress_history.sort(
        (a, b) =>
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
      ),
      completion_estimate: completionEstimate,
      bottleneck_analysis: bottleneckAnalysis,
    });
  } catch (error) {
    console.error('Get task progress error:', error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to retrieve task progress',
      },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateCompletionEstimate(
  progressHistory: TaskProgressHistory[],
  currentProgress: number,
  estimatedDuration: number,
  deadline: string,
): string {
  if (currentProgress >= 100) {
    return new Date().toISOString();
  }

  if (progressHistory.length < 2) {
    // Not enough data for trend analysis, use linear estimation
    const remainingProgress = 100 - currentProgress;
    const progressRate = currentProgress / estimatedDuration; // progress per hour
    const remainingHours = remainingProgress / Math.max(progressRate, 1);
    return new Date(Date.now() + remainingHours * 60 * 60 * 1000).toISOString();
  }

  // Calculate progress velocity from recent history
  const recentHistory = progressHistory.slice(0, 5).reverse();
  let totalProgressChange = 0;
  let totalTimeChange = 0;

  for (let i = 1; i < recentHistory.length; i++) {
    const progressChange =
      recentHistory[i].progress_percentage -
      recentHistory[i - 1].progress_percentage;
    const timeChange =
      new Date(recentHistory[i].recorded_at).getTime() -
      new Date(recentHistory[i - 1].recorded_at).getTime();

    if (progressChange > 0 && timeChange > 0) {
      totalProgressChange += progressChange;
      totalTimeChange += timeChange;
    }
  }

  if (totalProgressChange > 0) {
    const progressPerMs = totalProgressChange / totalTimeChange;
    const remainingProgress = 100 - currentProgress;
    const estimatedRemainingMs = remainingProgress / progressPerMs;
    return new Date(Date.now() + estimatedRemainingMs).toISOString();
  }

  // Fallback to deadline
  return deadline;
}

async function analyzeTaskBottleneck(
  supabase: any,
  taskId: string,
  weddingId: string,
  currentProgress: number,
  progressHistory: TaskProgressHistory[],
): Promise<TaskBottleneckAnalysis> {
  // Calculate days in current status
  const latestStatusChange = await supabase
    .from('task_status_history')
    .select('created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const daysInStatus = latestStatusChange
    ? Math.floor(
        (Date.now() - new Date(latestStatusChange.created_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  // Count tasks blocked by this one
  const { data: blockingTasks } = await supabase
    .from('task_dependencies')
    .select('id')
    .eq('prerequisite_task_id', taskId);

  const blockingCount = blockingTasks?.length || 0;

  // Calculate impact score based on multiple factors
  const progressStagnation =
    progressHistory.length > 1
      ? Math.max(
          0,
          7 -
            (Date.now() - new Date(progressHistory[0].recorded_at).getTime()) /
              (1000 * 60 * 60 * 24),
        )
      : 0;

  const impactScore = daysInStatus * 2 + blockingCount * 5 + progressStagnation;

  const isBottleneck =
    impactScore > 10 ||
    (daysInStatus > 3 && currentProgress < 50) ||
    blockingCount > 2;

  const recommendations = [];
  if (daysInStatus > 3) {
    recommendations.push(
      'Task has been in current status for over 3 days. Consider reviewing progress or reassigning.',
    );
  }
  if (blockingCount > 0) {
    recommendations.push(
      `This task is blocking ${blockingCount} other tasks. Prioritize completion.`,
    );
  }
  if (currentProgress < 25 && daysInStatus > 2) {
    recommendations.push(
      'Low progress after 2+ days. Check if helper needs additional support.',
    );
  }

  return {
    is_bottleneck: isBottleneck,
    days_in_current_status: daysInStatus,
    blocking_tasks_count: blockingCount,
    impact_score: Math.round(impactScore),
    recommendations,
  };
}

function shouldNotifyProgressMilestone(
  oldProgress: number,
  newProgress: number,
): boolean {
  const milestones = [25, 50, 75, 90, 100];

  for (const milestone of milestones) {
    if (oldProgress < milestone && newProgress >= milestone) {
      return true;
    }
  }

  return false;
}
