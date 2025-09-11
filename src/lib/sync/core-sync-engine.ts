'use client';

import {
  offlineDB,
  type OfflineActionQueue,
  type SyncMetadata,
} from '@/lib/database/offline-database';
import { addMinutes, addSeconds, isAfter, isBefore } from 'date-fns';

/**
 * WedSync Core Sync Engine
 * Handles queue processing, network synchronization, and background operations
 * with sophisticated priority management and retry logic
 */

export interface SyncQueueItem {
  id?: number;
  type:
    | 'form_submission'
    | 'form_draft'
    | 'client_update'
    | 'note_create'
    | 'viral_action'
    | 'vendor_checkin'
    | 'timeline_update'
    | 'issue_create'
    | 'issue_update'
    | 'status_update';
  action: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'conflict';
  nextRetry?: string;
  priority: number; // 1-10, higher numbers = higher priority
  weddingId?: string;
  userId?: string;
  userRole?: 'coordinator' | 'photographer' | 'vendor' | 'planner';
  isWeddingDay?: boolean;
  conflictData?: any;
  checksum?: string; // For data integrity verification
}

export interface SyncEngineConfig {
  maxRetries: number;
  baseRetryDelay: number; // in milliseconds
  maxRetryDelay: number; // in milliseconds
  batchSize: number;
  priorityThreshold: number;
  autoSyncInterval: number; // in milliseconds
}

export interface SyncResult {
  success: boolean;
  item: SyncQueueItem;
  error?: string;
  conflictDetected?: boolean;
  conflictData?: any;
  serverVersion?: number;
  localVersion?: number;
}

export interface BatchSyncResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  conflicts: number;
  errors: string[];
  processingTime: number;
}

export class CoreSyncEngine {
  private config: SyncEngineConfig;
  private isProcessing: boolean = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private connectionStatusCallbacks: Array<(online: boolean) => void> = [];
  private syncProgressCallbacks: Array<
    (progress: number, status: string) => void
  > = [];
  private conflictCallbacks: Array<(conflict: any) => void> = [];

  constructor(config?: Partial<SyncEngineConfig>) {
    this.config = {
      maxRetries: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 30000, // 30 seconds
      batchSize: 10,
      priorityThreshold: 7, // Wedding day priority threshold
      autoSyncInterval: 15000, // 15 seconds
      ...config,
    };

    this.initializeConnectionMonitoring();
  }

  /**
   * Initialize connection monitoring and auto-sync
   */
  private initializeConnectionMonitoring(): void {
    if (typeof window !== 'undefined') {
      // Monitor connection status
      window.addEventListener(
        'online',
        this.handleConnectionRestored.bind(this),
      );
      window.addEventListener('offline', this.handleConnectionLost.bind(this));

      // Start auto-sync timer
      this.startAutoSync();
    }
  }

  /**
   * Add item to sync queue with intelligent priority assignment
   */
  async addToQueue(
    item: Omit<
      SyncQueueItem,
      'id' | 'attempts' | 'timestamp' | 'status' | 'priority'
    >,
  ): Promise<string> {
    const queueItem: SyncQueueItem = {
      ...item,
      attempts: 0,
      timestamp: new Date().toISOString(),
      status: 'pending',
      priority: this.calculatePriority(item),
      checksum: this.generateChecksum(item.data),
    };

    const actionId = await offlineDB.queueSyncAction({
      type: queueItem.type,
      weddingId: queueItem.weddingId || 'unknown',
      data: queueItem.data,
      priority: this.mapPriorityToActionPriority(queueItem.priority),
      nextRetry: undefined,
      conflictData: undefined,
      encryptedPayload: undefined,
    });

    console.log(
      `[CoreSyncEngine] Added item to queue with priority ${queueItem.priority}:`,
      queueItem.type,
    );

    // Trigger immediate sync if high priority or wedding day item
    if (
      queueItem.priority >= this.config.priorityThreshold &&
      navigator.onLine
    ) {
      this.processSyncQueue();
    }

    return actionId;
  }

  /**
   * Calculate intelligent priority for sync items
   */
  private calculatePriority(
    item: Omit<
      SyncQueueItem,
      'id' | 'attempts' | 'timestamp' | 'status' | 'priority'
    >,
  ): number {
    let priority = 5; // Base priority

    // Wedding day priority boosts (highest precedence)
    if (item.isWeddingDay) {
      priority = 9;

      // Active wedding day coordinator changes (highest)
      if (item.userRole === 'coordinator') {
        priority = 10;
      }
      // Wedding day vendor and photographer updates
      else if (item.userRole === 'vendor' || item.userRole === 'photographer') {
        priority = 9;
      }
    }

    // Role-based priority adjustments
    switch (item.userRole) {
      case 'coordinator':
        priority += item.isWeddingDay ? 0 : 2; // Already at max for wedding day
        break;
      case 'planner':
        priority += item.isWeddingDay ? -1 : 1; // Lower on wedding day
        break;
      case 'photographer':
        priority += item.isWeddingDay ? 0 : 1;
        break;
      case 'vendor':
        priority += item.isWeddingDay ? 0 : 1;
        break;
    }

    // Action type priority adjustments
    switch (item.type) {
      case 'issue_create':
      case 'issue_update':
        priority += 2; // Issues are always high priority
        break;
      case 'timeline_update':
        priority += item.isWeddingDay ? 2 : 1;
        break;
      case 'vendor_checkin':
        priority += item.isWeddingDay ? 2 : 1;
        break;
      case 'form_draft':
        priority -= 2; // Drafts are lower priority
        break;
      case 'viral_action':
        priority -= 1; // Social actions are lower priority
        break;
    }

    // Ensure priority stays within bounds (1-10)
    return Math.max(1, Math.min(10, priority));
  }

  /**
   * Process sync queue with intelligent batching and priority handling
   */
  async processSyncQueue(): Promise<BatchSyncResult> {
    if (this.isProcessing || !navigator.onLine) {
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Sync already in progress or offline'],
        processingTime: 0,
      };
    }

    this.isProcessing = true;
    const startTime = Date.now();

    try {
      // Get pending actions sorted by priority
      const pendingActions = await offlineDB.getPendingSyncActions();

      if (pendingActions.length === 0) {
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          conflicts: 0,
          errors: [],
          processingTime: Date.now() - startTime,
        };
      }

      console.log(
        `[CoreSyncEngine] Processing ${pendingActions.length} pending actions`,
      );
      this.notifyProgress(0, `Processing ${pendingActions.length} items...`);

      // Convert to SyncQueueItem format and sort by priority
      const queueItems: SyncQueueItem[] = pendingActions
        .map((action) => ({
          id: action.id,
          type: action.type as SyncQueueItem['type'],
          action: 'update', // Default action
          data: action.data,
          attempts: action.retryCount,
          timestamp: action.timestamp,
          status: action.status as SyncQueueItem['status'],
          priority: this.mapActionPriorityToNumeric(action.priority),
          nextRetry: action.nextRetryTime,
          weddingId: action.weddingId,
          conflictData: action.conflictData,
          checksum: this.generateChecksum(action.data),
        }))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));

      // Process in batches with priority grouping
      const result = await this.processBatches(queueItems);

      this.notifyProgress(
        100,
        `Completed: ${result.successful} successful, ${result.failed} failed`,
      );

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[CoreSyncEngine] Batch sync failed:', error);
      return {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        processingTime: Date.now() - startTime,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process sync items in intelligent batches
   */
  private async processBatches(
    items: SyncQueueItem[],
  ): Promise<BatchSyncResult> {
    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Separate high priority items for immediate processing
    const highPriority = items.filter(
      (item) => (item.priority || 0) >= this.config.priorityThreshold,
    );
    const normalPriority = items.filter(
      (item) => (item.priority || 0) < this.config.priorityThreshold,
    );

    // Process high priority items first (smaller batches for faster processing)
    if (highPriority.length > 0) {
      const highPriorityResult = await this.processBatch(
        highPriority,
        Math.min(this.config.batchSize / 2, 5),
      );
      totalProcessed += highPriorityResult.totalProcessed;
      successful += highPriorityResult.successful;
      failed += highPriorityResult.failed;
      conflicts += highPriorityResult.conflicts;
      errors.push(...highPriorityResult.errors);
    }

    // Process normal priority items
    if (normalPriority.length > 0) {
      const normalResult = await this.processBatch(
        normalPriority,
        this.config.batchSize,
      );
      totalProcessed += normalResult.totalProcessed;
      successful += normalResult.successful;
      failed += normalResult.failed;
      conflicts += normalResult.conflicts;
      errors.push(...normalResult.errors);
    }

    return {
      totalProcessed,
      successful,
      failed,
      conflicts,
      errors,
      processingTime: 0,
    };
  }

  /**
   * Process a single batch of sync items
   */
  private async processBatch(
    items: SyncQueueItem[],
    batchSize: number,
  ): Promise<BatchSyncResult> {
    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;
    let conflicts = 0;
    const errors: string[] = [];

    // Process items in chunks
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch items in parallel (with concurrency limit)
      const promises = batch.map(async (item, index) => {
        try {
          // Add small delay to prevent API overwhelm
          if (index > 0) {
            await new Promise((resolve) => setTimeout(resolve, 100 * index));
          }

          const result = await this.processSyncItem(item);
          totalProcessed++;

          if (result.success) {
            successful++;
            await this.markItemComplete(item);
          } else if (result.conflictDetected) {
            conflicts++;
            await this.handleConflict(item, result);
          } else {
            failed++;
            await this.handleFailure(item, result.error);
            if (result.error) errors.push(result.error);
          }

          // Update progress
          const progress = ((i + index + 1) / items.length) * 100;
          this.notifyProgress(
            progress,
            `Processing item ${i + index + 1} of ${items.length}`,
          );

          return result;
        } catch (error) {
          totalProcessed++;
          failed++;
          const errorMsg =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(errorMsg);
          await this.handleFailure(item, errorMsg);
          return { success: false, item, error: errorMsg };
        }
      });

      await Promise.allSettled(promises);
    }

    return {
      totalProcessed,
      successful,
      failed,
      conflicts,
      errors,
      processingTime: 0,
    };
  }

  /**
   * Process a single sync item with conflict detection
   */
  private async processSyncItem(item: SyncQueueItem): Promise<SyncResult> {
    try {
      // Check data integrity
      if (item.checksum && item.checksum !== this.generateChecksum(item.data)) {
        return {
          success: false,
          item,
          error: 'Data integrity check failed - item may be corrupted',
        };
      }

      // Get sync metadata for conflict detection
      const syncMeta = await this.getSyncMetadata(item);

      // Simulate API call (replace with actual API calls)
      const apiResult = await this.syncItemToServer(item, syncMeta);

      return {
        success: true,
        item,
        serverVersion: apiResult.serverVersion,
        localVersion: syncMeta?.localVersion || 1,
      };
    } catch (error) {
      // Check if it's a conflict error
      if (error instanceof Error && error.message.includes('conflict')) {
        return {
          success: false,
          item,
          conflictDetected: true,
          error: error.message,
          conflictData: this.extractConflictData(error),
        };
      }

      return {
        success: false,
        item,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }
  }

  /**
   * Simulate server sync (replace with actual API calls)
   */
  private async syncItemToServer(
    item: SyncQueueItem,
    syncMeta: SyncMetadata | null,
  ): Promise<{ serverVersion: number }> {
    // Simulate API delay
    await new Promise((resolve) =>
      setTimeout(resolve, 200 + Math.random() * 300),
    );

    // Simulate occasional conflicts (5% chance for demo purposes)
    if (Math.random() < 0.05) {
      throw new Error(
        `Conflict detected: Server version ${syncMeta?.serverVersion || 1} differs from local version`,
      );
    }

    // Simulate occasional errors (2% chance for demo purposes)
    if (Math.random() < 0.02) {
      throw new Error('Server temporarily unavailable');
    }

    return { serverVersion: (syncMeta?.serverVersion || 0) + 1 };
  }

  /**
   * Handle item completion
   */
  private async markItemComplete(item: SyncQueueItem): Promise<void> {
    if (item.id) {
      // Update the action in database to mark as completed
      // This would be implemented based on your database schema
      console.log(`[CoreSyncEngine] Item ${item.id} completed successfully`);
    }
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(
    item: SyncQueueItem,
    result: SyncResult,
  ): Promise<void> {
    console.log(
      `[CoreSyncEngine] Conflict detected for item ${item.id}:`,
      result.conflictData,
    );

    // Store conflict data for resolution
    if (item.id) {
      // Update action with conflict status
      // This would update the action in the database with conflict data
    }

    // Notify conflict handlers
    this.conflictCallbacks.forEach((callback) => {
      try {
        callback({
          item,
          conflictData: result.conflictData,
          serverVersion: result.serverVersion,
          localVersion: result.localVersion,
        });
      } catch (error) {
        console.error('[CoreSyncEngine] Error in conflict callback:', error);
      }
    });
  }

  /**
   * Handle sync failures with exponential backoff
   */
  private async handleFailure(
    item: SyncQueueItem,
    error?: string,
  ): Promise<void> {
    const newAttempts = item.attempts + 1;

    if (newAttempts >= this.config.maxRetries) {
      console.error(
        `[CoreSyncEngine] Item ${item.id} failed after ${this.config.maxRetries} attempts:`,
        error,
      );
      // Mark as permanently failed
      return;
    }

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.config.baseRetryDelay * Math.pow(2, newAttempts - 1),
      this.config.maxRetryDelay,
    );

    const nextRetry = addSeconds(new Date(), delay / 1000).toISOString();

    console.log(
      `[CoreSyncEngine] Scheduling retry for item ${item.id} in ${delay}ms (attempt ${newAttempts})`,
    );

    // Update item with retry information
    // This would update the action in the database with new retry time
  }

  /**
   * Connection event handlers
   */
  private handleConnectionRestored(): void {
    console.log('[CoreSyncEngine] Connection restored - triggering sync');
    this.connectionStatusCallbacks.forEach((callback) => callback(true));

    // Process high priority items immediately
    setTimeout(() => {
      this.processSyncQueue();
    }, 1000); // Small delay to ensure connection is stable
  }

  private handleConnectionLost(): void {
    console.log('[CoreSyncEngine] Connection lost');
    this.connectionStatusCallbacks.forEach((callback) => callback(false));
    this.isProcessing = false; // Stop current processing
  }

  /**
   * Auto-sync management
   */
  private startAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
    }

    this.autoSyncTimer = setInterval(async () => {
      if (!this.isProcessing && navigator.onLine) {
        try {
          await this.processSyncQueue();
        } catch (error) {
          console.error('[CoreSyncEngine] Auto-sync failed:', error);
        }
      }
    }, this.config.autoSyncInterval);
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<BatchSyncResult> {
    return this.processSyncQueue();
  }

  /**
   * Event subscription methods
   */
  onConnectionChange(callback: (online: boolean) => void): () => void {
    this.connectionStatusCallbacks.push(callback);
    return () => {
      const index = this.connectionStatusCallbacks.indexOf(callback);
      if (index > -1) this.connectionStatusCallbacks.splice(index, 1);
    };
  }

  onSyncProgress(
    callback: (progress: number, status: string) => void,
  ): () => void {
    this.syncProgressCallbacks.push(callback);
    return () => {
      const index = this.syncProgressCallbacks.indexOf(callback);
      if (index > -1) this.syncProgressCallbacks.splice(index, 1);
    };
  }

  onConflict(callback: (conflict: any) => void): () => void {
    this.conflictCallbacks.push(callback);
    return () => {
      const index = this.conflictCallbacks.indexOf(callback);
      if (index > -1) this.conflictCallbacks.splice(index, 1);
    };
  }

  /**
   * Utility methods
   */
  private mapPriorityToActionPriority(
    priority: number,
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (priority >= 9) return 'critical';
    if (priority >= 7) return 'high';
    if (priority >= 4) return 'medium';
    return 'low';
  }

  private mapActionPriorityToNumeric(priority: string): number {
    switch (priority) {
      case 'critical':
        return 9;
      case 'high':
        return 7;
      case 'medium':
        return 4;
      case 'low':
        return 2;
      default:
        return 5;
    }
  }

  private generateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 16); // Simple checksum for demo
  }

  private async getSyncMetadata(
    item: SyncQueueItem,
  ): Promise<SyncMetadata | null> {
    // This would fetch sync metadata from the database
    return null; // Placeholder
  }

  private extractConflictData(error: Error): any {
    // Extract conflict data from error message
    return { message: error.message };
  }

  private notifyProgress(progress: number, status: string): void {
    this.syncProgressCallbacks.forEach((callback) => {
      try {
        callback(progress, status);
      } catch (error) {
        console.error('[CoreSyncEngine] Error in progress callback:', error);
      }
    });
  }

  /**
   * Get current sync status
   */
  getSyncStatus() {
    return {
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
      config: this.config,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }

    this.isProcessing = false;
    this.connectionStatusCallbacks.length = 0;
    this.syncProgressCallbacks.length = 0;
    this.conflictCallbacks.length = 0;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleConnectionRestored);
      window.removeEventListener('offline', this.handleConnectionLost);
    }
  }
}

// Singleton instance for global use
export const coreSyncEngine = new CoreSyncEngine();
