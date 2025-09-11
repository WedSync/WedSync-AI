// Photo Groups API Service - Team A Round 2 WS-153 Integration Layer
'use client';

import { createClient } from '@/lib/supabase/client';
import { PhotoGroup, PhotoGroupConflict } from '@/types/photo-groups';

interface ConflictDetectionRequest {
  photo_group_ids?: string[];
  couple_id: string;
  auto_resolve?: boolean;
  conflict_types?: (
    | 'time_overlap'
    | 'guest_overlap'
    | 'location_conflict'
    | 'priority_conflict'
    | 'resource_conflict'
    | 'dependency_conflict'
  )[];
  severity_threshold?: 'info' | 'warning' | 'error' | 'critical';
}

interface ConflictDetectionResponse {
  conflicts: PhotoGroupConflict[];
  summary: {
    total: number;
    by_severity: Record<string, number>;
    by_type: Record<string, number>;
    auto_resolved?: number;
  };
  analyzed_groups: number;
  detection_timestamp: string;
}

interface ConflictResolutionRequest {
  conflict_id: string;
  resolution_strategy:
    | 'reschedule_first'
    | 'reschedule_second'
    | 'merge_groups'
    | 'split_time'
    | 'reassign_guests'
    | 'manual_review';
  resolution_data?: Record<string, any>;
}

interface BatchOperationRequest {
  couple_id: string;
  operation_type:
    | 'bulk_create'
    | 'bulk_update'
    | 'bulk_delete'
    | 'bulk_assign_guests'
    | 'bulk_reorder'
    | 'bulk_schedule'
    | 'bulk_export'
    | 'bulk_import';
  items: any[];
  options?: {
    validate_conflicts?: boolean;
    auto_resolve_conflicts?: boolean;
    update_mode?: 'replace' | 'merge' | 'append';
    batch_size?: number;
    parallel_processing?: boolean;
    rollback_on_error?: boolean;
  };
}

interface ScheduleOptimizationRequest {
  couple_id: string;
  photo_group_ids?: string[];
  optimization_goals: (
    | 'minimize_conflicts'
    | 'optimize_time'
    | 'prioritize_important'
    | 'balance_workload'
    | 'reduce_travel'
  )[];
  constraints?: {
    max_total_time?: number;
    photographer_breaks?: number;
    venue_restrictions?: string[];
    guest_availability?: Record<string, string[]>;
  };
}

class PhotoGroupsApiService {
  private supabase = createClient();
  private baseUrl = '/api/photo-groups';

  /**
   * Detect conflicts between photo groups
   */
  async detectConflicts(
    request: ConflictDetectionRequest,
  ): Promise<ConflictDetectionResponse> {
    const response = await fetch(`${this.baseUrl}/conflicts/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to detect conflicts');
    }

    return await response.json();
  }

  /**
   * Get existing conflicts for a couple
   */
  async getConflicts(
    coupleId: string,
    includeResolved = false,
    severityFilter?: string,
  ): Promise<ConflictDetectionResponse> {
    const searchParams = new URLSearchParams({
      couple_id: coupleId,
      include_resolved: includeResolved.toString(),
    });

    if (severityFilter) {
      searchParams.set('severity', severityFilter);
    }

    const response = await fetch(
      `${this.baseUrl}/conflicts/detect?${searchParams.toString()}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch conflicts');
    }

    return await response.json();
  }

  /**
   * Resolve a specific conflict
   */
  async resolveConflict(request: ConflictResolutionRequest): Promise<{
    message: string;
    conflict_id: string;
    resolution_strategy: string;
    resolution_result: any;
    resolved_at: string;
  }> {
    const response = await fetch(`${this.baseUrl}/conflicts/detect`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to resolve conflict');
    }

    return await response.json();
  }

  /**
   * Perform batch operations on photo groups
   */
  async batchOperation(request: BatchOperationRequest): Promise<{
    operation_id: string;
    status: string;
    message: string;
    results?: any[];
    errors?: any[];
  }> {
    const response = await fetch(`${this.baseUrl}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to perform batch operation');
    }

    return await response.json();
  }

  /**
   * Get batch operation progress
   */
  async getBatchProgress(operationId: string): Promise<{
    operation_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    processed_count: number;
    total_count: number;
    errors: Array<{
      item_index: number;
      error_code: string;
      error_message: string;
    }>;
    results?: any[];
  }> {
    const response = await fetch(`${this.baseUrl}/batch/${operationId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get batch progress');
    }

    return await response.json();
  }

  /**
   * Cancel a running batch operation
   */
  async cancelBatchOperation(operationId: string): Promise<{
    message: string;
    operation_id: string;
    cancelled_at: string;
  }> {
    const response = await fetch(`${this.baseUrl}/batch/${operationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel batch operation');
    }

    return await response.json();
  }

  /**
   * Optimize photo group scheduling
   */
  async optimizeSchedule(request: ScheduleOptimizationRequest): Promise<{
    optimized_groups: Array<{
      id: string;
      recommended_timeline_slot: string;
      recommended_location?: string;
      estimated_improvement: number;
      reasoning: string;
    }>;
    summary: {
      total_groups: number;
      conflicts_resolved: number;
      time_saved_minutes: number;
      optimization_score: number;
    };
    implementation_plan: Array<{
      step: number;
      action: string;
      groups: string[];
      estimated_time: number;
    }>;
  }> {
    const response = await fetch(`${this.baseUrl}/schedule/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to optimize schedule');
    }

    return await response.json();
  }

  /**
   * Get real-time updates for photo groups
   */
  async subscribeToRealTimeUpdates(
    coupleId: string,
    onUpdate: (data: any) => void,
    onError?: (error: Error) => void,
  ): Promise<{
    channel: any;
    unsubscribe: () => void;
  }> {
    try {
      // Subscribe to database changes
      const channel = this.supabase
        .channel(`photo-groups-realtime:${coupleId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photo_groups',
            filter: `couple_id=eq.${coupleId}`,
          },
          (payload) => {
            onUpdate({
              type: 'photo_group_change',
              event: payload.eventType,
              data: payload.new || payload.old,
              timestamp: new Date().toISOString(),
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photo_group_assignments',
            filter: `photo_group_id.in.(select id from photo_groups where couple_id = '${coupleId}')`,
          },
          (payload) => {
            onUpdate({
              type: 'assignment_change',
              event: payload.eventType,
              data: payload.new || payload.old,
              timestamp: new Date().toISOString(),
            });
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'photo_group_conflicts',
            filter: `photo_group_id.in.(select id from photo_groups where couple_id = '${coupleId}')`,
          },
          (payload) => {
            onUpdate({
              type: 'conflict_change',
              event: payload.eventType,
              data: payload.new || payload.old,
              timestamp: new Date().toISOString(),
            });
          },
        )
        .subscribe();

      return {
        channel,
        unsubscribe: () => {
          this.supabase.removeChannel(channel);
        },
      };
    } catch (error) {
      if (onError) {
        onError(
          error instanceof Error ? error : new Error('Subscription failed'),
        );
      }
      throw error;
    }
  }

  /**
   * Broadcast real-time events to other users
   */
  async broadcastUpdate(
    coupleId: string,
    eventType: string,
    data: any,
  ): Promise<void> {
    const channel = this.supabase.channel(`photo-groups-broadcast:${coupleId}`);

    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload: {
        ...data,
        timestamp: new Date().toISOString(),
        user_id: (await this.supabase.auth.getUser()).data.user?.id,
      },
    });

    // Clean up channel
    this.supabase.removeChannel(channel);
  }

  /**
   * Validate photo group data before operations
   */
  validatePhotoGroup(photoGroup: Partial<PhotoGroup>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!photoGroup.name?.trim()) {
      errors.push('Photo group name is required');
    }

    if (!photoGroup.photo_type) {
      errors.push('Photo type is required');
    }

    if (
      !photoGroup.estimated_time_minutes ||
      photoGroup.estimated_time_minutes <= 0
    ) {
      errors.push('Estimated time must be greater than 0');
    }

    if (
      !photoGroup.priority ||
      photoGroup.priority < 1 ||
      photoGroup.priority > 10
    ) {
      errors.push('Priority must be between 1 and 10');
    }

    // Warnings for potential issues
    if (
      photoGroup.estimated_time_minutes &&
      photoGroup.estimated_time_minutes > 60
    ) {
      warnings.push(
        'Photo sessions longer than 60 minutes may cause scheduling conflicts',
      );
    }

    if (
      photoGroup.priority &&
      photoGroup.priority <= 3 &&
      !photoGroup.timeline_slot
    ) {
      warnings.push(
        'High-priority groups should have a specific timeline slot assigned',
      );
    }

    if (photoGroup.name && photoGroup.name.length > 100) {
      warnings.push('Photo group name is very long and may not display well');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get photo group statistics and metrics
   */
  async getPhotoGroupMetrics(coupleId: string): Promise<{
    total_groups: number;
    total_estimated_time: number;
    groups_by_type: Record<string, number>;
    groups_by_priority: Record<string, number>;
    conflicts_summary: {
      total_conflicts: number;
      unresolved_conflicts: number;
      by_severity: Record<string, number>;
    };
    scheduling_efficiency: {
      groups_scheduled: number;
      groups_unscheduled: number;
      average_time_per_slot: number;
      potential_overlaps: number;
    };
  }> {
    const response = await fetch(
      `${this.baseUrl}/metrics?couple_id=${coupleId}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch metrics');
    }

    return await response.json();
  }

  /**
   * Export photo groups data
   */
  async exportPhotoGroups(
    coupleId: string,
    format: 'pdf' | 'csv' | 'json' = 'json',
    options: {
      include_guest_details?: boolean;
      include_photographer_notes?: boolean;
      include_timeline?: boolean;
      group_by?: 'priority' | 'timeline' | 'type';
    } = {},
  ): Promise<{
    success: boolean;
    download_url?: string;
    file_name: string;
    file_size: number;
    group_count: number;
    guest_count: number;
    error?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        couple_id: coupleId,
        format,
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export photo groups');
    }

    return await response.json();
  }
}

// Singleton instance
export const photoGroupsApiService = new PhotoGroupsApiService();

// Named exports for convenience
export {
  PhotoGroupsApiService,
  type ConflictDetectionRequest,
  type ConflictDetectionResponse,
  type ConflictResolutionRequest,
  type BatchOperationRequest,
  type ScheduleOptimizationRequest,
};
