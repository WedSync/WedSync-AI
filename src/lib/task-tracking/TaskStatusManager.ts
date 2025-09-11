/**
 * WS-159 Task Tracking - Status Manager
 * Handles task status updates with validation and real-time synchronization
 */

import { createClient } from '@/lib/supabase/client';

export interface StatusChangeEvent {
  taskId: string;
  oldStatus: string | null;
  newStatus: string;
  timestamp: Date;
  userId?: string;
}

export interface StatusUpdateResult {
  success: boolean;
  status?: string;
  error?: string;
  conflicts?: string[];
}

export interface StatusHistoryEntry {
  status: string;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export class TaskStatusManager {
  private supabase = createClient();
  private statusChangeCallbacks: ((event: StatusChangeEvent) => void)[] = [];
  private realTimeSubscription: any = null;

  // Valid status transitions
  private readonly STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
    pending: ['in_progress', 'completed', 'blocked'],
    in_progress: ['pending', 'completed', 'blocked'],
    blocked: ['pending', 'in_progress'],
    completed: [], // Completed tasks cannot transition to other states
  };

  /**
   * Update task status with validation
   */
  async updateStatus(
    taskId: string,
    newStatus: TaskStatus,
    notes?: string,
  ): Promise<StatusUpdateResult> {
    try {
      // Get current task status
      const { data: currentTask, error: fetchError } = await this.supabase
        .from('tasks')
        .select('status, version, updated_at')
        .eq('id', taskId)
        .single();

      if (fetchError) {
        return {
          success: false,
          error: `Failed to fetch current task: ${fetchError.message}`,
        };
      }

      const oldStatus = currentTask?.status as TaskStatus;

      // Validate status transition
      if (!this.isValidTransition(oldStatus, newStatus)) {
        return {
          success: false,
          error: `Invalid status transition from ${oldStatus} to ${newStatus}`,
        };
      }

      // Update task with optimistic locking
      const { data, error: updateError } = await this.supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          version: currentTask.version + 1,
        })
        .eq('id', taskId)
        .eq('version', currentTask.version) // Optimistic locking
        .select()
        .single();

      if (updateError) {
        if (updateError.code === 'PGRST116') {
          // No rows updated (version conflict)
          return {
            success: false,
            error:
              'Task was updated by another user. Please refresh and try again.',
            conflicts: ['version_conflict'],
          };
        }
        return {
          success: false,
          error: `Failed to update task: ${updateError.message}`,
        };
      }

      // Record status history
      await this.recordStatusHistory(taskId, oldStatus, newStatus, notes);

      // Emit status change event
      const event: StatusChangeEvent = {
        taskId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
      };

      this.statusChangeCallbacks.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in status change callback:', error);
        }
      });

      return { success: true, status: newStatus };
    } catch (error) {
      console.error('Error updating task status:', error);
      return { success: false, error: 'Unexpected error occurred' };
    }
  }

  /**
   * Validate if status transition is allowed
   */
  isValidTransition(
    fromStatus: TaskStatus | null,
    toStatus: TaskStatus,
  ): boolean {
    if (!fromStatus) return true; // New tasks can start with any status

    const allowedTransitions = this.STATUS_TRANSITIONS[fromStatus];
    return allowedTransitions.includes(toStatus);
  }

  /**
   * Subscribe to status change events
   */
  onStatusChange(callback: (event: StatusChangeEvent) => void): () => void {
    this.statusChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to real-time status updates
   */
  subscribeToRealTime(
    weddingId: string,
    callback: (event: StatusChangeEvent) => void,
  ): () => void {
    this.realTimeSubscription = this.supabase
      .channel(`tasks:${weddingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `wedding_id=eq.${weddingId}`,
        },
        (payload) => {
          const event: StatusChangeEvent = {
            taskId: payload.new.id,
            oldStatus: payload.old?.status,
            newStatus: payload.new.status,
            timestamp: new Date(payload.new.updated_at),
          };

          callback(event);
        },
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      if (this.realTimeSubscription) {
        this.supabase.removeChannel(this.realTimeSubscription);
        this.realTimeSubscription = null;
      }
    };
  }

  /**
   * Get status history for a task
   */
  async getStatusHistory(taskId: string): Promise<StatusHistoryEntry[]> {
    const { data, error } = await this.supabase
      .from('task_status_history')
      .select(
        `
        status,
        changed_at,
        changed_by,
        notes,
        user_profiles!inner(full_name)
      `,
      )
      .eq('task_id', taskId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch status history:', error);
      return [];
    }

    return (data || []).map((entry) => ({
      status: entry.status,
      changedAt: new Date(entry.changed_at),
      changedBy: entry.user_profiles?.full_name || 'Unknown',
      notes: entry.notes,
    }));
  }

  /**
   * Record status change in history table
   */
  private async recordStatusHistory(
    taskId: string,
    oldStatus: TaskStatus | null,
    newStatus: TaskStatus,
    notes?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('task_status_history').insert({
        task_id: taskId,
        old_status: oldStatus,
        status: newStatus,
        notes,
        changed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record status history:', error);
    }
  }

  /**
   * Cleanup real-time subscriptions
   */
  cleanup(): void {
    if (this.realTimeSubscription) {
      this.supabase.removeChannel(this.realTimeSubscription);
      this.realTimeSubscription = null;
    }
    this.statusChangeCallbacks = [];
  }
}
