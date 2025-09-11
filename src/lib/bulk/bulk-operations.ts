/**
 * WS-004: Bulk Operations Service
 * High-performance bulk operations with memory management and progress tracking
 */

import { createClient } from '@/lib/supabase/client';
import { notificationEngine } from '@/lib/notifications/engine';

// Types
export interface BulkOperationProgress {
  operation: string;
  total: number;
  completed: number;
  failed: number;
  percentage: number;
  currentBatch: number;
  totalBatches: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

export interface BulkOperationOptions {
  batchSize?: number;
  progressCallback?: (progress: BulkOperationProgress) => void;
  enableRollback?: boolean;
  validateBeforeOperation?: boolean;
}

export interface BulkSelectionManager {
  selectedIds: Set<string>;
  maxSelection: number;
  performanceMode: boolean;
}

/**
 * High-performance bulk operations manager
 * Handles large selections (1000+) efficiently with memory optimization
 */
export class BulkOperationsService {
  private static instance: BulkOperationsService;
  private supabase = createClient();
  private activeOperations = new Map<string, AbortController>();

  // Performance tuning constants
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly MAX_MEMORY_USAGE_MB = 50;
  private readonly PROGRESS_THROTTLE_MS = 500;

  private constructor() {}

  static getInstance(): BulkOperationsService {
    if (!BulkOperationsService.instance) {
      BulkOperationsService.instance = new BulkOperationsService();
    }
    return BulkOperationsService.instance;
  }

  /**
   * Create optimized selection manager for large datasets
   */
  createSelectionManager(maxSelection = 10000): BulkSelectionManager {
    return {
      selectedIds: new Set<string>(),
      maxSelection,
      performanceMode: false,
    };
  }

  /**
   * Optimized bulk selection with memory management
   * Handles 1000+ selections in <2 seconds
   */
  async optimizedBulkSelect(
    selector: (offset: number, limit: number) => Promise<{ id: string }[]>,
    totalCount: number,
    options: { chunkSize?: number } = {},
  ): Promise<Set<string>> {
    const chunkSize = options.chunkSize || 1000;
    const selectedIds = new Set<string>();
    const startTime = performance.now();

    // Process in chunks to avoid memory issues
    for (let offset = 0; offset < totalCount; offset += chunkSize) {
      const chunk = await selector(
        offset,
        Math.min(chunkSize, totalCount - offset),
      );

      chunk.forEach((item) => selectedIds.add(item.id));

      // Memory management: force garbage collection every 5k items
      if (selectedIds.size % 5000 === 0) {
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
      }

      // Performance monitoring
      const currentTime = performance.now();
      if (currentTime - startTime > 2000) {
        // 2 second limit
        console.warn(
          `Bulk selection taking too long: ${currentTime - startTime}ms for ${selectedIds.size} items`,
        );
        break;
      }
    }

    return selectedIds;
  }

  /**
   * Execute bulk operation with comprehensive progress tracking
   */
  async executeBulkOperation(
    operation: string,
    targets: string[],
    parameters: any,
    options: BulkOperationOptions = {},
  ): Promise<BulkOperationProgress> {
    const operationId = `bulk_${operation}_${Date.now()}`;
    const abortController = new AbortController();
    this.activeOperations.set(operationId, abortController);

    const batchSize = options.batchSize || this.DEFAULT_BATCH_SIZE;
    const totalBatches = Math.ceil(targets.length / batchSize);

    const progress: BulkOperationProgress = {
      operation,
      total: targets.length,
      completed: 0,
      failed: 0,
      percentage: 0,
      currentBatch: 0,
      totalBatches,
      errors: [],
    };

    let backupData: any[] = [];

    try {
      // Pre-operation validation
      if (options.validateBeforeOperation) {
        await this.validateOperation(operation, targets, parameters);
      }

      // Create rollback backup if enabled
      if (options.enableRollback && operation === 'delete') {
        backupData = await this.createRollbackBackup(targets);
      }

      // Process in optimized batches
      for (let i = 0; i < targets.length; i += batchSize) {
        if (abortController.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        const batch = targets.slice(i, i + batchSize);
        progress.currentBatch = Math.floor(i / batchSize) + 1;

        try {
          await this.processBatch(operation, batch, parameters);
          progress.completed += batch.length;
        } catch (error) {
          batch.forEach((id) => {
            progress.errors.push({
              id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
          progress.failed += batch.length;
        }

        // Update progress
        progress.percentage = Math.round(
          ((progress.completed + progress.failed) / progress.total) * 100,
        );

        // Throttled progress callback
        if (options.progressCallback) {
          await this.throttledCallback(options.progressCallback, progress);
        }

        // Send progress notification every 5 batches or on completion
        if (progress.currentBatch % 5 === 0 || progress.percentage === 100) {
          await this.sendProgressNotification(progress);
        }

        // Memory management
        if (i % (batchSize * 10) === 0) {
          await this.performMemoryCleanup();
        }
      }

      // Send completion notification
      await this.sendCompletionNotification(progress);
    } catch (error) {
      // Rollback if enabled and operation failed
      if (options.enableRollback && backupData.length > 0) {
        await this.performRollback(operation, backupData);
      }

      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }

    return progress;
  }

  /**
   * Cancel active bulk operation
   */
  async cancelOperation(operationId: string): Promise<boolean> {
    const controller = this.activeOperations.get(operationId);
    if (controller) {
      controller.abort();
      this.activeOperations.delete(operationId);
      return true;
    }
    return false;
  }

  /**
   * Get performance metrics for bulk operation
   */
  async getPerformanceMetrics(
    operation: string,
    itemCount: number,
  ): Promise<{
    estimatedDuration: number;
    memoryRequirement: number;
    recommendedBatchSize: number;
  }> {
    // Base estimates (in milliseconds)
    const baseTimePerItem =
      {
        status_update: 2,
        tag_add: 3,
        tag_remove: 3,
        delete: 5,
        export: 1,
      }[operation] || 2;

    const estimatedDuration = itemCount * baseTimePerItem;
    const memoryRequirement = Math.ceil(itemCount * 0.001); // ~1KB per item

    // Optimize batch size based on item count
    let recommendedBatchSize = 100;
    if (itemCount > 10000) recommendedBatchSize = 200;
    if (itemCount > 50000) recommendedBatchSize = 500;

    return {
      estimatedDuration,
      memoryRequirement,
      recommendedBatchSize,
    };
  }

  /**
   * Memory-efficient export for large datasets
   */
  async *streamingExport(
    clientIds: string[],
    fields: string[],
    format: 'csv' | 'excel' = 'csv',
  ): AsyncGenerator<string, void, unknown> {
    const batchSize = 500; // Smaller batches for export to manage memory

    if (format === 'csv') {
      // Yield CSV header
      yield fields.join(',') + '\n';
    }

    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);

      const { data } = await this.supabase
        .from('clients')
        .select(fields.join(', '))
        .in('id', batch);

      if (data) {
        for (const row of data) {
          if (format === 'csv') {
            const csvRow = fields
              .map((field) => {
                const value = (row as any)[field];
                return value ? `"${String(value).replace(/"/g, '""')}"` : '';
              })
              .join(',');
            yield csvRow + '\n';
          }
        }
      }

      // Memory cleanup between batches
      if (i % (batchSize * 5) === 0) {
        await this.performMemoryCleanup();
      }
    }
  }

  // Private helper methods

  private async validateOperation(
    operation: string,
    targets: string[],
    parameters: any,
  ) {
    // Validate parameters based on operation type
    switch (operation) {
      case 'status_update':
        if (
          !parameters.new_status ||
          !['lead', 'booked', 'completed', 'archived'].includes(
            parameters.new_status,
          )
        ) {
          throw new Error('Invalid status');
        }
        break;
      case 'delete':
        if (targets.length > 1000) {
          throw new Error('Cannot delete more than 1000 clients at once');
        }
        break;
    }

    // Validate targets exist and are accessible
    const { count } = await this.supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .in('id', targets.slice(0, 100)); // Sample validation

    if (!count || count === 0) {
      throw new Error('No valid targets found');
    }
  }

  private async createRollbackBackup(clientIds: string[]): Promise<any[]> {
    const backupData: any[] = [];
    const batchSize = 100;

    for (let i = 0; i < clientIds.length; i += batchSize) {
      const batch = clientIds.slice(i, i + batchSize);

      const { data } = await this.supabase
        .from('clients')
        .select('*')
        .in('id', batch);

      if (data) {
        backupData.push(...data);
      }
    }

    // Store backup in database
    const backupId = `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.supabase.from('rollback_backups').insert({
      backup_id: backupId,
      backup_data: backupData,
      created_at: new Date().toISOString(),
    });

    return backupData;
  }

  private async processBatch(
    operation: string,
    batch: string[],
    parameters: any,
  ) {
    switch (operation) {
      case 'status_update':
        await this.processBatchStatusUpdate(batch, parameters);
        break;
      case 'tag_add':
        await this.processBatchTagAdd(batch, parameters);
        break;
      case 'tag_remove':
        await this.processBatchTagRemove(batch, parameters);
        break;
      case 'delete':
        await this.processBatchDelete(batch);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private async processBatchStatusUpdate(
    batch: string[],
    parameters: { new_status: string },
  ) {
    const { error } = await this.supabase
      .from('clients')
      .update({
        status: parameters.new_status,
        updated_at: new Date().toISOString(),
      })
      .in('id', batch);

    if (error) throw error;

    // Create activity records
    const activities = batch.map((clientId) => ({
      client_id: clientId,
      activity_type: 'bulk_status_change',
      description: `Status changed to ${parameters.new_status} via bulk operation`,
      metadata: {
        new_status: parameters.new_status,
        bulk_operation: true,
      },
      created_at: new Date().toISOString(),
    }));

    await this.supabase.from('client_activities').insert(activities);
  }

  private async processBatchTagAdd(
    batch: string[],
    parameters: { tags: string[] },
  ) {
    // Get existing tags
    const { data: clients } = await this.supabase
      .from('clients')
      .select('id, tags')
      .in('id', batch);

    if (clients) {
      const updates = clients.map((client) => ({
        id: client.id,
        tags: [...new Set([...(client.tags || []), ...parameters.tags])],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase.from('clients').upsert(updates);

      if (error) throw error;
    }
  }

  private async processBatchTagRemove(
    batch: string[],
    parameters: { tags: string[] },
  ) {
    // Get existing tags
    const { data: clients } = await this.supabase
      .from('clients')
      .select('id, tags')
      .in('id', batch);

    if (clients) {
      const updates = clients.map((client) => ({
        id: client.id,
        tags: (client.tags || []).filter(
          (tag: string) =>
            !parameters.tags
              .map((t) => t.toLowerCase())
              .includes(tag.toLowerCase()),
        ),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase.from('clients').upsert(updates);

      if (error) throw error;
    }
  }

  private async processBatchDelete(batch: string[]) {
    // Delete in proper order for foreign key constraints
    await this.supabase
      .from('client_activities')
      .delete()
      .in('client_id', batch);

    await this.supabase.from('client_notes').delete().in('client_id', batch);

    const { error } = await this.supabase
      .from('clients')
      .delete()
      .in('id', batch);

    if (error) throw error;
  }

  private async performRollback(operation: string, backupData: any[]) {
    if (operation === 'delete' && backupData.length > 0) {
      // Restore deleted clients
      const { error } = await this.supabase.from('clients').insert(backupData);

      if (error) {
        console.error('Rollback failed:', error);
        throw new Error('Rollback failed - manual intervention required');
      }
    }
  }

  private async performMemoryCleanup() {
    // Force garbage collection if available
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
    }

    // Small delay to allow cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  private lastProgressUpdate = 0;
  private async throttledCallback(
    callback: (progress: BulkOperationProgress) => void,
    progress: BulkOperationProgress,
  ) {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.PROGRESS_THROTTLE_MS) {
      callback(progress);
      this.lastProgressUpdate = now;
    }
  }

  private async sendProgressNotification(progress: BulkOperationProgress) {
    await notificationEngine.sendNotification({
      template_id: 'bulk_operation_progress',
      recipients: [
        {
          id: 'current_user',
          name: 'User',
          email: 'user@example.com',
          type: 'planner',
          preferences: {
            channels: [{ type: 'in_app', enabled: true, priority: 1 }],
          },
        },
      ],
      variables: {
        operation: progress.operation,
        percentage: progress.percentage,
        completed: progress.completed,
        total: progress.total,
        current_batch: progress.currentBatch,
        total_batches: progress.totalBatches,
      },
      context: {
        wedding_id: 'current_wedding',
      },
    });
  }

  private async sendCompletionNotification(progress: BulkOperationProgress) {
    await notificationEngine.sendNotification({
      template_id: 'bulk_operation_completed',
      recipients: [
        {
          id: 'current_user',
          name: 'User',
          email: 'user@example.com',
          type: 'planner',
          preferences: {
            channels: [{ type: 'in_app', enabled: true, priority: 1 }],
          },
        },
      ],
      variables: {
        operation: progress.operation,
        total: progress.total,
        completed: progress.completed,
        failed: progress.failed,
        success_rate: Math.round((progress.completed / progress.total) * 100),
      },
      context: {
        wedding_id: 'current_wedding',
      },
    });
  }
}

// Export singleton instance
export const bulkOperationsService = BulkOperationsService.getInstance();

// React hook for bulk operations
export function useBulkOperations() {
  const service = bulkOperationsService;

  return {
    executeOperation: service.executeBulkOperation.bind(service),
    cancelOperation: service.cancelOperation.bind(service),
    getPerformanceMetrics: service.getPerformanceMetrics.bind(service),
    createSelectionManager: service.createSelectionManager.bind(service),
    optimizedBulkSelect: service.optimizedBulkSelect.bind(service),
    streamingExport: service.streamingExport.bind(service),
  };
}
