/**
 * WS-158: Real-time Task Category Synchronization Service
 * Handles real-time updates, conflict resolution, and cross-platform sync
 */

import { createClient } from '@/lib/supabase/client';
import { TaskCategory, WorkflowTask, TaskUpdate } from '@/types/workflow';
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';

export interface CategorySyncConfig {
  organizationId: string;
  userId: string;
  onCategoryUpdate?: (
    category: TaskCategory,
    action: 'created' | 'updated' | 'deleted',
  ) => void;
  onTaskCategoryChange?: (
    task: WorkflowTask,
    oldCategory?: string,
    newCategory?: string,
  ) => void;
  onConflictResolution?: (conflict: CategoryConflict) => void;
  onSyncStatusChange?: (status: SyncStatus) => void;
}

export interface CategoryConflict {
  id: string;
  localVersion: TaskCategory;
  remoteVersion: TaskCategory;
  timestamp: string;
  resolution: 'local' | 'remote' | 'merge';
}

export interface SyncStatus {
  isConnected: boolean;
  lastSync: string;
  pendingChanges: number;
  errors: string[];
  latency: number;
}

export interface CategoryChangeEvent {
  type: 'category_update' | 'task_reassignment' | 'batch_update';
  categoryId: string;
  changes: Partial<TaskCategory>;
  affectedTasks?: string[];
  userId: string;
  timestamp: string;
}

export class CategorySyncService {
  private supabase = createClient();
  private channel?: RealtimeChannel;
  private config: CategorySyncConfig;
  private syncStatus: SyncStatus;
  private pendingChanges: Map<string, CategoryChangeEvent> = new Map();
  private conflictQueue: CategoryConflict[] = [];
  private syncInterval?: NodeJS.Timeout;
  private performanceMetrics = {
    avgLatency: 0,
    totalSyncs: 0,
    failedSyncs: 0,
  };

  constructor(config: CategorySyncConfig) {
    this.config = config;
    this.syncStatus = {
      isConnected: false,
      lastSync: new Date().toISOString(),
      pendingChanges: 0,
      errors: [],
      latency: 0,
    };
  }

  /**
   * Initialize real-time category synchronization
   */
  async initialize(): Promise<void> {
    try {
      // Create unique channel for this organization
      const channelName = `category-sync-${this.config.organizationId}-${Date.now()}`;
      this.channel = this.supabase.channel(channelName, {
        config: {
          broadcast: {
            self: false, // Don't receive own broadcasts
            ack: true, // Require acknowledgment
          },
          presence: {
            key: this.config.userId,
          },
        },
      });

      // Set up category table listeners
      this.channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_categories',
            filter: `organization_id=eq.${this.config.organizationId}`,
          },
          this.handleCategoryChange.bind(this),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'workflow_tasks',
            filter: `organization_id=eq.${this.config.organizationId}`,
          },
          this.handleTaskCategoryChange.bind(this),
        )
        .on(
          'broadcast',
          { event: 'category_sync' },
          this.handleBroadcastSync.bind(this),
        )
        .on('presence', { event: 'sync' }, this.handlePresenceSync.bind(this));

      // Subscribe to channel
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this.updateSyncStatus({ isConnected: true });
          await this.syncPendingChanges();
          this.startPeriodicSync();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.updateSyncStatus({ isConnected: false });
          this.handleConnectionError();
        }
      });

      // Track presence for collaboration features
      await this.channel.track({
        online_at: new Date().toISOString(),
        user_id: this.config.userId,
      });
    } catch (error) {
      console.error('Failed to initialize category sync:', error);
      this.updateSyncStatus({
        isConnected: false,
        errors: [
          ...this.syncStatus.errors,
          error?.toString() || 'Initialization failed',
        ],
      });
      throw error;
    }
  }

  /**
   * Handle category table changes with conflict resolution
   */
  private async handleCategoryChange(
    payload: RealtimePostgresChangesPayload<TaskCategory>,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const { eventType, new: newCategory, old: oldCategory } = payload;

      // Check for conflicts
      if (eventType === 'UPDATE' && newCategory && oldCategory) {
        const hasConflict = await this.detectConflict(oldCategory, newCategory);
        if (hasConflict) {
          await this.resolveConflict(oldCategory, newCategory);
          return;
        }
      }

      // Broadcast change to other platforms
      await this.broadcastCategoryChange({
        type: 'category_update',
        categoryId: newCategory?.id || oldCategory?.id || '',
        changes: newCategory || {},
        userId: this.config.userId,
        timestamp: new Date().toISOString(),
      });

      // Call user callback
      if (this.config.onCategoryUpdate) {
        const action =
          eventType === 'INSERT'
            ? 'created'
            : eventType === 'DELETE'
              ? 'deleted'
              : 'updated';
        this.config.onCategoryUpdate(newCategory || oldCategory!, action);
      }

      // Update latency metrics
      const latency = performance.now() - startTime;
      this.updatePerformanceMetrics(latency, true);
    } catch (error) {
      console.error('Error handling category change:', error);
      this.updatePerformanceMetrics(performance.now() - startTime, false);
    }
  }

  /**
   * Handle task category reassignments
   */
  private async handleTaskCategoryChange(
    payload: RealtimePostgresChangesPayload<WorkflowTask>,
  ): Promise<void> {
    const { new: newTask, old: oldTask } = payload;

    if (newTask && oldTask && newTask.category_id !== oldTask.category_id) {
      // Broadcast task category change
      await this.broadcastCategoryChange({
        type: 'task_reassignment',
        categoryId: newTask.category_id || '',
        affectedTasks: [newTask.id],
        changes: {},
        userId: this.config.userId,
        timestamp: new Date().toISOString(),
      });

      if (this.config.onTaskCategoryChange) {
        this.config.onTaskCategoryChange(
          newTask,
          oldTask.category_id,
          newTask.category_id,
        );
      }
    }
  }

  /**
   * Handle broadcast sync events from other platforms
   */
  private async handleBroadcastSync(payload: any): Promise<void> {
    const event = payload.payload as CategoryChangeEvent;

    // Avoid processing own events
    if (event.userId === this.config.userId) return;

    // Queue the change for processing
    this.pendingChanges.set(event.categoryId, event);
    this.updateSyncStatus({ pendingChanges: this.pendingChanges.size });

    // Process immediately if not batching
    if (event.type !== 'batch_update') {
      await this.processPendingChange(event);
    }
  }

  /**
   * Handle presence sync for live collaboration
   */
  private async handlePresenceSync(payload: any): Promise<void> {
    const presenceState = await this.channel?.presenceState();
    // Track active collaborators for UI updates
    const activeUsers = Object.keys(presenceState || {}).length;

    // Implement collaborative editing features
    if (activeUsers > 1) {
      // Enable real-time cursor tracking, lock indicators, etc.
      await this.enableCollaborativeMode();
    }
  }

  /**
   * Detect conflicts between local and remote versions
   */
  private async detectConflict(
    oldCategory: TaskCategory,
    newCategory: TaskCategory,
  ): Promise<boolean> {
    // Check if there are pending local changes for this category
    const hasPendingChanges = this.pendingChanges.has(oldCategory.id);

    // Check timestamp differences
    const timeDiff =
      new Date(newCategory.updated_at).getTime() -
      new Date(oldCategory.updated_at).getTime();

    // Conflict detected if changes happened within 100ms window
    return hasPendingChanges && Math.abs(timeDiff) < 100;
  }

  /**
   * Resolve conflicts between versions
   */
  private async resolveConflict(
    localVersion: TaskCategory,
    remoteVersion: TaskCategory,
  ): Promise<void> {
    const conflict: CategoryConflict = {
      id: crypto.randomUUID(),
      localVersion,
      remoteVersion,
      timestamp: new Date().toISOString(),
      resolution: 'merge', // Default strategy
    };

    // Automatic resolution based on timestamps (last-write-wins)
    const resolution =
      new Date(remoteVersion.updated_at) > new Date(localVersion.updated_at)
        ? 'remote'
        : 'local';

    conflict.resolution = resolution;

    // Apply resolution
    if (resolution === 'remote') {
      // Accept remote changes
      this.pendingChanges.delete(localVersion.id);
    } else {
      // Re-apply local changes
      await this.applyCategoryUpdate(localVersion);
    }

    if (this.config.onConflictResolution) {
      this.config.onConflictResolution(conflict);
    }
  }

  /**
   * Broadcast category changes to all connected platforms
   */
  private async broadcastCategoryChange(
    event: CategoryChangeEvent,
  ): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'category_sync',
      payload: event,
    });
  }

  /**
   * Apply category update to database
   */
  private async applyCategoryUpdate(category: TaskCategory): Promise<void> {
    const { error } = await this.supabase
      .from('task_categories')
      .update({
        ...category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', category.id);

    if (error) {
      console.error('Failed to apply category update:', error);
      throw error;
    }
  }

  /**
   * Process pending change from queue
   */
  private async processPendingChange(
    event: CategoryChangeEvent,
  ): Promise<void> {
    try {
      // Process based on event type
      switch (event.type) {
        case 'category_update':
          await this.syncCategoryUpdate(event.categoryId, event.changes);
          break;
        case 'task_reassignment':
          await this.syncTaskReassignment(
            event.affectedTasks || [],
            event.categoryId,
          );
          break;
        case 'batch_update':
          await this.syncBatchUpdate(event);
          break;
      }

      // Remove from pending
      this.pendingChanges.delete(event.categoryId);
      this.updateSyncStatus({ pendingChanges: this.pendingChanges.size });
    } catch (error) {
      console.error('Failed to process pending change:', error);
      this.updateSyncStatus({
        errors: [...this.syncStatus.errors, `Failed to sync ${event.type}`],
      });
    }
  }

  /**
   * Sync category update across platforms
   */
  private async syncCategoryUpdate(
    categoryId: string,
    changes: Partial<TaskCategory>,
  ): Promise<void> {
    // Implement platform-specific sync logic
    // This could include webhook calls, SMS notifications, etc.

    // Example: Notify external systems
    await this.notifyExternalSystems('category_updated', {
      categoryId,
      changes,
    });
  }

  /**
   * Sync task reassignments
   */
  private async syncTaskReassignment(
    taskIds: string[],
    newCategoryId: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('workflow_tasks')
      .update({ category_id: newCategoryId })
      .in('id', taskIds);

    if (error) {
      throw error;
    }
  }

  /**
   * Handle batch updates for performance
   */
  private async syncBatchUpdate(event: CategoryChangeEvent): Promise<void> {
    // Batch multiple updates together
    const updates = Array.from(this.pendingChanges.values()).filter(
      (e) => e.type === 'batch_update',
    );

    // Process in parallel for performance
    await Promise.all(
      updates.map((update) => this.processPendingChange(update)),
    );
  }

  /**
   * Sync pending changes periodically
   */
  private async syncPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    const changes = Array.from(this.pendingChanges.values());
    for (const change of changes) {
      await this.processPendingChange(change);
    }
  }

  /**
   * Start periodic sync for offline changes
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      if (this.syncStatus.isConnected) {
        await this.syncPendingChanges();
        this.updateSyncStatus({ lastSync: new Date().toISOString() });
      }
    }, 30000); // Sync every 30 seconds
  }

  /**
   * Enable collaborative editing mode
   */
  private async enableCollaborativeMode(): Promise<void> {
    // Implement collaborative features
    // - Cursor tracking
    // - Live typing indicators
    // - Field locking
    // - Merge strategies
  }

  /**
   * Notify external systems of changes
   */
  private async notifyExternalSystems(event: string, data: any): Promise<void> {
    // Implement webhook notifications
    // Implement SMS notifications
    // Implement calendar updates
  }

  /**
   * Handle connection errors and retry
   */
  private handleConnectionError(): void {
    // Implement exponential backoff retry
    setTimeout(() => {
      this.initialize();
    }, 5000);
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(latency: number, success: boolean): void {
    this.performanceMetrics.totalSyncs++;
    if (!success) {
      this.performanceMetrics.failedSyncs++;
    }

    // Calculate running average latency
    this.performanceMetrics.avgLatency =
      (this.performanceMetrics.avgLatency *
        (this.performanceMetrics.totalSyncs - 1) +
        latency) /
      this.performanceMetrics.totalSyncs;

    this.updateSyncStatus({ latency: this.performanceMetrics.avgLatency });
  }

  /**
   * Update sync status and notify listeners
   */
  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };

    if (this.config.onSyncStatusChange) {
      this.config.onSyncStatusChange(this.syncStatus);
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      successRate:
        this.performanceMetrics.totalSyncs > 0
          ? ((this.performanceMetrics.totalSyncs -
              this.performanceMetrics.failedSyncs) /
              this.performanceMetrics.totalSyncs) *
            100
          : 0,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.channel) {
      await this.channel.unsubscribe();
    }

    this.pendingChanges.clear();
    this.conflictQueue = [];
  }
}

// Export singleton factory
let syncServiceInstance: CategorySyncService | null = null;

export function getCategorySyncService(
  config: CategorySyncConfig,
): CategorySyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new CategorySyncService(config);
  }
  return syncServiceInstance;
}
