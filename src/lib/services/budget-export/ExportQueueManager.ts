/**
 * WS-166: Export Queue Manager - Background processing for budget exports
 * Team B: Core background processing and queue management system
 *
 * Features:
 * - Async export queue processing
 * - Priority-based queue management
 * - Retry logic for failed exports
 * - Progress tracking and status updates
 * - File cleanup and expiration handling
 * - Error handling and logging
 */

import { createClient } from '@/lib/supabase/server';
import {
  BudgetPDFGenerator,
  BudgetExcelGenerator,
} from './BudgetExportServices';
import type {
  ExportRequest,
  BudgetExportRecord,
  ExportQueueItem,
  BudgetData,
  ExportFormat,
} from '@/types/budget-export';

/**
 * Configuration for queue processing
 */
const QUEUE_CONFIG = {
  maxConcurrentJobs: 3,
  maxRetryAttempts: 3,
  retryDelayMs: 5000,
  processingTimeoutMs: 300000, // 5 minutes
  healthCheckIntervalMs: 30000, // 30 seconds
  cleanupIntervalMs: 3600000, // 1 hour
  queuePollIntervalMs: 5000, // 5 seconds
} as const;

/**
 * Queue processing status
 */
interface ProcessingStatus {
  isRunning: boolean;
  activeJobs: Map<string, ExportJob>;
  lastProcessedAt?: Date;
  totalProcessed: number;
  totalFailed: number;
}

/**
 * Export Queue Manager - Handles background processing of budget exports
 */
export class ExportQueueManager {
  private static instance: ExportQueueManager | null = null;
  private processingStatus: ProcessingStatus = {
    isRunning: false,
    activeJobs: new Map(),
    totalProcessed: 0,
    totalFailed: 0,
  };
  private processingTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Singleton pattern - ensure only one queue manager instance
   */
  static getInstance(): ExportQueueManager {
    if (!ExportQueueManager.instance) {
      ExportQueueManager.instance = new ExportQueueManager();
    }
    return ExportQueueManager.instance;
  }

  /**
   * Start the queue processing system
   */
  async startProcessing(): Promise<void> {
    if (this.processingStatus.isRunning) {
      console.log('Export queue manager is already running');
      return;
    }

    console.log('Starting export queue manager...');
    this.processingStatus.isRunning = true;

    // Start periodic queue processing
    this.processingTimer = setInterval(
      () => this.processQueue(),
      QUEUE_CONFIG.queuePollIntervalMs,
    );

    // Start health monitoring
    this.healthCheckTimer = setInterval(
      () => this.performHealthCheck(),
      QUEUE_CONFIG.healthCheckIntervalMs,
    );

    // Start cleanup process
    this.cleanupTimer = setInterval(
      () => this.cleanupCompletedJobs(),
      QUEUE_CONFIG.cleanupIntervalMs,
    );

    // Process any existing queue items immediately
    await this.processQueue();
  }

  /**
   * Stop the queue processing system
   */
  async stopProcessing(): Promise<void> {
    console.log('Stopping export queue manager...');
    this.processingStatus.isRunning = false;

    // Clear timers
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Wait for active jobs to complete
    await this.waitForActiveJobs();
  }

  /**
   * Add export to queue
   */
  async addToQueue(exportId: string, priority: number = 1): Promise<void> {
    const supabase = await createClient();

    const queueItem = {
      export_id: exportId,
      priority,
      retry_count: 0,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('export_queue').insert(queueItem);

    if (error) {
      throw new Error(`Failed to add export to queue: ${error.message}`);
    }

    console.log(`Added export ${exportId} to queue with priority ${priority}`);
  }

  /**
   * Main queue processing function
   */
  private async processQueue(): Promise<void> {
    if (!this.processingStatus.isRunning) return;

    try {
      // Check if we have capacity for more jobs
      if (
        this.processingStatus.activeJobs.size >= QUEUE_CONFIG.maxConcurrentJobs
      ) {
        return; // At capacity, wait for jobs to complete
      }

      // Get next job from queue (highest priority, oldest first)
      const nextJob = await this.getNextQueueItem();
      if (!nextJob) {
        return; // No jobs in queue
      }

      // Start processing the job
      await this.processExportJob(nextJob);
    } catch (error) {
      console.error('Queue processing error:', error);
    }
  }

  /**
   * Get next queue item to process
   */
  private async getNextQueueItem(): Promise<ExportQueueItem | null> {
    const supabase = await createClient();

    // Get highest priority, oldest unprocessed item
    const { data: queueItem, error } = await supabase
      .from('export_queue')
      .select('*')
      .is('started_at', null)
      .is('completed_at', null)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !queueItem) {
      return null; // No items to process
    }

    // Mark as started
    const { error: updateError } = await supabase
      .from('export_queue')
      .update({
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItem.id);

    if (updateError) {
      console.error('Failed to mark queue item as started:', updateError);
      return null;
    }

    return { ...queueItem, started_at: new Date().toISOString() };
  }

  /**
   * Process individual export job
   */
  private async processExportJob(queueItem: ExportQueueItem): Promise<void> {
    const jobId = `${queueItem.export_id}_${Date.now()}`;
    const startTime = Date.now();

    // Create job tracking
    const job: ExportJob = {
      id: jobId,
      type: 'PDF_GENERATION', // Will be determined based on export type
      payload: {
        exportId: queueItem.export_id,
        coupleId: '', // Will be fetched
        budgetData: {} as any, // Will be fetched
        options: {},
      },
      priority: queueItem.priority,
      attempts: queueItem.retry_count + 1,
      maxAttempts: QUEUE_CONFIG.maxRetryAttempts,
      createdAt: queueItem.created_at,
      processedAt: new Date().toISOString(),
    };

    // Add to active jobs
    this.processingStatus.activeJobs.set(jobId, job);

    try {
      console.log(
        `Processing export job: ${queueItem.export_id} (attempt ${job.attempts})`,
      );

      // Get export details
      const exportRecord = await this.getExportRecord(queueItem.export_id);
      if (!exportRecord) {
        throw new Error('Export record not found');
      }

      // Set job type based on export format
      job.type = this.getJobType(exportRecord.export_type);
      job.payload.coupleId = exportRecord.couple_id;

      // Get budget data
      const budgetData = await this.getBudgetDataForExport(exportRecord);
      job.payload.budgetData = budgetData;

      // Process the export based on format
      const result = await this.generateExportFile(exportRecord, budgetData);

      // Mark as completed
      await this.markJobCompleted(queueItem, result);

      // Update stats
      this.processingStatus.totalProcessed++;
      this.processingStatus.lastProcessedAt = new Date();

      const processingTime = Date.now() - startTime;
      console.log(
        `Export job completed: ${queueItem.export_id} (${processingTime}ms)`,
      );
    } catch (error) {
      console.error(`Export job failed: ${queueItem.export_id}`, error);

      // Handle job failure
      await this.handleJobFailure(queueItem, error as Error);
      this.processingStatus.totalFailed++;
    } finally {
      // Remove from active jobs
      this.processingStatus.activeJobs.delete(jobId);
    }
  }

  /**
   * Get job type based on export format
   */
  private getJobType(exportFormat: ExportFormat): ExportJob['type'] {
    switch (exportFormat) {
      case 'pdf':
        return 'PDF_GENERATION';
      case 'excel':
        return 'EXCEL_GENERATION';
      case 'csv':
        return 'CSV_GENERATION';
      default:
        return 'PDF_GENERATION';
    }
  }

  /**
   * Get export record from database
   */
  private async getExportRecord(
    exportId: string,
  ): Promise<BudgetExportRecord | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('budget_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (error || !data) {
      console.error('Failed to get export record:', error);
      return null;
    }

    return data;
  }

  /**
   * Get budget data for export processing
   */
  private async getBudgetDataForExport(
    exportRecord: BudgetExportRecord,
  ): Promise<BudgetData> {
    const supabase = await createClient();

    try {
      // Get couple information
      const { data: couple, error: coupleError } = await supabase
        .from('couples')
        .select(
          `
          id,
          partner1_name,
          partner2_name,
          wedding_date,
          total_budget,
          organization_id
        `,
        )
        .eq('id', exportRecord.couple_id)
        .single();

      if (coupleError || !couple) {
        throw new Error('Couple not found');
      }

      // Build base query for budget items
      let budgetQuery = supabase
        .from('budget_items')
        .select(
          `
          id,
          category,
          vendor_name,
          description,
          planned_amount,
          actual_amount,
          paid_amount,
          payment_status,
          due_date,
          notes,
          created_at,
          updated_at
        `,
        )
        .eq('couple_id', exportRecord.couple_id);

      // Apply filters
      if (
        exportRecord.export_filters.categories &&
        exportRecord.export_filters.categories.length > 0
      ) {
        budgetQuery = budgetQuery.in(
          'category',
          exportRecord.export_filters.categories,
        );
      }

      if (
        exportRecord.export_filters.payment_status &&
        exportRecord.export_filters.payment_status !== 'all'
      ) {
        budgetQuery = budgetQuery.eq(
          'payment_status',
          exportRecord.export_filters.payment_status,
        );
      }

      if (exportRecord.export_filters.date_range?.start) {
        budgetQuery = budgetQuery.gte(
          'due_date',
          exportRecord.export_filters.date_range.start,
        );
      }

      if (exportRecord.export_filters.date_range?.end) {
        budgetQuery = budgetQuery.lte(
          'due_date',
          exportRecord.export_filters.date_range.end,
        );
      }

      // Execute query
      const { data: budgetItems, error: itemsError } = await budgetQuery
        .order('category', { ascending: true })
        .order('due_date', { ascending: true });

      if (itemsError) {
        throw new Error(`Failed to fetch budget items: ${itemsError.message}`);
      }

      // Calculate summary statistics
      const totalPlanned =
        budgetItems?.reduce(
          (sum, item) => sum + (item.planned_amount || 0),
          0,
        ) || 0;
      const totalActual =
        budgetItems?.reduce(
          (sum, item) => sum + (item.actual_amount || 0),
          0,
        ) || 0;
      const totalPaid =
        budgetItems?.reduce((sum, item) => sum + (item.paid_amount || 0), 0) ||
        0;

      // Group by category
      const categorySummary: Record<string, any> = {};
      budgetItems?.forEach((item) => {
        if (!categorySummary[item.category]) {
          categorySummary[item.category] = {
            category: item.category,
            planned_amount: 0,
            actual_amount: 0,
            paid_amount: 0,
            item_count: 0,
          };
        }

        categorySummary[item.category].planned_amount +=
          item.planned_amount || 0;
        categorySummary[item.category].actual_amount += item.actual_amount || 0;
        categorySummary[item.category].paid_amount += item.paid_amount || 0;
        categorySummary[item.category].item_count += 1;
      });

      return {
        couple,
        budgetItems: budgetItems || [],
        summary: {
          total_planned: totalPlanned,
          total_actual: totalActual,
          total_paid: totalPaid,
          total_remaining: totalPlanned - totalPaid,
          item_count: budgetItems?.length || 0,
        },
        categories: Object.values(categorySummary),
        generatedAt: new Date(),
        filters: exportRecord.export_filters,
      };
    } catch (error) {
      console.error('Failed to get budget data:', error);
      throw error;
    }
  }

  /**
   * Generate export file based on format
   */
  private async generateExportFile(
    exportRecord: BudgetExportRecord,
    budgetData: BudgetData,
  ): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
  }> {
    const supabase = await createClient();

    try {
      let fileBuffer: Buffer;
      let mimeType: string;
      let fileExtension: string;

      // Generate the file based on export type
      switch (exportRecord.export_type) {
        case 'pdf':
          fileBuffer = await BudgetPDFGenerator.generatePDF(
            exportRecord.couple_id,
            budgetData,
            exportRecord.export_filters.options || {},
          );
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;

        case 'excel':
          fileBuffer = await BudgetExcelGenerator.generateExcel(
            budgetData,
            exportRecord.export_filters,
          );
          mimeType =
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          fileExtension = 'xlsx';
          break;

        case 'csv':
          fileBuffer = await BudgetExcelGenerator.generateExcel(
            budgetData,
            exportRecord.export_filters,
            'csv',
          );
          mimeType = 'text/csv';
          fileExtension = 'csv';
          break;

        default:
          throw new Error(
            `Unsupported export type: ${exportRecord.export_type}`,
          );
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `budget-export-${timestamp}.${fileExtension}`;
      const filePath = `exports/${exportRecord.couple_id}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('budget-exports')
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      // Generate signed URL for download (valid for 7 days)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('budget-exports')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (urlError) {
        throw new Error(`Failed to generate download URL: ${urlError.message}`);
      }

      return {
        fileUrl: urlData.signedUrl,
        fileName,
        fileSize: fileBuffer.length,
      };
    } catch (error) {
      console.error('Export file generation failed:', error);
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  private async markJobCompleted(
    queueItem: ExportQueueItem,
    result: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
    },
  ): Promise<void> {
    const supabase = await createClient();

    // Update export record
    const { error: exportError } = await supabase
      .from('budget_exports')
      .update({
        status: 'completed',
        file_url: result.fileUrl,
        file_name: result.fileName,
        file_size_bytes: result.fileSize,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItem.export_id);

    if (exportError) {
      console.error('Failed to update export record:', exportError);
    }

    // Update queue item
    const { error: queueError } = await supabase
      .from('export_queue')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItem.id);

    if (queueError) {
      console.error('Failed to update queue item:', queueError);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(
    queueItem: ExportQueueItem,
    error: Error,
  ): Promise<void> {
    const supabase = await createClient();
    const newRetryCount = queueItem.retry_count + 1;

    if (newRetryCount >= QUEUE_CONFIG.maxRetryAttempts) {
      // Mark export as permanently failed
      await supabase
        .from('budget_exports')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.export_id);

      await supabase
        .from('export_queue')
        .update({
          completed_at: new Date().toISOString(),
          error_message: error.message.substring(0, 1000),
          retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);

      console.log(
        `Export ${queueItem.export_id} permanently failed after ${newRetryCount} attempts`,
      );
    } else {
      // Schedule retry
      await supabase
        .from('export_queue')
        .update({
          started_at: null, // Reset to allow retry
          error_message: error.message.substring(0, 1000),
          retry_count: newRetryCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);

      console.log(
        `Export ${queueItem.export_id} scheduled for retry (attempt ${newRetryCount + 1})`,
      );
    }
  }

  /**
   * Perform health check on queue system
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const stats = await this.getQueueStats();

      // Log health metrics
      console.log('Queue Health Check:', {
        totalQueued: stats.totalQueued,
        currentlyProcessing: stats.currentlyProcessing,
        failureRate: stats.failureRate,
        averageProcessingTime: stats.averageProcessingTime,
      });

      // Alert on high failure rate
      if (stats.failureRate > 0.5) {
        console.warn('HIGH FAILURE RATE DETECTED:', stats.failureRate);
      }

      // Alert on queue backup
      if (stats.totalQueued > 50) {
        console.warn('LARGE QUEUE DETECTED:', stats.totalQueued);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * Clean up completed queue items
   */
  private async cleanupCompletedJobs(): Promise<void> {
    const supabase = await createClient();

    // Delete completed queue items older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('export_queue')
      .delete()
      .not('completed_at', 'is', null)
      .lt('completed_at', cutoff);

    if (error) {
      console.error('Cleanup failed:', error);
    } else {
      console.log('Queue cleanup completed');
    }
  }

  /**
   * Wait for all active jobs to complete
   */
  private async waitForActiveJobs(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.processingStatus.activeJobs.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        console.warn('Timeout waiting for active jobs to complete');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const supabase = await createClient();

    const [queuedResult, processingResult] = await Promise.all([
      supabase
        .from('export_queue')
        .select('id', { count: 'exact' })
        .is('completed_at', null),
      supabase
        .from('export_queue')
        .select('id', { count: 'exact' })
        .not('started_at', 'is', null)
        .is('completed_at', null),
    ]);

    return {
      totalQueued: queuedResult.count || 0,
      currentlyProcessing: processingResult.count || 0,
      averageProcessingTime: 30, // Would calculate from historical data
      failureRate:
        this.processingStatus.totalFailed /
        Math.max(
          this.processingStatus.totalProcessed +
            this.processingStatus.totalFailed,
          1,
        ),
    };
  }

  /**
   * Get processing status
   */
  getProcessingStatus(): ProcessingStatus {
    return { ...this.processingStatus };
  }

  //============================================================================
  // Static Utility Methods (For External Use)
  //============================================================================

  /**
   * Static method to add export to queue (convenience method)
   */
  static async addExportToQueue(
    exportId: string,
    priority: number = 1,
  ): Promise<void> {
    const manager = ExportQueueManager.getInstance();
    return manager.addToQueue(exportId, priority);
  }

  /**
   * Static method to get queue statistics
   */
  static async getQueueStatistics(): Promise<any> {
    const manager = ExportQueueManager.getInstance();
    return manager.getQueueStats();
  }

  /**
   * Static method to start queue processing
   */
  static async startQueueProcessing(): Promise<void> {
    const manager = ExportQueueManager.getInstance();
    return manager.startProcessing();
  }

  /**
   * Static method to stop queue processing
   */
  static async stopQueueProcessing(): Promise<void> {
    const manager = ExportQueueManager.getInstance();
    return manager.stopProcessing();
  }

  /**
   * Static method to get processing status
   */
  static getProcessingStatus(): any {
    const manager = ExportQueueManager.getInstance();
    return manager.getProcessingStatus();
  }
}

//============================================================================
// Export Utility Functions
//============================================================================

/**
 * Background worker function for processing exports
 * This would typically be called by a cron job or background worker
 */
export async function processExportQueue(): Promise<void> {
  try {
    console.log('=== Budget Export Queue Processing Started ===');

    const manager = ExportQueueManager.getInstance();
    await manager.processQueue();

    const stats = await manager.getQueueStats();
    console.log('Queue Stats:', stats);

    console.log('=== Budget Export Queue Processing Completed ===');
  } catch (error) {
    console.error('Background export processing failed:', error);
    throw error;
  }
}

/**
 * Utility function to prioritize urgent exports
 */
export async function prioritizeExport(exportId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('export_queue')
      .update({ priority: 5 }) // High priority
      .eq('export_id', exportId)
      .is('started_at', null);

    if (error) {
      console.error('Failed to prioritize export:', error);
      return false;
    }

    console.log(`Export ${exportId} prioritized`);
    return true;
  } catch (error) {
    console.error('Error prioritizing export:', error);
    return false;
  }
}

/**
 * Get comprehensive export status with queue position
 */
export async function getExportStatusWithQueue(exportId: string): Promise<{
  exportRecord: BudgetExportRecord;
  queueStatus: ExportQueueItem | null;
  queuePosition: number;
} | null> {
  try {
    const supabase = await createClient();

    // Get export record
    const { data: exportRecord, error: exportError } = await supabase
      .from('budget_exports')
      .select('*')
      .eq('id', exportId)
      .single();

    if (exportError || !exportRecord) {
      return null;
    }

    // Get queue status if still processing
    let queueStatus = null;
    let queuePosition = 0;

    if (exportRecord.status === 'generating') {
      const { data: queueData, error: queueError } = await supabase
        .from('export_queue')
        .select('*')
        .eq('export_id', exportId)
        .single();

      if (!queueError && queueData) {
        queueStatus = queueData;

        // Calculate queue position
        const { data: queueItems, error: positionError } = await supabase
          .from('export_queue')
          .select('id, export_id')
          .is('started_at', null)
          .is('completed_at', null)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true });

        if (!positionError && queueItems) {
          const position = queueItems.findIndex(
            (item) => item.export_id === exportId,
          );
          queuePosition = position >= 0 ? position + 1 : 0;
        }
      }
    }

    return {
      exportRecord,
      queueStatus,
      queuePosition,
    };
  } catch (error) {
    console.error('Failed to get export status:', error);
    return null;
  }
}

/**
 * Clean up expired exports from storage
 */
export async function cleanupExpiredExports(): Promise<number> {
  const supabase = await createClient();
  let cleanedCount = 0;

  try {
    // Find expired exports
    const { data: expiredExports, error: findError } = await supabase
      .from('budget_exports')
      .select('id, file_name, file_url')
      .lt('expires_at', new Date().toISOString())
      .neq('status', 'expired');

    if (findError || !expiredExports) {
      console.error('Failed to find expired exports:', findError);
      return 0;
    }

    // Mark as expired
    for (const exportRecord of expiredExports) {
      try {
        // Update status
        await supabase
          .from('budget_exports')
          .update({
            status: 'expired',
            file_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', exportRecord.id);

        cleanedCount++;
        console.log(`Cleaned up expired export: ${exportRecord.id}`);
      } catch (error) {
        console.error(`Failed to cleanup export ${exportRecord.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Cleanup process error:', error);
  }

  console.log(`Cleaned up ${cleanedCount} expired exports`);
  return cleanedCount;
}

// Export singleton instance
export const exportQueueManager = ExportQueueManager.getInstance();
