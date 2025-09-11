/**
 * WS-004: Bulk Operations Audit Logger
 * Production-grade audit logging for compliance and error recovery
 */

import { createClient } from '@/lib/supabase/server';

export interface BulkOperationAuditEntry {
  operation_id: string;
  user_id: string;
  operation_type: string;
  target_count: number;
  parameters: any;
  status: 'started' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  success_count?: number;
  failure_count?: number;
  errors?: Array<{
    target_id: string;
    error_message: string;
    error_code?: string;
  }>;
  performance_metrics?: {
    duration_ms: number;
    memory_usage_mb?: number;
    batch_count: number;
    avg_batch_duration_ms: number;
  };
  rollback_info?: {
    backup_id: string;
    rollback_reason: string;
    rollback_timestamp: string;
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface BulkOperationBackup {
  backup_id: string;
  operation_id: string;
  backup_type: 'pre_operation' | 'incremental' | 'rollback';
  data_snapshot: any[];
  compressed_size_bytes?: number;
  checksum?: string;
  retention_until: string;
  created_at: string;
}

/**
 * Comprehensive audit logger for bulk operations
 * Ensures compliance, error recovery, and operational transparency
 */
export class BulkOperationAuditLogger {
  private static instance: BulkOperationAuditLogger;
  private supabase = createClient();

  private constructor() {}

  static getInstance(): BulkOperationAuditLogger {
    if (!BulkOperationAuditLogger.instance) {
      BulkOperationAuditLogger.instance = new BulkOperationAuditLogger();
    }
    return BulkOperationAuditLogger.instance;
  }

  /**
   * Log the start of a bulk operation
   */
  async logOperationStart(params: {
    operationId: string;
    userId: string;
    operationType: string;
    targetCount: number;
    parameters: any;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const auditEntry: BulkOperationAuditEntry = {
        operation_id: params.operationId,
        user_id: params.userId,
        operation_type: params.operationType,
        target_count: params.targetCount,
        parameters: params.parameters,
        status: 'started',
        metadata: params.metadata,
        created_at: new Date().toISOString(),
      };

      await this.supabase.from('bulk_operation_audit_log').insert(auditEntry);

      // Log to system audit trail for compliance
      await this.logSystemAuditEvent({
        event_type: 'bulk_operation_initiated',
        user_id: params.userId,
        operation_id: params.operationId,
        details: {
          operation_type: params.operationType,
          target_count: params.targetCount,
          risk_level: this.assessRiskLevel(
            params.operationType,
            params.targetCount,
          ),
        },
      });
    } catch (error) {
      console.error('Failed to log operation start:', error);
      // Continue execution - audit failure should not block operations
    }
  }

  /**
   * Update operation progress
   */
  async logOperationProgress(params: {
    operationId: string;
    status: 'in_progress' | 'completed' | 'failed';
    successCount?: number;
    failureCount?: number;
    errors?: Array<{
      target_id: string;
      error_message: string;
      error_code?: string;
    }>;
    performanceMetrics?: {
      duration_ms: number;
      memory_usage_mb?: number;
      batch_count: number;
      avg_batch_duration_ms: number;
    };
  }): Promise<void> {
    try {
      const updateData: Partial<BulkOperationAuditEntry> = {
        status: params.status,
        success_count: params.successCount,
        failure_count: params.failureCount,
        errors: params.errors,
        performance_metrics: params.performanceMetrics,
        updated_at: new Date().toISOString(),
      };

      await this.supabase
        .from('bulk_operation_audit_log')
        .update(updateData)
        .eq('operation_id', params.operationId);

      // Log completion to system audit if operation finished
      if (params.status === 'completed' || params.status === 'failed') {
        await this.logSystemAuditEvent({
          event_type: `bulk_operation_${params.status}`,
          operation_id: params.operationId,
          details: {
            success_count: params.successCount || 0,
            failure_count: params.failureCount || 0,
            duration_ms: params.performanceMetrics?.duration_ms,
          },
        });
      }
    } catch (error) {
      console.error('Failed to log operation progress:', error);
    }
  }

  /**
   * Create backup before destructive operations
   */
  async createOperationBackup(params: {
    operationId: string;
    backupType: 'pre_operation' | 'incremental' | 'rollback';
    dataSnapshot: any[];
    retentionDays?: number;
  }): Promise<string> {
    try {
      const backupId = `backup_${params.operationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Compress data if large
      const compressedData = await this.compressBackupData(params.dataSnapshot);
      const checksum = await this.calculateChecksum(compressedData);

      const retentionDays = params.retentionDays || 90;
      const retentionUntil = new Date();
      retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

      const backup: BulkOperationBackup = {
        backup_id: backupId,
        operation_id: params.operationId,
        backup_type: params.backupType,
        data_snapshot: compressedData,
        compressed_size_bytes: JSON.stringify(compressedData).length,
        checksum,
        retention_until: retentionUntil.toISOString(),
        created_at: new Date().toISOString(),
      };

      await this.supabase.from('bulk_operation_backups').insert(backup);

      // Log backup creation
      await this.logSystemAuditEvent({
        event_type: 'bulk_operation_backup_created',
        operation_id: params.operationId,
        details: {
          backup_id: backupId,
          backup_type: params.backupType,
          record_count: params.dataSnapshot.length,
          size_bytes: backup.compressed_size_bytes,
        },
      });

      return backupId;
    } catch (error) {
      console.error('Failed to create operation backup:', error);
      throw new Error(
        'Backup creation failed - cannot proceed with destructive operation',
      );
    }
  }

  /**
   * Perform rollback using backup data
   */
  async performRollback(params: {
    operationId: string;
    backupId: string;
    rollbackReason: string;
    userId: string;
  }): Promise<{
    success: boolean;
    restoredCount: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      restoredCount: 0,
      errors: [] as string[],
    };

    try {
      // Get backup data
      const { data: backup, error } = await this.supabase
        .from('bulk_operation_backups')
        .select('*')
        .eq('backup_id', params.backupId)
        .single();

      if (error || !backup) {
        throw new Error(`Backup ${params.backupId} not found`);
      }

      // Verify backup integrity
      const currentChecksum = await this.calculateChecksum(
        backup.data_snapshot,
      );
      if (currentChecksum !== backup.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      // Decompress data
      const restoredData = await this.decompressBackupData(
        backup.data_snapshot,
      );

      // Restore data in batches
      const batchSize = 50;
      let restoredCount = 0;

      for (let i = 0; i < restoredData.length; i += batchSize) {
        const batch = restoredData.slice(i, i + batchSize);

        try {
          const { error: restoreError } = await this.supabase
            .from('clients')
            .upsert(batch, {
              onConflict: 'id',
              ignoreDuplicates: false,
            });

          if (restoreError) {
            result.errors.push(
              `Batch ${Math.floor(i / batchSize)}: ${restoreError.message}`,
            );
          } else {
            restoredCount += batch.length;
          }
        } catch (batchError) {
          result.errors.push(
            `Batch ${Math.floor(i / batchSize)}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`,
          );
        }
      }

      result.restoredCount = restoredCount;
      result.success = result.errors.length === 0;

      // Log rollback completion
      await this.logOperationRollback({
        operationId: params.operationId,
        backupId: params.backupId,
        rollbackReason: params.rollbackReason,
        success: result.success,
        restoredCount: result.restoredCount,
        errors: result.errors,
      });

      await this.logSystemAuditEvent({
        event_type: 'bulk_operation_rolled_back',
        user_id: params.userId,
        operation_id: params.operationId,
        details: {
          backup_id: params.backupId,
          rollback_reason: params.rollbackReason,
          restored_count: result.restoredCount,
          error_count: result.errors.length,
          success: result.success,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown rollback error';
      result.errors.push(errorMessage);
      console.error('Rollback failed:', error);
    }

    return result;
  }

  /**
   * Log rollback information
   */
  private async logOperationRollback(params: {
    operationId: string;
    backupId: string;
    rollbackReason: string;
    success: boolean;
    restoredCount: number;
    errors: string[];
  }): Promise<void> {
    try {
      const rollbackInfo = {
        backup_id: params.backupId,
        rollback_reason: params.rollbackReason,
        rollback_timestamp: new Date().toISOString(),
      };

      await this.supabase
        .from('bulk_operation_audit_log')
        .update({
          status: 'rolled_back',
          rollback_info: rollbackInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('operation_id', params.operationId);
    } catch (error) {
      console.error('Failed to log rollback info:', error);
    }
  }

  /**
   * Get operation audit trail for compliance reporting
   */
  async getOperationAuditTrail(params: {
    operationId?: string;
    userId?: string;
    operationType?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    limit?: number;
  }): Promise<BulkOperationAuditEntry[]> {
    try {
      let query = this.supabase
        .from('bulk_operation_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (params.operationId)
        query = query.eq('operation_id', params.operationId);
      if (params.userId) query = query.eq('user_id', params.userId);
      if (params.operationType)
        query = query.eq('operation_type', params.operationType);
      if (params.status) query = query.eq('status', params.status);
      if (params.startDate) query = query.gte('created_at', params.startDate);
      if (params.endDate) query = query.lte('created_at', params.endDate);
      if (params.limit) query = query.limit(params.limit);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    startDate: string;
    endDate: string;
    includeUserActivity?: boolean;
    includePerformanceMetrics?: boolean;
  }): Promise<{
    summary: {
      total_operations: number;
      successful_operations: number;
      failed_operations: number;
      rolled_back_operations: number;
      total_records_affected: number;
    };
    risk_analysis: {
      high_risk_operations: number;
      user_with_most_operations: string;
      most_common_failures: Array<{ error: string; count: number }>;
    };
    performance_summary?: {
      average_duration_ms: number;
      slowest_operations: Array<{ operation_id: string; duration_ms: number }>;
    };
    user_activity?: Array<{
      user_id: string;
      operation_count: number;
      success_rate: number;
    }>;
  }> {
    try {
      const auditEntries = await this.getOperationAuditTrail({
        startDate: params.startDate,
        endDate: params.endDate,
      });

      const summary = {
        total_operations: auditEntries.length,
        successful_operations: auditEntries.filter(
          (e) => e.status === 'completed',
        ).length,
        failed_operations: auditEntries.filter((e) => e.status === 'failed')
          .length,
        rolled_back_operations: auditEntries.filter(
          (e) => e.status === 'rolled_back',
        ).length,
        total_records_affected: auditEntries.reduce(
          (sum, e) => sum + (e.success_count || 0),
          0,
        ),
      };

      // Risk analysis
      const highRiskOps = auditEntries.filter(
        (e) =>
          this.assessRiskLevel(e.operation_type, e.target_count) === 'high',
      );

      const userOperationCounts = auditEntries.reduce(
        (acc, e) => {
          acc[e.user_id] = (acc[e.user_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const userWithMostOperations =
        Object.entries(userOperationCounts).sort(
          ([, a], [, b]) => b - a,
        )[0]?.[0] || 'N/A';

      // Analyze common failures
      const failureErrors = auditEntries
        .filter((e) => e.errors && e.errors.length > 0)
        .flatMap((e) => e.errors!.map((error) => error.error_message));

      const errorCounts = failureErrors.reduce(
        (acc, error) => {
          acc[error] = (acc[error] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const mostCommonFailures = Object.entries(errorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([error, count]) => ({ error, count }));

      const risk_analysis = {
        high_risk_operations: highRiskOps.length,
        user_with_most_operations: userWithMostOperations,
        most_common_failures: mostCommonFailures,
      };

      const report: any = { summary, risk_analysis };

      // Optional performance metrics
      if (params.includePerformanceMetrics) {
        const completedOps = auditEntries.filter(
          (e) => e.status === 'completed' && e.performance_metrics?.duration_ms,
        );

        const averageDuration =
          completedOps.length > 0
            ? completedOps.reduce(
                (sum, e) => sum + (e.performance_metrics?.duration_ms || 0),
                0,
              ) / completedOps.length
            : 0;

        const slowestOps = completedOps
          .sort(
            (a, b) =>
              (b.performance_metrics?.duration_ms || 0) -
              (a.performance_metrics?.duration_ms || 0),
          )
          .slice(0, 10)
          .map((e) => ({
            operation_id: e.operation_id,
            duration_ms: e.performance_metrics?.duration_ms || 0,
          }));

        report.performance_summary = {
          average_duration_ms: Math.round(averageDuration),
          slowest_operations: slowestOps,
        };
      }

      // Optional user activity analysis
      if (params.includeUserActivity) {
        report.user_activity = Object.entries(userOperationCounts)
          .map(([userId, count]) => {
            const userOps = auditEntries.filter((e) => e.user_id === userId);
            const successfulOps = userOps.filter(
              (e) => e.status === 'completed',
            ).length;
            return {
              user_id: userId,
              operation_count: count,
              success_rate: Math.round((successfulOps / count) * 100),
            };
          })
          .sort((a, b) => b.operation_count - a.operation_count);
      }

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  // Private helper methods

  private async logSystemAuditEvent(params: {
    event_type: string;
    user_id?: string;
    operation_id?: string;
    details: any;
  }): Promise<void> {
    try {
      await this.supabase.from('system_audit_log').insert({
        event_type: params.event_type,
        user_id: params.user_id,
        operation_id: params.operation_id,
        details: params.details,
        source: 'bulk_operations_system',
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log system audit event:', error);
    }
  }

  private assessRiskLevel(
    operationType: string,
    targetCount: number,
  ): 'low' | 'medium' | 'high' {
    if (operationType === 'delete') {
      if (targetCount > 100) return 'high';
      if (targetCount > 10) return 'medium';
      return 'low';
    }

    if (targetCount > 1000) return 'high';
    if (targetCount > 100) return 'medium';
    return 'low';
  }

  private async compressBackupData(data: any[]): Promise<any> {
    // In a real implementation, you'd use a compression library
    // For now, we'll just return the data as-is
    return data;
  }

  private async decompressBackupData(compressedData: any): Promise<any[]> {
    // In a real implementation, you'd decompress the data
    return Array.isArray(compressedData) ? compressedData : [];
  }

  private async calculateChecksum(data: any): Promise<string> {
    // Simple checksum calculation (in production, use crypto.createHash)
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cleanup old audit logs and backups based on retention policy
   */
  async cleanupOldRecords(retentionDays: number = 365): Promise<{
    deletedAuditLogs: number;
    deletedBackups: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffISOString = cutoffDate.toISOString();

      // Delete old audit logs
      const { count: deletedAuditLogs } = await this.supabase
        .from('bulk_operation_audit_log')
        .delete({ count: 'exact' })
        .lt('created_at', cutoffISOString);

      // Delete old backups
      const { count: deletedBackups } = await this.supabase
        .from('bulk_operation_backups')
        .delete({ count: 'exact' })
        .lt('retention_until', new Date().toISOString());

      await this.logSystemAuditEvent({
        event_type: 'audit_cleanup_completed',
        details: {
          retention_days: retentionDays,
          deleted_audit_logs: deletedAuditLogs || 0,
          deleted_backups: deletedBackups || 0,
        },
      });

      return {
        deletedAuditLogs: deletedAuditLogs || 0,
        deletedBackups: deletedBackups || 0,
      };
    } catch (error) {
      console.error('Failed to cleanup old records:', error);
      return { deletedAuditLogs: 0, deletedBackups: 0 };
    }
  }
}

// Export singleton instance
export const auditLogger = BulkOperationAuditLogger.getInstance();
