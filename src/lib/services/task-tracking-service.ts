/**
 * WS-159: Task Tracking Service
 * Core business logic for task status and progress tracking
 * Integrates with Supabase for data persistence and real-time features
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type {
  EnhancedWorkflowTask,
  TaskStatusUpdateRequest,
  TaskProgressUpdateRequest,
  TaskPhotoEvidence,
  TaskStatusHistoryEntry,
  TaskProgressHistory,
  TaskBottleneckAnalysis,
  TaskCompletionAnalytics,
  TaskTrackingRealtimeEvent,
  TaskTrackingPermissions,
  TaskTrackingStatus,
} from '@/types/task-tracking';

export class TaskTrackingService {
  private supabase = createClientComponentClient();

  /**
   * Update task status with history tracking and notifications
   */
  async updateTaskStatus(
    taskId: string,
    updateRequest: TaskStatusUpdateRequest,
    userId: string,
  ): Promise<{
    success: boolean;
    task?: EnhancedWorkflowTask;
    error?: string;
    statusHistoryId?: string;
  }> {
    try {
      // Get user's team member record
      const { data: teamMember } = await this.supabase
        .from('team_members')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (!teamMember) {
        return { success: false, error: 'Team member not found' };
      }

      // Verify assignment permissions
      const { data: assignment } = await this.supabase
        .from('task_assignments')
        .select(
          `
          id,
          task_id,
          workflow_tasks!inner (
            id,
            status,
            wedding_id,
            assigned_to,
            created_by,
            assigned_by
          )
        `,
        )
        .eq('id', updateRequest.assignment_id)
        .eq('assigned_to', teamMember.id)
        .single();

      if (!assignment) {
        return {
          success: false,
          error: 'Assignment not found or access denied',
        };
      }

      const task = assignment.workflow_tasks;

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(task.status);
      if (!validTransitions.includes(updateRequest.new_status)) {
        return {
          success: false,
          error: `Invalid transition from ${task.status} to ${updateRequest.new_status}`,
        };
      }

      // Use database function for atomic update
      const { data: updateResult, error: updateError } =
        await this.supabase.rpc('update_task_status_with_history', {
          task_id_param: taskId,
          new_status_param: updateRequest.new_status,
          updated_by_param: teamMember.id,
          comment_param:
            updateRequest.notes ||
            `Status updated to ${updateRequest.new_status}`,
          progress_param: updateRequest.progress_percentage,
        });

      if (updateError) {
        console.error('Status update failed:', updateError);
        return { success: false, error: 'Failed to update task status' };
      }

      // Handle photo evidence
      if (updateRequest.completion_photos?.length) {
        await this.processPhotoEvidence(
          taskId,
          updateRequest.completion_photos,
          teamMember.id,
          updateRequest.new_status === 'completed',
        );
      }

      // Get updated task
      const { data: updatedTask } = await this.getEnhancedTask(taskId);

      if (updatedTask) {
        // Send real-time notification
        await this.sendRealtimeNotification({
          type: 'task_status_changed',
          task_id: taskId,
          wedding_id: task.wedding_id,
          data: {
            previous_status: task.status,
            new_status: updateRequest.new_status,
            progress_percentage: updateRequest.progress_percentage,
            updated_by: teamMember.name,
            timestamp: new Date().toISOString(),
          },
          recipients: [
            task.created_by,
            task.assigned_by,
            task.assigned_to,
          ].filter(Boolean),
        });

        // Create notification records
        await this.createNotificationRecords(
          taskId,
          [task.created_by, task.assigned_by, task.assigned_to].filter(Boolean),
          'status_change',
          `Task Status Updated: ${updatedTask.title}`,
          `${teamMember.name} updated task status from ${task.status} to ${updateRequest.new_status}`,
        );
      }

      return {
        success: true,
        task: updatedTask,
        statusHistoryId: updateResult?.[0]?.history_id,
      };
    } catch (error) {
      console.error('Task status update error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Update task progress with analytics and bottleneck detection
   */
  async updateTaskProgress(
    taskId: string,
    updateRequest: TaskProgressUpdateRequest,
    userId: string,
  ): Promise<{
    success: boolean;
    task?: EnhancedWorkflowTask;
    progressHistory?: TaskProgressHistory[];
    bottleneckAnalysis?: TaskBottleneckAnalysis;
    error?: string;
  }> {
    try {
      // Get user's team member record
      const { data: teamMember } = await this.supabase
        .from('team_members')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (!teamMember) {
        return { success: false, error: 'Team member not found' };
      }

      // Verify assignment and get task details
      const { data: assignment } = await this.supabase
        .from('task_assignments')
        .select(
          `
          id,
          task_id,
          workflow_tasks!inner (
            id,
            status,
            progress_percentage,
            wedding_id,
            assigned_to,
            created_by,
            assigned_by
          )
        `,
        )
        .eq('id', updateRequest.assignment_id)
        .eq('assigned_to', teamMember.id)
        .single();

      if (!assignment) {
        return {
          success: false,
          error: 'Assignment not found or access denied',
        };
      }

      const task = assignment.workflow_tasks;

      // Validate progress update rules
      if (task.status === 'completed' || task.status === 'cancelled') {
        return {
          success: false,
          error: `Cannot update progress for ${task.status} tasks`,
        };
      }

      // Record progress history
      const { data: progressHistory, error: historyError } = await this.supabase
        .from('task_progress_history')
        .insert({
          task_id: taskId,
          progress_percentage: updateRequest.progress_percentage,
          recorded_by: teamMember.id,
          notes: updateRequest.status_notes,
          milestone: updateRequest.milestone_reached,
          estimated_completion: updateRequest.estimated_completion,
          blocking_issues: updateRequest.blocking_issues,
        })
        .select()
        .single();

      if (historyError) {
        console.error('Progress history insert failed:', historyError);
        return { success: false, error: 'Failed to record progress history' };
      }

      // Auto-update status based on progress
      let newStatus = task.status;
      if (
        updateRequest.progress_percentage === 100 &&
        task.status !== 'completed'
      ) {
        newStatus = 'completed';
      } else if (
        updateRequest.progress_percentage > 0 &&
        task.status === 'pending'
      ) {
        newStatus = 'in_progress';
      }

      // Update task
      const updatePayload: any = {
        progress_percentage: updateRequest.progress_percentage,
        updated_at: new Date().toISOString(),
        last_progress_update: new Date().toISOString(),
      };

      if (newStatus !== task.status) {
        updatePayload.status = newStatus;
        if (newStatus === 'completed') {
          updatePayload.completed_at = new Date().toISOString();
        } else if (newStatus === 'in_progress') {
          updatePayload.started_at = new Date().toISOString();
        }
      }

      const { data: updatedTask, error: updateError } = await this.supabase
        .from('workflow_tasks')
        .update(updatePayload)
        .eq('id', taskId)
        .select()
        .single();

      if (updateError) {
        console.error('Task progress update failed:', updateError);
        return { success: false, error: 'Failed to update task progress' };
      }

      // Create status history if status changed
      if (newStatus !== task.status) {
        await this.supabase.from('task_status_history').insert({
          task_id: taskId,
          previous_status: task.status,
          new_status: newStatus,
          updated_by: teamMember.id,
          comment: `Status auto-updated based on progress (${updateRequest.progress_percentage}%)`,
          progress_percentage: updateRequest.progress_percentage,
          automated_change: true,
        });
      }

      // Get progress history and perform analysis
      const allProgressHistory = await this.getTaskProgressHistory(taskId);
      const bottleneckAnalysis = await this.analyzeTaskBottleneck(
        taskId,
        task.wedding_id,
      );

      // Send real-time notification
      await this.sendRealtimeNotification({
        type: 'task_progress_updated',
        task_id: taskId,
        wedding_id: task.wedding_id,
        data: {
          progress_percentage: updateRequest.progress_percentage,
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
      });

      // Notify on significant progress milestones
      if (
        this.shouldNotifyProgressMilestone(
          task.progress_percentage,
          updateRequest.progress_percentage,
        )
      ) {
        await this.createNotificationRecords(
          taskId,
          [task.created_by, task.assigned_by, task.assigned_to].filter(Boolean),
          'status_change',
          `Task Progress Update: ${updatedTask.title}`,
          `${teamMember.name} updated progress to ${updateRequest.progress_percentage}%${updateRequest.milestone_reached ? ` - Milestone: ${updateRequest.milestone_reached}` : ''}`,
        );
      }

      const enhancedTask = await this.getEnhancedTask(taskId);

      return {
        success: true,
        task: enhancedTask || updatedTask,
        progressHistory: allProgressHistory,
        bottleneckAnalysis,
      };
    } catch (error) {
      console.error('Task progress update error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get enhanced task with all tracking data
   */
  async getEnhancedTask(taskId: string): Promise<EnhancedWorkflowTask | null> {
    try {
      const { data: task } = await this.supabase
        .from('workflow_tasks')
        .select(
          `
          *,
          assigned_to_member:team_members!workflow_tasks_assigned_to_fkey(
            id, name, email, role, avatar_url
          ),
          created_by_member:team_members!workflow_tasks_created_by_fkey(
            id, name, email, role, avatar_url
          ),
          assigned_by_member:team_members!workflow_tasks_assigned_by_fkey(
            id, name, email, role, avatar_url
          ),
          task_photo_evidence (
            id, file_name, file_url, uploaded_by, upload_date, 
            is_completion_proof, verification_status
          ),
          task_status_history!task_status_history_task_id_fkey (
            id, previous_status, new_status, updated_by, updated_at, 
            comment, progress_percentage, automated_change
          ),
          task_progress_history!task_progress_history_task_id_fkey (
            id, progress_percentage, recorded_by, recorded_at, 
            notes, milestone, estimated_completion
          )
        `,
        )
        .eq('id', taskId)
        .single();

      if (!task) return null;

      return this.mapToEnhancedTask(task);
    } catch (error) {
      console.error('Error fetching enhanced task:', error);
      return null;
    }
  }

  /**
   * Get task status history
   */
  async getTaskStatusHistory(
    taskId: string,
  ): Promise<TaskStatusHistoryEntry[]> {
    const { data: history } = await this.supabase
      .from('task_status_history')
      .select(
        `
        id,
        previous_status,
        new_status,
        updated_by,
        updated_at,
        comment,
        progress_percentage,
        automated_change,
        team_members!task_status_history_updated_by_fkey (
          id, name, role
        )
      `,
      )
      .eq('task_id', taskId)
      .order('updated_at', { ascending: false });

    return history || [];
  }

  /**
   * Get task progress history
   */
  async getTaskProgressHistory(taskId: string): Promise<TaskProgressHistory[]> {
    const { data: history } = await this.supabase
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
      .eq('task_id', taskId)
      .order('recorded_at', { ascending: false })
      .limit(20);

    return history || [];
  }

  /**
   * Upload and process photo evidence
   */
  async uploadPhotoEvidence(
    taskId: string,
    file: File,
    userId: string,
    isCompletionProof: boolean = false,
    description?: string,
  ): Promise<{
    success: boolean;
    photoEvidence?: TaskPhotoEvidence;
    error?: string;
  }> {
    try {
      // Get user's team member record
      const { data: teamMember } = await this.supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!teamMember) {
        return { success: false, error: 'Team member not found' };
      }

      // Verify task access
      const hasAccess = await this.verifyTaskAccess(taskId, teamMember.id);
      if (!hasAccess) {
        return { success: false, error: 'Access denied to task' };
      }

      // Upload file to Supabase Storage
      const fileName = `${taskId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from('task-evidence')
          .upload(fileName, file);

      if (uploadError) {
        console.error('File upload failed:', uploadError);
        return { success: false, error: 'Failed to upload file' };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from('task-evidence').getPublicUrl(fileName);

      // Create photo evidence record
      const { data: photoEvidence, error: recordError } = await this.supabase
        .from('task_photo_evidence')
        .insert({
          task_id: taskId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: teamMember.id,
          description,
          is_completion_proof: isCompletionProof,
          verification_status: 'pending',
        })
        .select()
        .single();

      if (recordError) {
        console.error('Photo evidence record creation failed:', recordError);
        return {
          success: false,
          error: 'Failed to create photo evidence record',
        };
      }

      return { success: true, photoEvidence: photoEvidence };
    } catch (error) {
      console.error('Photo evidence upload error:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get wedding task completion analytics
   */
  async getWeddingTaskAnalytics(
    weddingId: string,
  ): Promise<TaskCompletionAnalytics | null> {
    try {
      const { data: analytics } = await this.supabase.rpc(
        'get_wedding_task_analytics',
        { wedding_id_param: weddingId },
      );

      if (!analytics || analytics.length === 0) return null;

      const data = analytics[0];

      // Get bottlenecks
      const { data: bottlenecks } = await this.supabase.rpc(
        'identify_bottleneck_tasks_enhanced',
        { wedding_id_param: weddingId },
      );

      return {
        total_tasks: data.total_tasks,
        completed_tasks: data.completed_tasks,
        in_progress_tasks: data.in_progress_tasks,
        overdue_tasks: data.overdue_tasks,
        completion_rate: data.completion_rate,
        average_completion_time: data.average_completion_time,
        bottlenecks: bottlenecks || [],
      };
    } catch (error) {
      console.error('Error fetching task analytics:', error);
      return null;
    }
  }

  /**
   * Check user permissions for task tracking operations
   */
  async getTaskTrackingPermissions(
    taskId: string,
    userId: string,
  ): Promise<TaskTrackingPermissions> {
    try {
      const { data: teamMember } = await this.supabase
        .from('team_members')
        .select('id, role')
        .eq('user_id', userId)
        .single();

      if (!teamMember) {
        return this.getDefaultPermissions();
      }

      const { data: task } = await this.supabase
        .from('workflow_tasks')
        .select('assigned_to, created_by, assigned_by')
        .eq('id', taskId)
        .single();

      if (!task) {
        return this.getDefaultPermissions();
      }

      const isAssigned = task.assigned_to === teamMember.id;
      const isCreator = task.created_by === teamMember.id;
      const isAssigner = task.assigned_by === teamMember.id;
      const isCoordinator = ['admin', 'manager', 'coordinator'].includes(
        teamMember.role,
      );

      return {
        can_update_status: isAssigned || isCreator || isAssigner,
        can_update_progress: isAssigned,
        can_upload_photos: isAssigned,
        can_verify_completion: isCreator || isAssigner || isCoordinator,
        can_view_history: isAssigned || isCreator || isAssigner,
        can_delete_task: isCreator || isAssigner || isCoordinator,
        is_assigned_helper: isAssigned,
        is_task_creator: isCreator,
        is_wedding_coordinator: isCoordinator,
      };
    } catch (error) {
      console.error('Error checking permissions:', error);
      return this.getDefaultPermissions();
    }
  }

  // Private helper methods
  private getValidStatusTransitions(
    currentStatus: TaskTrackingStatus,
  ): TaskTrackingStatus[] {
    const transitions: Record<TaskTrackingStatus, TaskTrackingStatus[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['blocked', 'review', 'completed', 'cancelled'],
      blocked: ['in_progress', 'cancelled'],
      review: ['in_progress', 'completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    return transitions[currentStatus] || [];
  }

  private async processPhotoEvidence(
    taskId: string,
    photoUrls: string[],
    uploadedBy: string,
    isCompletionProof: boolean,
  ): Promise<void> {
    const photoRecords = photoUrls.map((url) => ({
      task_id: taskId,
      file_name: url.split('/').pop() || 'unknown',
      file_url: url,
      file_size: 0, // Would need to fetch actual size
      content_type: 'image/jpeg', // Default assumption
      uploaded_by: uploadedBy,
      is_completion_proof: isCompletionProof,
      verification_status: 'pending' as const,
    }));

    await this.supabase.from('task_photo_evidence').insert(photoRecords);
  }

  private async sendRealtimeNotification(
    event: TaskTrackingRealtimeEvent,
  ): Promise<void> {
    await this.supabase.channel(`wedding:${event.wedding_id}`).send({
      type: 'broadcast',
      event: event.type,
      payload: event,
    });
  }

  private async createNotificationRecords(
    taskId: string,
    recipients: string[],
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    const notifications = recipients.map((recipientId) => ({
      task_id: taskId,
      recipient_id: recipientId,
      notification_type: type,
      title,
      message,
      is_read: false,
    }));

    await this.supabase.from('task_notifications').insert(notifications);
  }

  private shouldNotifyProgressMilestone(
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

  private async verifyTaskAccess(
    taskId: string,
    teamMemberId: string,
  ): Promise<boolean> {
    const { data: task } = await this.supabase
      .from('workflow_tasks')
      .select('assigned_to, created_by, assigned_by')
      .eq('id', taskId)
      .single();

    if (!task) return false;

    return (
      task.assigned_to === teamMemberId ||
      task.created_by === teamMemberId ||
      task.assigned_by === teamMemberId
    );
  }

  private async analyzeTaskBottleneck(
    taskId: string,
    weddingId: string,
  ): Promise<TaskBottleneckAnalysis> {
    const { data: analysis } = await this.supabase.rpc(
      'identify_bottleneck_tasks_enhanced',
      { wedding_id_param: weddingId },
    );

    const taskAnalysis = analysis?.find((item: any) => item.task_id === taskId);

    if (!taskAnalysis) {
      return {
        is_bottleneck: false,
        days_in_current_status: 0,
        blocking_tasks_count: 0,
        impact_score: 0,
        recommendations: [],
      };
    }

    return {
      is_bottleneck: taskAnalysis.requires_attention,
      days_in_current_status: taskAnalysis.days_in_current_status,
      blocking_tasks_count: taskAnalysis.blocking_tasks_count,
      impact_score:
        taskAnalysis.blocking_tasks_count * 5 +
        taskAnalysis.days_in_current_status * 2,
      recommendations: this.generateRecommendations(taskAnalysis),
    };
  }

  private generateRecommendations(analysis: any): string[] {
    const recommendations: string[] = [];

    if (analysis.days_in_current_status > 3) {
      recommendations.push(
        'Task has been in current status for over 3 days. Consider reviewing progress.',
      );
    }

    if (analysis.blocking_tasks_count > 0) {
      recommendations.push(
        `This task is blocking ${analysis.blocking_tasks_count} other tasks. Prioritize completion.`,
      );
    }

    if (
      analysis.progress_percentage < 25 &&
      analysis.days_in_current_status > 2
    ) {
      recommendations.push(
        'Low progress after 2+ days. Check if helper needs additional support.',
      );
    }

    return recommendations;
  }

  private mapToEnhancedTask(taskData: any): EnhancedWorkflowTask {
    return {
      ...taskData,
      photo_evidence: taskData.task_photo_evidence || [],
      status_history: taskData.task_status_history || [],
      completion_verification: {
        verified:
          taskData.status === 'completed' && taskData.requires_photo_evidence
            ? taskData.task_photo_evidence?.some(
                (p: any) => p.verification_status === 'approved',
              )
            : taskData.status === 'completed',
        verification_status:
          taskData.requires_photo_evidence && taskData.status === 'completed'
            ? taskData.task_photo_evidence?.some(
                (p: any) => p.verification_status === 'approved',
              )
              ? 'approved'
              : 'pending'
            : 'not_required',
        requires_photo_evidence: taskData.requires_photo_evidence,
        photo_evidence_provided: taskData.task_photo_evidence?.length > 0,
      },
    };
  }

  private getDefaultPermissions(): TaskTrackingPermissions {
    return {
      can_update_status: false,
      can_update_progress: false,
      can_upload_photos: false,
      can_verify_completion: false,
      can_view_history: false,
      can_delete_task: false,
      is_assigned_helper: false,
      is_task_creator: false,
      is_wedding_coordinator: false,
    };
  }
}
