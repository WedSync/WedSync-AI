/**
 * GDPR Deletion Engine
 * WS-176 - GDPR Compliance System
 *
 * Automated GDPR erasure implementation (Article 17 - Right to Erasure)
 * Handles complete user data deletion with compliance safeguards
 */

import { createClient } from '@/lib/supabase/server';
import {
  DataDeletionRequest,
  DeletionType,
  DeletionExecutionPlan,
  DeletionResult,
  DeletionStatus,
  DataCategory,
  GDPRLegalBasis,
  GDPRApiResponse,
  SecurityContext,
  AuditLogEntry,
} from '@/types/gdpr';
import crypto from 'crypto';

// ============================================================================
// Deletion Configuration & Rules
// ============================================================================

interface TableDeletionConfig {
  table_name: string;
  user_id_column: string;
  deletion_strategy: DeletionType;
  retention_period_days?: number;
  legal_basis?: GDPRLegalBasis;
  retention_reason?: string;
  dependencies?: string[];
  anonymization_fields?: string[];
  hard_delete_conditions?: string;
  cascade_deletes?: string[];
}

const DELETION_CONFIGURATION: TableDeletionConfig[] = [
  // User Profile Data
  {
    table_name: 'user_profiles',
    user_id_column: 'id',
    deletion_strategy: DeletionType.ANONYMIZATION,
    retention_period_days: 2555, // 7 years for business records
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Business records retention for tax and legal compliance',
    anonymization_fields: ['name', 'email', 'phone', 'address'],
    cascade_deletes: ['user_sessions', 'user_preferences'],
  },

  // Wedding Data
  {
    table_name: 'weddings',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.ANONYMIZATION,
    retention_period_days: 2555, // 7 years
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Contract and payment records retention',
    anonymization_fields: ['couple_names', 'venue_contact', 'guest_emails'],
  },

  // Communication Logs
  {
    table_name: 'messages',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.COMPLETE_ERASURE,
    dependencies: ['user_profiles'],
    cascade_deletes: ['message_attachments', 'message_reactions'],
  },

  // Payment Data (Special Handling)
  {
    table_name: 'payments',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.PSEUDONYMIZATION,
    retention_period_days: 2555, // 7 years
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Financial records retention for tax compliance',
    anonymization_fields: ['cardholder_name', 'billing_address'],
  },

  // Usage Analytics
  {
    table_name: 'analytics_events',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.COMPLETE_ERASURE,
    cascade_deletes: ['analytics_sessions', 'analytics_page_views'],
  },

  // Guest Data
  {
    table_name: 'wedding_guests',
    user_id_column: 'wedding_user_id',
    deletion_strategy: DeletionType.ANONYMIZATION,
    retention_period_days: 365, // 1 year post-wedding
    anonymization_fields: ['name', 'email', 'phone', 'dietary_requirements'],
  },

  // Supplier Communications
  {
    table_name: 'supplier_communications',
    user_id_column: 'client_user_id',
    deletion_strategy: DeletionType.ANONYMIZATION,
    retention_period_days: 2555, // 7 years
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Business correspondence retention',
    anonymization_fields: ['client_name', 'client_email'],
  },

  // Task Management
  {
    table_name: 'wedding_tasks',
    user_id_column: 'assigned_to_user_id',
    deletion_strategy: DeletionType.COMPLETE_ERASURE,
    cascade_deletes: ['task_attachments', 'task_comments'],
  },

  // File Uploads
  {
    table_name: 'user_files',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.COMPLETE_ERASURE,
    cascade_deletes: ['file_versions', 'file_shares'],
  },

  // GDPR Specific Tables
  {
    table_name: 'consent_records',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.ANONYMIZATION,
    retention_period_days: 2555, // 7 years
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Consent audit trail for compliance',
    anonymization_fields: ['metadata'],
  },

  // Audit Logs (Never delete, only anonymize)
  {
    table_name: 'gdpr_audit_logs',
    user_id_column: 'user_id',
    deletion_strategy: DeletionType.PSEUDONYMIZATION,
    retention_period_days: 3653, // 10 years
    legal_basis: GDPRLegalBasis.LEGAL_OBLIGATION,
    retention_reason: 'Audit trail for regulatory compliance',
  },
];

// ============================================================================
// Deletion Engine Class
// ============================================================================

export class DeletionEngine {
  private supabase = createClient();
  private readonly GRACE_PERIOD_DAYS = 30;

  /**
   * Create deletion execution plan
   * Analyzes user data and creates comprehensive deletion strategy
   */
  async createDeletionPlan(
    request: DataDeletionRequest,
    securityContext: SecurityContext,
  ): Promise<GDPRApiResponse<DeletionExecutionPlan>> {
    try {
      const startTime = Date.now();
      const planId = crypto.randomUUID();

      // Analyze user data across all tables
      const tableAnalysis = await this.analyzeUserDataDistribution(
        request.user_id,
      );

      // Create execution plan based on deletion configuration
      const tablesToProcess = [];
      const retentionExceptions = [];
      const executionOrder = [];

      for (const config of DELETION_CONFIGURATION) {
        const recordCount = tableAnalysis[config.table_name] || 0;

        if (recordCount === 0) continue;

        // Check if table has retention requirements
        if (config.retention_period_days && config.legal_basis) {
          retentionExceptions.push({
            table_name: config.table_name,
            reason: config.retention_reason || 'Legal retention requirement',
            legal_basis: config.legal_basis,
            retention_period_days: config.retention_period_days,
          });
        }

        tablesToProcess.push({
          table_name: config.table_name,
          deletion_strategy: request.immediate_deletion
            ? DeletionType.COMPLETE_ERASURE
            : config.deletion_strategy,
          conditions: `${config.user_id_column} = '${request.user_id}'`,
          estimated_records: recordCount,
          dependencies: config.dependencies || [],
        });
      }

      // Calculate execution order based on dependencies
      executionOrder.push(...this.calculateExecutionOrder(tablesToProcess));

      const executionPlan: DeletionExecutionPlan = {
        user_id: request.user_id,
        plan_id: planId,
        tables_to_process: tablesToProcess,
        retention_exceptions: retentionExceptions,
        execution_order: executionOrder,
        estimated_duration_minutes:
          this.estimateExecutionDuration(tablesToProcess),
        rollback_possible: !request.immediate_deletion,
      };

      // Store execution plan
      await this.supabase.from('deletion_execution_plans').insert({
        plan_id: planId,
        user_id: request.user_id,
        plan_data: executionPlan,
        created_at: new Date().toISOString(),
        status: 'planned',
      });

      // Audit log
      await this.auditLog({
        user_id: request.user_id,
        action: 'deletion_plan_created',
        resource_type: 'deletion_plan',
        resource_id: planId,
        details: {
          tables_count: tablesToProcess.length,
          estimated_records: tablesToProcess.reduce(
            (sum, t) => sum + t.estimated_records,
            0,
          ),
          retention_exceptions: retentionExceptions.length,
        },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'success',
      });

      return {
        success: true,
        data: executionPlan,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          request_id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PLAN_CREATION_ERROR',
          message: 'Failed to create deletion execution plan',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Execute deletion plan
   * Performs actual data deletion/anonymization based on plan
   */
  async executeDeletionPlan(
    planId: string,
    securityContext: SecurityContext,
  ): Promise<GDPRApiResponse<DeletionResult>> {
    try {
      const executionId = crypto.randomUUID();
      const startTime = Date.now();

      // Get execution plan
      const { data: planRecord, error: planError } = await this.supabase
        .from('deletion_execution_plans')
        .select('*')
        .eq('plan_id', planId)
        .single();

      if (planError || !planRecord) {
        return {
          success: false,
          error: {
            code: 'PLAN_NOT_FOUND',
            message: 'Deletion execution plan not found',
          },
        };
      }

      const plan: DeletionExecutionPlan = planRecord.plan_data;
      const tablesProcessed = [];
      let overallStatus = DeletionStatus.IN_PROGRESS;

      // Update plan status to executing
      await this.supabase
        .from('deletion_execution_plans')
        .update({ status: 'executing', execution_id: executionId })
        .eq('plan_id', planId);

      // Audit start of execution
      await this.auditLog({
        user_id: plan.user_id,
        action: 'deletion_execution_started',
        resource_type: 'deletion_execution',
        resource_id: executionId,
        details: {
          plan_id: planId,
          tables_count: plan.tables_to_process.length,
        },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'success',
      });

      // Execute deletion for each table in order
      for (const tableName of plan.execution_order) {
        const tableConfig = plan.tables_to_process.find(
          (t) => t.table_name === tableName,
        );
        if (!tableConfig) continue;

        try {
          const tableResult = await this.executeTableDeletion(
            tableConfig,
            plan.user_id,
            securityContext,
          );

          tablesProcessed.push(tableResult);

          // Audit individual table processing
          await this.auditLog({
            user_id: plan.user_id,
            action: 'table_deletion_completed',
            resource_type: 'table_deletion',
            resource_id: executionId,
            details: {
              table_name: tableName,
              records_processed:
                tableResult.records_deleted + tableResult.records_anonymized,
              deletion_strategy: tableConfig.deletion_strategy,
            },
            security_context: securityContext,
            timestamp: new Date(),
            result: tableResult.status === 'success' ? 'success' : 'failure',
          });
        } catch (error) {
          tablesProcessed.push({
            table_name: tableName,
            records_deleted: 0,
            records_anonymized: 0,
            status: 'failed' as const,
            error: error.message,
          });
        }
      }

      // Determine overall status
      const failedTables = tablesProcessed.filter((t) => t.status === 'failed');
      if (failedTables.length === 0) {
        overallStatus = DeletionStatus.COMPLETED;
      } else if (failedTables.length === tablesProcessed.length) {
        overallStatus = DeletionStatus.FAILED;
      } else {
        overallStatus = DeletionStatus.PARTIALLY_COMPLETED;
      }

      // Create verification hash
      const verificationData = {
        user_id: plan.user_id,
        execution_id: executionId,
        tables_processed: tablesProcessed,
        timestamp: new Date(),
      };
      const verificationHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(verificationData))
        .digest('hex');

      const deletionResult: DeletionResult = {
        user_id: plan.user_id,
        plan_id: planId,
        execution_id: executionId,
        status: overallStatus,
        started_at: new Date(startTime),
        completed_at: new Date(),
        tables_processed: tablesProcessed,
        verification_hash: verificationHash,
        audit_log_entries: [], // Would be populated with audit log IDs
      };

      // Store deletion result
      await this.supabase.from('deletion_results').insert({
        execution_id: executionId,
        plan_id: planId,
        user_id: plan.user_id,
        result_data: deletionResult,
        verification_hash: verificationHash,
        created_at: new Date().toISOString(),
      });

      // Update plan status
      await this.supabase
        .from('deletion_execution_plans')
        .update({
          status: overallStatus.toLowerCase(),
          completed_at: new Date().toISOString(),
        })
        .eq('plan_id', planId);

      // Final audit log
      await this.auditLog({
        user_id: plan.user_id,
        action: 'deletion_execution_completed',
        resource_type: 'deletion_execution',
        resource_id: executionId,
        details: {
          status: overallStatus,
          tables_processed: tablesProcessed.length,
          total_records_deleted: tablesProcessed.reduce(
            (sum, t) => sum + t.records_deleted,
            0,
          ),
          total_records_anonymized: tablesProcessed.reduce(
            (sum, t) => sum + t.records_anonymized,
            0,
          ),
          verification_hash: verificationHash,
        },
        security_context: securityContext,
        timestamp: new Date(),
        result:
          overallStatus === DeletionStatus.COMPLETED
            ? 'success'
            : overallStatus === DeletionStatus.FAILED
              ? 'failure'
              : 'partial',
      });

      return {
        success: true,
        data: deletionResult,
      };
    } catch (error) {
      await this.auditLog({
        user_id: 'unknown',
        action: 'deletion_execution_error',
        resource_type: 'deletion_execution',
        resource_id: planId,
        details: { error: error.message },
        security_context: securityContext,
        timestamp: new Date(),
        result: 'failure',
        error_message: error.message,
      });

      return {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'Failed to execute deletion plan',
          details: { error: error.message },
        },
      };
    }
  }

  /**
   * Execute deletion for individual table
   */
  private async executeTableDeletion(
    tableConfig: any,
    userId: string,
    securityContext: SecurityContext,
  ): Promise<{
    table_name: string;
    records_deleted: number;
    records_anonymized: number;
    status: 'success' | 'failed' | 'partial';
    error?: string;
  }> {
    try {
      const tableName = tableConfig.table_name;
      let recordsDeleted = 0;
      let recordsAnonymized = 0;

      switch (tableConfig.deletion_strategy) {
        case DeletionType.COMPLETE_ERASURE:
          // Hard delete all records
          const { count: deletedCount, error: deleteError } =
            await this.supabase
              .from(tableName)
              .delete({ count: 'exact' })
              .match(this.parseConditions(tableConfig.conditions));

          if (deleteError) throw deleteError;
          recordsDeleted = deletedCount || 0;
          break;

        case DeletionType.ANONYMIZATION:
          // Anonymize specific fields
          const anonymizationConfig = DELETION_CONFIGURATION.find(
            (c) => c.table_name === tableName,
          );
          if (anonymizationConfig?.anonymization_fields) {
            const anonymizationUpdates: Record<string, any> = {};

            for (const field of anonymizationConfig.anonymization_fields) {
              anonymizationUpdates[field] = this.generateAnonymizedValue(field);
            }

            const { count: anonymizedCount, error: anonymizeError } =
              await this.supabase
                .from(tableName)
                .update(anonymizationUpdates)
                .match(this.parseConditions(tableConfig.conditions));

            if (anonymizeError) throw anonymizeError;
            recordsAnonymized = anonymizedCount || 0;
          }
          break;

        case DeletionType.PSEUDONYMIZATION:
          // Replace with pseudonymized values
          const pseudoId = crypto
            .createHash('sha256')
            .update(userId + tableName + Date.now().toString())
            .digest('hex')
            .substring(0, 16);

          const { count: pseudoCount, error: pseudoError } = await this.supabase
            .from(tableName)
            .update({ user_id: pseudoId })
            .match(this.parseConditions(tableConfig.conditions));

          if (pseudoError) throw pseudoError;
          recordsAnonymized = pseudoCount || 0;
          break;

        case DeletionType.SOFT_DELETE:
          // Soft delete with deleted flag
          const { count: softDeleteCount, error: softDeleteError } =
            await this.supabase
              .from(tableName)
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by_gdpr: true,
              })
              .match(this.parseConditions(tableConfig.conditions));

          if (softDeleteError) throw softDeleteError;
          recordsDeleted = softDeleteCount || 0;
          break;
      }

      return {
        table_name: tableName,
        records_deleted: recordsDeleted,
        records_anonymized: recordsAnonymized,
        status: 'success',
      };
    } catch (error) {
      return {
        table_name: tableConfig.table_name,
        records_deleted: 0,
        records_anonymized: 0,
        status: 'failed',
        error: error.message,
      };
    }
  }

  /**
   * Analyze user data distribution across tables
   */
  private async analyzeUserDataDistribution(
    userId: string,
  ): Promise<Record<string, number>> {
    const distribution: Record<string, number> = {};

    for (const config of DELETION_CONFIGURATION) {
      try {
        const { count, error } = await this.supabase
          .from(config.table_name)
          .select('*', { count: 'exact', head: true })
          .eq(config.user_id_column, userId);

        if (!error) {
          distribution[config.table_name] = count || 0;
        }
      } catch (error) {
        // Table might not exist or access denied
        distribution[config.table_name] = 0;
      }
    }

    return distribution;
  }

  /**
   * Calculate execution order based on table dependencies
   */
  private calculateExecutionOrder(tables: any[]): string[] {
    const order: string[] = [];
    const processed = new Set<string>();
    const tableMap = new Map(tables.map((t) => [t.table_name, t]));

    const addToOrder = (tableName: string) => {
      if (processed.has(tableName)) return;

      const table = tableMap.get(tableName);
      if (!table) return;

      // Process dependencies first
      if (table.dependencies) {
        for (const dep of table.dependencies) {
          addToOrder(dep);
        }
      }

      order.push(tableName);
      processed.add(tableName);
    };

    for (const table of tables) {
      addToOrder(table.table_name);
    }

    return order;
  }

  /**
   * Estimate execution duration based on table sizes
   */
  private estimateExecutionDuration(tables: any[]): number {
    const totalRecords = tables.reduce(
      (sum, t) => sum + t.estimated_records,
      0,
    );
    // Estimate 1000 records per minute
    return Math.max(1, Math.ceil(totalRecords / 1000));
  }

  /**
   * Parse SQL-like conditions into Supabase filter format
   */
  private parseConditions(conditions: string): Record<string, any> {
    // Simple parser for "column = 'value'" format
    const match = conditions.match(/(\w+)\s*=\s*'([^']+)'/);
    if (match) {
      return { [match[1]]: match[2] };
    }
    return {};
  }

  /**
   * Generate anonymized values for different field types
   */
  private generateAnonymizedValue(fieldName: string): string {
    const fieldType = this.getFieldType(fieldName);
    const anonymizedId = crypto.randomBytes(4).toString('hex');

    switch (fieldType) {
      case 'name':
        return `Anonymized User ${anonymizedId}`;
      case 'email':
        return `anonymous.${anonymizedId}@anonymized.local`;
      case 'phone':
        return `+1555${anonymizedId.substring(0, 7)}`;
      case 'address':
        return `Anonymized Address ${anonymizedId}`;
      default:
        return `[ANONYMIZED-${anonymizedId}]`;
    }
  }

  /**
   * Determine field type for anonymization
   */
  private getFieldType(fieldName: string): string {
    const namePatter = /name|first|last|full/i;
    const emailPattern = /email|mail/i;
    const phonePattern = /phone|mobile|tel/i;
    const addressPattern = /address|street|city|postal|zip/i;

    if (namePattern.test(fieldName)) return 'name';
    if (emailPattern.test(fieldName)) return 'email';
    if (phonePattern.test(fieldName)) return 'phone';
    if (addressPattern.test(fieldName)) return 'address';

    return 'generic';
  }

  /**
   * Log audit trail for deletion operations
   */
  private async auditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<void> {
    try {
      await this.supabase.from('gdpr_audit_logs').insert({
        user_id: entry.user_id,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        details: entry.details,
        security_context: entry.security_context,
        timestamp: entry.timestamp.toISOString(),
        result: entry.result,
        error_message: entry.error_message,
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Get deletion plan status
   */
  async getDeletionPlanStatus(
    planId: string,
    userId: string,
  ): Promise<GDPRApiResponse<any>> {
    try {
      const { data: plan, error } = await this.supabase
        .from('deletion_execution_plans')
        .select('*')
        .eq('plan_id', planId)
        .eq('user_id', userId)
        .single();

      if (error || !plan) {
        return {
          success: false,
          error: {
            code: 'PLAN_NOT_FOUND',
            message: 'Deletion plan not found',
          },
        };
      }

      return {
        success: true,
        data: {
          plan_id: plan.plan_id,
          status: plan.status,
          created_at: plan.created_at,
          execution_id: plan.execution_id,
          completed_at: plan.completed_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Error retrieving plan status',
          details: { error: error.message },
        },
      };
    }
  }
}

// Fix for the namePattern typo
const namePattern = /name|first|last|full/i;

// ============================================================================
// Export default instance
// ============================================================================

export const deletionEngine = new DeletionEngine();
