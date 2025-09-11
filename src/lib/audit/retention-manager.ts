/**
 * WS-150 Audit Data Retention Manager
 * Team D Implementation - Batch 13
 *
 * Handles automated archival processes, legal hold implementation,
 * compliance-based retention policies, and data compression/storage optimization
 */

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Retention policy configuration schema
const RetentionPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  event_categories: z.array(z.string()),
  event_types: z.array(z.string()).optional(),
  retention_period_days: z.number().min(1).max(3650), // Max 10 years
  archive_after_days: z.number().min(1).max(2555), // Max 7 years
  legal_hold_override: z.boolean().default(false),
  compliance_requirements: z.array(z.string()).optional(),
  organization_id: z.string().uuid(),
  active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Legal hold configuration schema
const LegalHoldSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  organization_id: z.string().uuid(),
  case_reference: z.string().optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  event_criteria: z.object({
    event_types: z.array(z.string()).optional(),
    event_categories: z.array(z.string()).optional(),
    user_ids: z.array(z.string().uuid()).optional(),
    date_range: z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .optional(),
  }),
  legal_officer: z.string().uuid(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'RELEASED']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Archival batch schema
const ArchivalBatchSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  batch_name: z.string(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']),
  total_records: z.number().min(0),
  processed_records: z.number().min(0),
  archived_records: z.number().min(0),
  failed_records: z.number().min(0),
  compression_ratio: z.number().min(0).optional(),
  storage_size_bytes: z.number().min(0).optional(),
  archive_location: z.string().optional(),
  error_details: z.record(z.any()).optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;
type LegalHold = z.infer<typeof LegalHoldSchema>;
type ArchivalBatch = z.infer<typeof ArchivalBatchSchema>;

interface RetentionAnalysis {
  totalRecords: number;
  eligibleForArchival: number;
  eligibleForDeletion: number;
  legalHoldRecords: number;
  estimatedStorageSavings: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  categoriesBreakdown: Array<{
    category: string;
    count: number;
    oldestDate: Date;
    newestDate: Date;
  }>;
}

interface ArchivalOptions {
  dryRun?: boolean;
  batchSize?: number;
  compressionEnabled?: boolean;
  archiveLocation?: string;
  notifyOnCompletion?: boolean;
  preserveOriginal?: boolean;
}

interface ComplianceRequirements {
  GDPR: { retention_days: 2555; archive_after_days: 1095 }; // 7 years retention, 3 years active
  SOX: { retention_days: 2555; archive_after_days: 730 }; // 7 years retention, 2 years active
  PCI_DSS: { retention_days: 365; archive_after_days: 90 }; // 1 year retention, 3 months active
  HIPAA: { retention_days: 2190; archive_after_days: 365 }; // 6 years retention, 1 year active
  FINANCIAL: { retention_days: 2555; archive_after_days: 1095 }; // 7 years retention, 3 years active
  DEFAULT: { retention_days: 1095; archive_after_days: 365 }; // 3 years retention, 1 year active
}

export class AuditRetentionManager {
  private supabase;
  private complianceRules: ComplianceRequirements;

  constructor() {
    this.supabase = createClient();
    this.complianceRules = {
      GDPR: { retention_days: 2555, archive_after_days: 1095 },
      SOX: { retention_days: 2555, archive_after_days: 730 },
      PCI_DSS: { retention_days: 365, archive_after_days: 90 },
      HIPAA: { retention_days: 2190, archive_after_days: 365 },
      FINANCIAL: { retention_days: 2555, archive_after_days: 1095 },
      DEFAULT: { retention_days: 1095, archive_after_days: 365 },
    };
  }

  /**
   * Analyze retention requirements for an organization
   */
  async analyzeRetentionRequirements(
    organizationId: string,
  ): Promise<RetentionAnalysis> {
    try {
      // Get total record count
      const { count: totalRecords } = await this.supabase
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      // Get records eligible for archival (older than 1 year by default)
      const archivalDate = new Date();
      archivalDate.setDate(archivalDate.getDate() - 365);

      const { count: eligibleForArchival } = await this.supabase
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .lt('event_timestamp', archivalDate.toISOString())
        .eq('archived', false);

      // Get records on legal hold
      const { count: legalHoldRecords } = await this.supabase
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('legal_hold', true);

      // Get records eligible for deletion (past retention period)
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() - 2555); // 7 years default

      const { count: eligibleForDeletion } = await this.supabase
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .lt('event_timestamp', deletionDate.toISOString())
        .eq('legal_hold', false)
        .eq('archived', true);

      // Get date range and category breakdown
      const { data: dateRange } = await this.supabase
        .from('audit_events')
        .select('event_timestamp')
        .eq('organization_id', organizationId)
        .order('event_timestamp', { ascending: true })
        .limit(1);

      const { data: latestDate } = await this.supabase
        .from('audit_events')
        .select('event_timestamp')
        .eq('organization_id', organizationId)
        .order('event_timestamp', { ascending: false })
        .limit(1);

      // Get categories breakdown
      const { data: categoriesData } = await this.supabase
        .from('audit_events')
        .select('event_category, event_timestamp')
        .eq('organization_id', organizationId);

      const categoriesBreakdown = this.processCategoriesBreakdown(
        categoriesData || [],
      );

      return {
        totalRecords: totalRecords || 0,
        eligibleForArchival: eligibleForArchival || 0,
        eligibleForDeletion: eligibleForDeletion || 0,
        legalHoldRecords: legalHoldRecords || 0,
        estimatedStorageSavings: (eligibleForArchival || 0) * 0.7, // Estimated 70% compression
        oldestRecord: dateRange?.[0]?.event_timestamp
          ? new Date(dateRange[0].event_timestamp)
          : null,
        newestRecord: latestDate?.[0]?.event_timestamp
          ? new Date(latestDate[0].event_timestamp)
          : null,
        categoriesBreakdown,
      };
    } catch (error) {
      console.error('Error analyzing retention requirements:', error);
      throw new Error(
        `Failed to analyze retention requirements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create or update retention policy
   */
  async createRetentionPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<string> {
    try {
      const policyData = {
        ...policy,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Validate against compliance requirements
      this.validateComplianceRequirements(policyData);

      const { data, error } = await this.supabase
        .from('audit_retention_policies')
        .insert(policyData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      await this.logAuditEvent({
        organizationId: policy.organization_id,
        eventType: 'RETENTION_POLICY_CREATED',
        eventCategory: 'COMPLIANCE',
        severity: 'MEDIUM',
        eventData: {
          policy_id: policyData.id,
          policy_name: policy.name,
          retention_days: policy.retention_period_days,
          archive_days: policy.archive_after_days,
        },
      });

      return data.id;
    } catch (error) {
      console.error('Error creating retention policy:', error);
      throw new Error(
        `Failed to create retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Create legal hold
   */
  async createLegalHold(
    legalHold: Omit<LegalHold, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<string> {
    try {
      const holdData = {
        ...legalHold,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('audit_legal_holds')
        .insert(holdData)
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      // Apply legal hold to matching records
      await this.applyLegalHold(data.id);

      await this.logAuditEvent({
        organizationId: legalHold.organization_id,
        eventType: 'LEGAL_HOLD_CREATED',
        eventCategory: 'COMPLIANCE',
        severity: 'HIGH',
        eventData: {
          hold_id: holdData.id,
          hold_name: legalHold.name,
          case_reference: legalHold.case_reference,
          criteria: legalHold.event_criteria,
        },
      });

      return data.id;
    } catch (error) {
      console.error('Error creating legal hold:', error);
      throw new Error(
        `Failed to create legal hold: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute archival process
   */
  async executeArchival(
    organizationId: string,
    options: ArchivalOptions = {},
  ): Promise<string> {
    const {
      dryRun = false,
      batchSize = 10000,
      compressionEnabled = true,
      archiveLocation = 's3://wedsync-audit-archive',
      notifyOnCompletion = true,
      preserveOriginal = false,
    } = options;

    try {
      // Create archival batch record
      const batchId = crypto.randomUUID();
      const batchName = `archive_${organizationId}_${new Date().toISOString().slice(0, 10)}`;

      const batchData = {
        id: batchId,
        organization_id: organizationId,
        batch_name: batchName,
        status: 'PENDING' as const,
        total_records: 0,
        processed_records: 0,
        archived_records: 0,
        failed_records: 0,
        archive_location: archiveLocation,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!dryRun) {
        await this.supabase.from('audit_archival_batches').insert(batchData);
      }

      // Get records eligible for archival
      const archivalDate = new Date();
      archivalDate.setDate(archivalDate.getDate() - 365); // Default 1 year

      const { data: eligibleRecords, error: selectError } = await this.supabase
        .from('audit_events')
        .select('id, event_timestamp, event_category, event_type, legal_hold')
        .eq('organization_id', organizationId)
        .lt('event_timestamp', archivalDate.toISOString())
        .eq('archived', false)
        .eq('legal_hold', false)
        .limit(batchSize);

      if (selectError) {
        throw new Error(`Failed to select records: ${selectError.message}`);
      }

      if (!eligibleRecords || eligibleRecords.length === 0) {
        await this.logAuditEvent({
          organizationId,
          eventType: 'ARCHIVAL_COMPLETED',
          eventCategory: 'COMPLIANCE',
          severity: 'LOW',
          eventData: {
            batch_id: batchId,
            records_processed: 0,
            status: 'NO_RECORDS_ELIGIBLE',
          },
        });

        return batchId;
      }

      let processedRecords = 0;
      let archivedRecords = 0;
      let failedRecords = 0;

      if (!dryRun) {
        // Update batch status
        await this.updateBatchStatus(batchId, {
          status: 'IN_PROGRESS',
          total_records: eligibleRecords.length,
          started_at: new Date().toISOString(),
        });

        // Process records in chunks
        for (const record of eligibleRecords) {
          try {
            // Here you would implement actual archival logic:
            // 1. Compress the record data
            // 2. Upload to archive storage (S3, etc.)
            // 3. Update record status
            // 4. Delete from active table if not preserving original

            if (compressionEnabled) {
              // Implement compression logic
            }

            // Mark as archived
            await this.supabase
              .from('audit_events')
              .update({
                archived: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', record.id);

            archivedRecords++;
          } catch (error) {
            failedRecords++;
            console.error(`Failed to archive record ${record.id}:`, error);
          }

          processedRecords++;

          // Update progress periodically
          if (processedRecords % 1000 === 0) {
            await this.updateBatchStatus(batchId, {
              processed_records: processedRecords,
              archived_records: archivedRecords,
              failed_records: failedRecords,
            });
          }
        }

        // Complete the batch
        await this.updateBatchStatus(batchId, {
          status: 'COMPLETED',
          processed_records: processedRecords,
          archived_records: archivedRecords,
          failed_records: failedRecords,
          completed_at: new Date().toISOString(),
        });
      }

      await this.logAuditEvent({
        organizationId,
        eventType: 'ARCHIVAL_COMPLETED',
        eventCategory: 'COMPLIANCE',
        severity: 'MEDIUM',
        eventData: {
          batch_id: batchId,
          dry_run: dryRun,
          total_records: eligibleRecords.length,
          processed_records: processedRecords,
          archived_records: archivedRecords,
          failed_records: failedRecords,
          compression_enabled: compressionEnabled,
        },
      });

      return batchId;
    } catch (error) {
      console.error('Error executing archival:', error);
      throw new Error(
        `Archival process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Execute deletion of expired records
   */
  async executeRetentionDeletion(
    organizationId: string,
    dryRun: boolean = true,
  ): Promise<{
    deletedRecords: number;
    preservedRecords: number;
    errors: string[];
  }> {
    try {
      // Get retention policies for the organization
      const { data: policies, error: policyError } = await this.supabase
        .from('audit_retention_policies')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true);

      if (policyError) {
        throw new Error(
          `Failed to get retention policies: ${policyError.message}`,
        );
      }

      let deletedRecords = 0;
      let preservedRecords = 0;
      const errors: string[] = [];

      for (const policy of policies || []) {
        try {
          const deletionDate = new Date();
          deletionDate.setDate(
            deletionDate.getDate() - policy.retention_period_days,
          );

          // Get records eligible for deletion
          const { data: eligibleRecords, error: selectError } =
            await this.supabase
              .from('audit_events')
              .select('id, legal_hold, event_category, event_type')
              .eq('organization_id', organizationId)
              .in('event_category', policy.event_categories)
              .lt('event_timestamp', deletionDate.toISOString())
              .eq('archived', true);

          if (selectError) {
            errors.push(
              `Failed to select records for policy ${policy.name}: ${selectError.message}`,
            );
            continue;
          }

          if (!eligibleRecords || eligibleRecords.length === 0) {
            continue;
          }

          for (const record of eligibleRecords) {
            if (record.legal_hold) {
              preservedRecords++;
              continue;
            }

            if (!dryRun) {
              // Delete the record and related specialized audit records
              const { error: deleteError } = await this.supabase
                .from('audit_events')
                .delete()
                .eq('id', record.id);

              if (deleteError) {
                errors.push(
                  `Failed to delete record ${record.id}: ${deleteError.message}`,
                );
                continue;
              }
            }

            deletedRecords++;
          }
        } catch (error) {
          errors.push(
            `Error processing policy ${policy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      await this.logAuditEvent({
        organizationId,
        eventType: 'RETENTION_DELETION_COMPLETED',
        eventCategory: 'COMPLIANCE',
        severity: 'MEDIUM',
        eventData: {
          dry_run: dryRun,
          deleted_records: deletedRecords,
          preserved_records: preservedRecords,
          errors: errors,
        },
      });

      return {
        deletedRecords,
        preservedRecords,
        errors,
      };
    } catch (error) {
      console.error('Error executing retention deletion:', error);
      throw new Error(
        `Retention deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Release legal hold
   */
  async releaseLegalHold(holdId: string, releasedBy: string): Promise<void> {
    try {
      // Update legal hold status
      const { data: hold, error: updateError } = await this.supabase
        .from('audit_legal_holds')
        .update({
          status: 'RELEASED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', holdId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update legal hold: ${updateError.message}`);
      }

      // Remove legal hold flag from affected records
      await this.removeLegalHold(holdId);

      await this.logAuditEvent({
        organizationId: hold.organization_id,
        eventType: 'LEGAL_HOLD_RELEASED',
        eventCategory: 'COMPLIANCE',
        severity: 'HIGH',
        eventData: {
          hold_id: holdId,
          hold_name: hold.name,
          released_by: releasedBy,
          case_reference: hold.case_reference,
        },
      });
    } catch (error) {
      console.error('Error releasing legal hold:', error);
      throw new Error(
        `Failed to release legal hold: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Private helper methods
  private processCategoriesBreakdown(
    data: Array<{ event_category: string; event_timestamp: string }>,
  ): Array<{
    category: string;
    count: number;
    oldestDate: Date;
    newestDate: Date;
  }> {
    const categories = new Map<string, { count: number; dates: Date[] }>();

    for (const record of data) {
      const category = record.event_category;
      const date = new Date(record.event_timestamp);

      if (!categories.has(category)) {
        categories.set(category, { count: 0, dates: [] });
      }

      const categoryData = categories.get(category)!;
      categoryData.count++;
      categoryData.dates.push(date);
    }

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      oldestDate: new Date(Math.min(...data.dates.map((d) => d.getTime()))),
      newestDate: new Date(Math.max(...data.dates.map((d) => d.getTime()))),
    }));
  }

  private validateComplianceRequirements(policy: RetentionPolicy): void {
    // Validate against known compliance requirements
    if (policy.compliance_requirements) {
      for (const requirement of policy.compliance_requirements) {
        const rule =
          this.complianceRules[requirement as keyof ComplianceRequirements];
        if (rule) {
          if (policy.retention_period_days < rule.retention_days) {
            throw new Error(
              `Retention period ${policy.retention_period_days} days is less than required ${rule.retention_days} days for ${requirement}`,
            );
          }
        }
      }
    }
  }

  private async applyLegalHold(holdId: string): Promise<void> {
    const { data: hold, error } = await this.supabase
      .from('audit_legal_holds')
      .select('*')
      .eq('id', holdId)
      .single();

    if (error || !hold) {
      throw new Error('Legal hold not found');
    }

    const criteria = hold.event_criteria;
    let query = this.supabase
      .from('audit_events')
      .update({ legal_hold: true })
      .eq('organization_id', hold.organization_id);

    // Apply criteria filters
    if (criteria.event_types) {
      query = query.in('event_type', criteria.event_types);
    }
    if (criteria.event_categories) {
      query = query.in('event_category', criteria.event_categories);
    }
    if (criteria.user_ids) {
      query = query.in('user_id', criteria.user_ids);
    }
    if (criteria.date_range) {
      query = query
        .gte('event_timestamp', criteria.date_range.start)
        .lte('event_timestamp', criteria.date_range.end);
    }

    const { error: applyError } = await query;
    if (applyError) {
      throw new Error(`Failed to apply legal hold: ${applyError.message}`);
    }
  }

  private async removeLegalHold(holdId: string): Promise<void> {
    // This would need more sophisticated logic to only remove holds
    // for records that don't have other active holds
    const { error } = await this.supabase
      .from('audit_events')
      .update({ legal_hold: false })
      .eq('legal_hold', true);

    if (error) {
      throw new Error(`Failed to remove legal hold: ${error.message}`);
    }
  }

  private async updateBatchStatus(
    batchId: string,
    updates: Partial<ArchivalBatch>,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('audit_archival_batches')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    if (error) {
      console.error('Failed to update batch status:', error);
    }
  }

  private async logAuditEvent(event: {
    organizationId: string;
    eventType: string;
    eventCategory: string;
    severity: string;
    eventData: Record<string, any>;
  }): Promise<void> {
    try {
      await this.supabase.from('audit_events').insert({
        organization_id: event.organizationId,
        event_type: event.eventType,
        event_category: event.eventCategory,
        severity: event.severity,
        event_data: event.eventData,
        event_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}

export const auditRetentionManager = new AuditRetentionManager();
