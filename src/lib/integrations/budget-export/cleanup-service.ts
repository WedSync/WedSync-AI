import { createClient } from '@supabase/supabase-js';
import { ExportFileManager } from './file-manager';
import { z } from 'zod';

// Cleanup configuration
const cleanupConfig = {
  batchSize: 50, // Process files in batches to avoid memory issues
  maxRetries: 3,
  retryDelayMs: 1000,
  gracePeriodHours: 2, // Additional grace period before deletion
  auditRetentionDays: 30, // Keep audit logs for 30 days
  emergencyCleanupThresholdMB: 500, // Emergency cleanup if storage exceeds this
  scheduledRunIntervalHours: 6, // Run every 6 hours
};

// Cleanup statistics interface
export interface CleanupStats {
  totalFilesProcessed: number;
  filesDeleted: number;
  storageFreedBytes: number;
  errors: number;
  processingTimeMs: number;
  nextScheduledRun: Date;
}

// Emergency cleanup result
export interface EmergencyCleanupResult {
  success: boolean;
  filesDeleted: number;
  storageFreed: number;
  message: string;
}

// Cleanup audit log entry
interface CleanupAuditEntry {
  id: string;
  coupleId: string;
  fileName: string;
  fileSize: number;
  deletedAt: Date;
  reason: string;
}

/**
 * StorageCleanupService - Automated cleanup and maintenance service
 * Handles expired file deletion, emergency cleanup, and storage optimization
 */
export class StorageCleanupService {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  private static supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  private static isRunning = false;
  private static lastRunTimestamp: Date | null = null;

  /**
   * Main cleanup process - deletes expired files and optimizes storage
   * @param forceRun - Skip time-based checks and run immediately
   * @returns Cleanup statistics
   */
  static async runCleanup(forceRun: boolean = false): Promise<CleanupStats> {
    const startTime = Date.now();

    try {
      // Prevent concurrent cleanup runs
      if (this.isRunning && !forceRun) {
        throw new Error('Cleanup process is already running');
      }

      // Check if enough time has passed since last run
      if (!forceRun && this.lastRunTimestamp) {
        const hoursSinceLastRun =
          (Date.now() - this.lastRunTimestamp.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRun < cleanupConfig.scheduledRunIntervalHours) {
          return this.getLastCleanupStats();
        }
      }

      this.isRunning = true;
      this.lastRunTimestamp = new Date();

      console.log('Starting scheduled storage cleanup...');

      const stats: CleanupStats = {
        totalFilesProcessed: 0,
        filesDeleted: 0,
        storageFreedBytes: 0,
        errors: 0,
        processingTimeMs: 0,
        nextScheduledRun: new Date(
          Date.now() + cleanupConfig.scheduledRunIntervalHours * 60 * 60 * 1000,
        ),
      };

      // Step 1: Clean expired export files
      const expiredCleanup = await this.cleanupExpiredFiles();
      stats.totalFilesProcessed += expiredCleanup.filesProcessed;
      stats.filesDeleted += expiredCleanup.filesDeleted;
      stats.storageFreedBytes += expiredCleanup.storageFreed;
      stats.errors += expiredCleanup.errors;

      // Step 2: Clean orphaned database records
      const orphanedCleanup = await this.cleanupOrphanedRecords();
      stats.totalFilesProcessed += orphanedCleanup.recordsProcessed;
      stats.filesDeleted += orphanedCleanup.recordsDeleted;

      // Step 3: Clean audit logs older than retention period
      const auditCleanup = await this.cleanupOldAuditLogs();

      // Step 4: Check for emergency cleanup conditions
      const storageUsage = await this.getGlobalStorageUsage();
      if (
        storageUsage.totalSizeMB > cleanupConfig.emergencyCleanupThresholdMB
      ) {
        console.warn(
          `Storage usage ${storageUsage.totalSizeMB}MB exceeds emergency threshold, triggering emergency cleanup`,
        );
        const emergencyResult = await this.runEmergencyCleanup();
        stats.filesDeleted += emergencyResult.filesDeleted;
        stats.storageFreedBytes += emergencyResult.storageFreed;
      }

      stats.processingTimeMs = Date.now() - startTime;

      // Log cleanup completion
      await this.logCleanupCompletion(stats);

      console.log(
        `Storage cleanup completed: ${stats.filesDeleted} files deleted, ${Math.round((stats.storageFreedBytes / 1024 / 1024) * 100) / 100}MB freed`,
      );

      return stats;
    } catch (error) {
      console.error('StorageCleanupService.runCleanup error:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Emergency cleanup - aggressive file deletion to free storage space
   * @returns Emergency cleanup result
   */
  static async runEmergencyCleanup(): Promise<EmergencyCleanupResult> {
    try {
      console.log('Starting emergency cleanup process...');

      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Find files that are close to expiration (within 6 hours) to delete early
      const urgentCleanupDate = new Date();
      urgentCleanupDate.setHours(urgentCleanupDate.getHours() + 6);

      const { data: urgentFiles, error: urgentError } = await supabase
        .from('budget_export_files')
        .select('id, couple_id, file_name, file_size, storage_url')
        .lt('expires_at', urgentCleanupDate.toISOString())
        .order('expires_at', { ascending: true })
        .limit(100); // Process in batches

      if (urgentError) {
        return {
          success: false,
          filesDeleted: 0,
          storageFreed: 0,
          message: `Emergency cleanup failed: ${urgentError.message}`,
        };
      }

      if (!urgentFiles || urgentFiles.length === 0) {
        return {
          success: true,
          filesDeleted: 0,
          storageFreed: 0,
          message: 'No files found for emergency cleanup',
        };
      }

      let deletedCount = 0;
      let freedBytes = 0;
      const auditEntries: CleanupAuditEntry[] = [];

      // Delete files in batches
      const batchSize = cleanupConfig.batchSize;
      for (let i = 0; i < urgentFiles.length; i += batchSize) {
        const batch = urgentFiles.slice(i, i + batchSize);

        // Delete storage files
        const storagePaths = batch.map((file) => file.storage_url);
        const { error: storageError } = await supabase.storage
          .from('budget-exports')
          .remove(storagePaths);

        if (storageError) {
          console.error('Emergency cleanup storage error:', storageError);
        }

        // Delete database records
        const fileIds = batch.map((file) => file.id);
        const { error: deleteError } = await supabase
          .from('budget_export_files')
          .delete()
          .in('id', fileIds);

        if (!deleteError) {
          deletedCount += batch.length;
          freedBytes += batch.reduce((sum, file) => sum + file.file_size, 0);

          // Prepare audit entries
          batch.forEach((file) => {
            auditEntries.push({
              id: file.id,
              coupleId: file.couple_id,
              fileName: file.file_name,
              fileSize: file.file_size,
              deletedAt: new Date(),
              reason: 'Emergency cleanup - storage threshold exceeded',
            });
          });
        }
      }

      // Log audit entries
      await this.logCleanupAudit(auditEntries);

      return {
        success: true,
        filesDeleted: deletedCount,
        storageFreed: freedBytes,
        message: `Emergency cleanup completed: ${deletedCount} files deleted, ${Math.round((freedBytes / 1024 / 1024) * 100) / 100}MB freed`,
      };
    } catch (error) {
      console.error('StorageCleanupService.runEmergencyCleanup error:', error);
      return {
        success: false,
        filesDeleted: 0,
        storageFreed: 0,
        message: `Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get current storage usage across all couples
   * @returns Global storage usage statistics
   */
  static async getGlobalStorageUsage(): Promise<{
    totalFiles: number;
    totalSizeMB: number;
    oldestFile: Date | null;
    newestFile: Date | null;
    averageFileSizeMB: number;
  }> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const { data, error } = await supabase
        .from('budget_export_files')
        .select('file_size, created_at')
        .gt('expires_at', new Date().toISOString()); // Only non-expired files

      if (error) {
        console.error('Error fetching storage usage:', error);
        return {
          totalFiles: 0,
          totalSizeMB: 0,
          oldestFile: null,
          newestFile: null,
          averageFileSizeMB: 0,
        };
      }

      if (!data || data.length === 0) {
        return {
          totalFiles: 0,
          totalSizeMB: 0,
          oldestFile: null,
          newestFile: null,
          averageFileSizeMB: 0,
        };
      }

      const totalSize = data.reduce((sum, file) => sum + file.file_size, 0);
      const totalSizeMB = Math.round((totalSize / 1024 / 1024) * 100) / 100;
      const averageFileSizeMB =
        Math.round((totalSize / data.length / 1024 / 1024) * 100) / 100;

      const dates = data.map((file) => new Date(file.created_at));
      const oldestFile =
        dates.length > 0
          ? new Date(Math.min(...dates.map((d) => d.getTime())))
          : null;
      const newestFile =
        dates.length > 0
          ? new Date(Math.max(...dates.map((d) => d.getTime())))
          : null;

      return {
        totalFiles: data.length,
        totalSizeMB,
        oldestFile,
        newestFile,
        averageFileSizeMB,
      };
    } catch (error) {
      console.error(
        'StorageCleanupService.getGlobalStorageUsage error:',
        error,
      );
      return {
        totalFiles: 0,
        totalSizeMB: 0,
        oldestFile: null,
        newestFile: null,
        averageFileSizeMB: 0,
      };
    }
  }

  /**
   * Schedule automatic cleanup to run at specified intervals
   * @param intervalHours - Hours between cleanup runs
   * @returns Schedule configuration
   */
  static scheduleAutomaticCleanup(
    intervalHours: number = cleanupConfig.scheduledRunIntervalHours,
  ): {
    scheduled: boolean;
    nextRun: Date;
    intervalHours: number;
  } {
    try {
      // In a production environment, this would integrate with a job scheduler
      // For now, we'll set up a simple interval-based approach

      if (typeof setInterval !== 'undefined') {
        setInterval(
          async () => {
            try {
              console.log('Running scheduled cleanup...');
              await this.runCleanup(true);
            } catch (error) {
              console.error('Scheduled cleanup error:', error);
            }
          },
          intervalHours * 60 * 60 * 1000,
        );
      }

      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + intervalHours);

      return {
        scheduled: true,
        nextRun,
        intervalHours,
      };
    } catch (error) {
      console.error(
        'StorageCleanupService.scheduleAutomaticCleanup error:',
        error,
      );
      return {
        scheduled: false,
        nextRun: new Date(),
        intervalHours,
      };
    }
  }

  /**
   * Private method: Clean up expired files
   */
  private static async cleanupExpiredFiles(): Promise<{
    filesProcessed: number;
    filesDeleted: number;
    storageFreed: number;
    errors: number;
  }> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Add grace period to expiration check
      const gracePeriodDate = new Date();
      gracePeriodDate.setHours(
        gracePeriodDate.getHours() - cleanupConfig.gracePeriodHours,
      );

      // Find expired files
      const { data: expiredFiles, error: findError } = await supabase
        .from('budget_export_files')
        .select('id, couple_id, file_name, file_size, storage_url, expires_at')
        .lt('expires_at', gracePeriodDate.toISOString());

      if (findError) {
        console.error('Error finding expired files:', findError);
        return {
          filesProcessed: 0,
          filesDeleted: 0,
          storageFreed: 0,
          errors: 1,
        };
      }

      if (!expiredFiles || expiredFiles.length === 0) {
        return {
          filesProcessed: 0,
          filesDeleted: 0,
          storageFreed: 0,
          errors: 0,
        };
      }

      let deletedCount = 0;
      let freedBytes = 0;
      let errors = 0;
      const auditEntries: CleanupAuditEntry[] = [];

      // Process files in batches
      const batchSize = cleanupConfig.batchSize;
      for (let i = 0; i < expiredFiles.length; i += batchSize) {
        const batch = expiredFiles.slice(i, i + batchSize);

        try {
          // Delete from storage
          const storagePaths = batch.map((file) => file.storage_url);
          const { error: storageError } = await supabase.storage
            .from('budget-exports')
            .remove(storagePaths);

          if (storageError) {
            console.error('Storage deletion error:', storageError);
            errors++;
          }

          // Delete database records
          const fileIds = batch.map((file) => file.id);
          const { error: deleteError } = await supabase
            .from('budget_export_files')
            .delete()
            .in('id', fileIds);

          if (!deleteError) {
            deletedCount += batch.length;
            freedBytes += batch.reduce((sum, file) => sum + file.file_size, 0);

            // Prepare audit entries
            batch.forEach((file) => {
              auditEntries.push({
                id: file.id,
                coupleId: file.couple_id,
                fileName: file.file_name,
                fileSize: file.file_size,
                deletedAt: new Date(),
                reason: `Expired on ${file.expires_at}`,
              });
            });
          } else {
            console.error('Database deletion error:', deleteError);
            errors++;
          }
        } catch (batchError) {
          console.error('Batch processing error:', batchError);
          errors++;
        }
      }

      // Log audit entries
      if (auditEntries.length > 0) {
        await this.logCleanupAudit(auditEntries);
      }

      return {
        filesProcessed: expiredFiles.length,
        filesDeleted: deletedCount,
        storageFreed: freedBytes,
        errors,
      };
    } catch (error) {
      console.error('StorageCleanupService.cleanupExpiredFiles error:', error);
      return { filesProcessed: 0, filesDeleted: 0, storageFreed: 0, errors: 1 };
    }
  }

  /**
   * Private method: Clean up orphaned database records (records without storage files)
   */
  private static async cleanupOrphanedRecords(): Promise<{
    recordsProcessed: number;
    recordsDeleted: number;
  }> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      // Get all file records
      const { data: allFiles, error: fetchError } = await supabase
        .from('budget_export_files')
        .select('id, storage_url')
        .limit(1000); // Process in reasonable batches

      if (fetchError || !allFiles) {
        return { recordsProcessed: 0, recordsDeleted: 0 };
      }

      let deletedCount = 0;

      // Check each file's existence in storage
      for (const file of allFiles) {
        try {
          const { data: storageData, error: storageError } =
            await supabase.storage
              .from('budget-exports')
              .download(file.storage_url);

          // If storage file doesn't exist, delete the database record
          if (storageError || !storageData) {
            const { error: deleteError } = await supabase
              .from('budget_export_files')
              .delete()
              .eq('id', file.id);

            if (!deleteError) {
              deletedCount++;
              console.log(`Cleaned up orphaned record: ${file.id}`);
            }
          }
        } catch (error) {
          // File doesn't exist in storage, delete the record
          const { error: deleteError } = await supabase
            .from('budget_export_files')
            .delete()
            .eq('id', file.id);

          if (!deleteError) {
            deletedCount++;
          }
        }
      }

      return {
        recordsProcessed: allFiles.length,
        recordsDeleted: deletedCount,
      };
    } catch (error) {
      console.error(
        'StorageCleanupService.cleanupOrphanedRecords error:',
        error,
      );
      return { recordsProcessed: 0, recordsDeleted: 0 };
    }
  }

  /**
   * Private method: Clean up old audit logs
   */
  private static async cleanupOldAuditLogs(): Promise<number> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - cleanupConfig.auditRetentionDays,
      );

      const { error } = await supabase
        .from('budget_export_cleanup_audit')
        .delete()
        .lt('deleted_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old audit logs:', error);
        return 0;
      }

      return 1; // Success
    } catch (error) {
      console.error('StorageCleanupService.cleanupOldAuditLogs error:', error);
      return 0;
    }
  }

  /**
   * Private method: Log cleanup audit entries
   */
  private static async logCleanupAudit(
    entries: CleanupAuditEntry[],
  ): Promise<void> {
    if (entries.length === 0) return;

    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const auditRecords = entries.map((entry) => ({
        file_id: entry.id,
        couple_id: entry.coupleId,
        file_name: entry.fileName,
        file_size: entry.fileSize,
        deleted_at: entry.deletedAt.toISOString(),
        reason: entry.reason,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('budget_export_cleanup_audit')
        .insert(auditRecords);

      if (error) {
        console.error('Error logging cleanup audit:', error);
      }
    } catch (error) {
      console.error('StorageCleanupService.logCleanupAudit error:', error);
    }
  }

  /**
   * Private method: Log cleanup completion statistics
   */
  private static async logCleanupCompletion(
    stats: CleanupStats,
  ): Promise<void> {
    try {
      const supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

      const { error } = await supabase
        .from('budget_export_cleanup_logs')
        .insert({
          run_timestamp: this.lastRunTimestamp?.toISOString(),
          files_processed: stats.totalFilesProcessed,
          files_deleted: stats.filesDeleted,
          storage_freed_bytes: stats.storageFreedBytes,
          errors_count: stats.errors,
          processing_time_ms: stats.processingTimeMs,
          next_scheduled_run: stats.nextScheduledRun.toISOString(),
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error logging cleanup completion:', error);
      }
    } catch (error) {
      console.error('StorageCleanupService.logCleanupCompletion error:', error);
    }
  }

  /**
   * Private method: Get last cleanup statistics
   */
  private static getLastCleanupStats(): CleanupStats {
    return {
      totalFilesProcessed: 0,
      filesDeleted: 0,
      storageFreedBytes: 0,
      errors: 0,
      processingTimeMs: 0,
      nextScheduledRun: new Date(
        Date.now() + cleanupConfig.scheduledRunIntervalHours * 60 * 60 * 1000,
      ),
    };
  }
}
