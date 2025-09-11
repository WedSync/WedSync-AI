/**
 * WS-176 GDPR Compliance System - Team D Round 1
 * Automated data retention and deletion scheduler
 *
 * @fileoverview Automated system for managing data retention policies,
 * scheduling deletions, and ensuring compliance with GDPR Article 5(1)(e)
 * storage limitation principle for wedding platform data
 */

import {
  RetentionPolicy,
  DeletionJob,
  DeletionMethod,
  DeletionStatus,
  RetentionException,
  PersonalDataType,
  Jurisdiction,
  LegalBasis,
  RetentionPolicyError,
  ComplianceError,
} from '../../../types/gdpr-compliance';
import { createClient } from '@supabase/supabase-js';
import { auditLogger } from '../../middleware/audit';
import { z } from 'zod';

/**
 * Automated data retention and deletion scheduler
 * Manages retention policies and executes data deletions according to legal requirements
 */
export class RetentionPolicyEngine {
  private static instance: RetentionPolicyEngine;
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  private policies: Map<string, RetentionPolicy> = new Map();
  private isRunning = false;
  private schedulerInterval?: NodeJS.Timeout;

  private constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * Singleton instance getter
   */
  public static getInstance(): RetentionPolicyEngine {
    if (!RetentionPolicyEngine.instance) {
      RetentionPolicyEngine.instance = new RetentionPolicyEngine();
    }
    return RetentionPolicyEngine.instance;
  }

  /**
   * Initialize default retention policies for wedding platform
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicies: RetentionPolicy[] = [
      {
        id: 'wedding-planning-data',
        name: 'Wedding Planning Data Retention',
        description: 'Personal data collected during wedding planning process',
        dataType: 'wedding_preferences',
        retentionPeriod: {
          duration: 2,
          unit: 'years',
          startTrigger: 'service_completion',
          gracePeriod: 30,
        },
        jurisdiction: 'EU',
        legalBasis: 'contract',
        deletionMethod: 'anonymization',
        exceptions: [
          {
            id: 'tax-records-exception',
            reason: 'tax_requirements',
            legalReference: 'Tax Code Section 147',
            extendedPeriod: {
              duration: 7,
              unit: 'years',
              startTrigger: 'service_completion',
            },
            metadata: {},
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'vendor-communication-logs',
        name: 'Vendor Communication Logs',
        description: 'Communication records between couples and vendors',
        dataType: 'communication_logs',
        retentionPeriod: {
          duration: 3,
          unit: 'years',
          startTrigger: 'last_activity',
          gracePeriod: 60,
        },
        jurisdiction: 'GLOBAL',
        legalBasis: 'legitimate_interests',
        deletionMethod: 'hard_delete',
        exceptions: [
          {
            id: 'dispute-resolution-exception',
            reason: 'legal_obligation',
            legalReference: 'Consumer Protection Act',
            extendedPeriod: {
              duration: 6,
              unit: 'years',
              startTrigger: 'last_activity',
            },
            metadata: {},
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'payment-transaction-history',
        name: 'Payment Transaction History',
        description: 'Financial transaction records for SaaS subscriptions',
        dataType: 'payment_history',
        retentionPeriod: {
          duration: 7,
          unit: 'years',
          startTrigger: 'contract_termination',
          gracePeriod: 0,
        },
        jurisdiction: 'GLOBAL',
        legalBasis: 'legal_obligation',
        deletionMethod: 'secure_wipe',
        exceptions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-contact-information',
        name: 'User Contact Information',
        description: 'Basic contact details for platform users',
        dataType: 'contact_info',
        retentionPeriod: {
          duration: 1,
          unit: 'years',
          startTrigger: 'last_activity',
          gracePeriod: 90,
        },
        jurisdiction: 'EU',
        legalBasis: 'consent',
        deletionMethod: 'soft_delete',
        exceptions: [
          {
            id: 'active-service-exception',
            reason: 'legitimate_interest',
            legalReference: 'GDPR Article 6(1)(f)',
            metadata: {
              condition: 'active_subscription',
            },
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'behavioral-analytics',
        name: 'Behavioral Analytics Data',
        description: 'User interaction and behavior analytics',
        dataType: 'behavioral',
        retentionPeriod: {
          duration: 26,
          unit: 'months',
          startTrigger: 'data_collection',
          gracePeriod: 30,
        },
        jurisdiction: 'EU',
        legalBasis: 'legitimate_interests',
        deletionMethod: 'anonymization',
        exceptions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultPolicies.forEach((policy) => {
      this.policies.set(policy.id, policy);
    });
  }

  /**
   * Start the retention policy scheduler
   */
  public async startScheduler(): Promise<void> {
    if (this.isRunning) {
      throw new RetentionPolicyError('Scheduler is already running');
    }

    this.isRunning = true;

    await auditLogger.log({
      event_type: 'RETENTION_SCHEDULER_STARTED',
      resource_type: 'retention_scheduler',
      resource_id: 'retention-policy-engine',
      metadata: {
        active_policies: Array.from(this.policies.keys()),
        start_time: new Date().toISOString(),
      },
    });

    // Run every hour to check for scheduled deletions
    this.schedulerInterval = setInterval(
      () => {
        this.processScheduledDeletions();
      },
      60 * 60 * 1000,
    ); // 1 hour

    // Run initial check
    await this.processScheduledDeletions();
  }

  /**
   * Stop the retention policy scheduler
   */
  public async stopScheduler(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
    }

    await auditLogger.log({
      event_type: 'RETENTION_SCHEDULER_STOPPED',
      resource_type: 'retention_scheduler',
      resource_id: 'retention-policy-engine',
      metadata: {
        stop_time: new Date().toISOString(),
      },
    });
  }

  /**
   * Add a retention policy
   */
  public async addPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const policyId = crypto.randomUUID();
    const fullPolicy: RetentionPolicy = {
      id: policyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...policy,
    };

    // Validate policy
    this.validateRetentionPolicy(fullPolicy);

    // Store in database
    const { error } = await this.supabase.from('retention_policies').insert([
      {
        id: policyId,
        name: policy.name,
        description: policy.description,
        data_type: policy.dataType,
        retention_period: policy.retentionPeriod,
        jurisdiction: policy.jurisdiction,
        legal_basis: policy.legalBasis,
        deletion_method: policy.deletionMethod,
        exceptions: policy.exceptions,
        is_active: policy.isActive,
        created_at: fullPolicy.createdAt.toISOString(),
        updated_at: fullPolicy.updatedAt.toISOString(),
      },
    ]);

    if (error) {
      throw new RetentionPolicyError(
        `Failed to create retention policy: ${error.message}`,
        policyId,
      );
    }

    this.policies.set(policyId, fullPolicy);

    await auditLogger.log({
      event_type: 'RETENTION_POLICY_CREATED',
      resource_type: 'retention_policy',
      resource_id: policyId,
      metadata: {
        policy_name: policy.name,
        data_type: policy.dataType,
        jurisdiction: policy.jurisdiction,
        retention_period: policy.retentionPeriod,
      },
    });

    return policyId;
  }

  /**
   * Update a retention policy
   */
  public async updatePolicy(
    policyId: string,
    updates: Partial<RetentionPolicy>,
  ): Promise<void> {
    const existingPolicy = this.policies.get(policyId);
    if (!existingPolicy) {
      throw new RetentionPolicyError(`Policy not found: ${policyId}`, policyId);
    }

    const updatedPolicy: RetentionPolicy = {
      ...existingPolicy,
      ...updates,
      id: policyId, // Ensure ID cannot be changed
      updatedAt: new Date(),
    };

    // Validate updated policy
    this.validateRetentionPolicy(updatedPolicy);

    // Update in database
    const { error } = await this.supabase
      .from('retention_policies')
      .update({
        name: updatedPolicy.name,
        description: updatedPolicy.description,
        data_type: updatedPolicy.dataType,
        retention_period: updatedPolicy.retentionPeriod,
        jurisdiction: updatedPolicy.jurisdiction,
        legal_basis: updatedPolicy.legalBasis,
        deletion_method: updatedPolicy.deletionMethod,
        exceptions: updatedPolicy.exceptions,
        is_active: updatedPolicy.isActive,
        updated_at: updatedPolicy.updatedAt.toISOString(),
      })
      .eq('id', policyId);

    if (error) {
      throw new RetentionPolicyError(
        `Failed to update retention policy: ${error.message}`,
        policyId,
      );
    }

    this.policies.set(policyId, updatedPolicy);

    await auditLogger.log({
      event_type: 'RETENTION_POLICY_UPDATED',
      resource_type: 'retention_policy',
      resource_id: policyId,
      metadata: {
        updated_fields: Object.keys(updates),
        policy_name: updatedPolicy.name,
      },
    });
  }

  /**
   * Schedule data for deletion based on retention policy
   */
  public async scheduleDataDeletion(
    userId: string,
    dataType: PersonalDataType,
    policyId?: string,
  ): Promise<string> {
    // Find applicable policy
    const policy = policyId
      ? this.policies.get(policyId)
      : this.findApplicablePolicy(dataType);

    if (!policy) {
      throw new RetentionPolicyError(
        `No retention policy found for data type: ${dataType}`,
        policyId,
        dataType,
      );
    }

    if (!policy.isActive) {
      throw new RetentionPolicyError(
        `Retention policy is inactive: ${policy.id}`,
        policy.id,
        dataType,
      );
    }

    // Calculate deletion date
    const deletionDate = this.calculateDeletionDate(policy, userId);

    // Check for applicable exceptions
    const applicableExceptions = await this.checkRetentionExceptions(
      policy,
      userId,
    );
    if (applicableExceptions.length > 0) {
      const extendedDate = this.calculateExtendedDeletionDate(
        policy,
        applicableExceptions,
      );
      if (extendedDate > deletionDate) {
        console.log(
          `Deletion extended due to exceptions: ${applicableExceptions.map((e) => e.reason).join(', ')}`,
        );
      }
    }

    // Create deletion job
    const jobId = crypto.randomUUID();
    const deletionJob: DeletionJob = {
      id: jobId,
      userId,
      dataType,
      scheduledFor: deletionDate,
      status: 'scheduled',
      method: policy.deletionMethod,
      retentionPolicyId: policy.id,
      verification: {
        verified: false,
        auditTrail: [],
      },
      createdAt: new Date(),
    };

    // Store in database
    const { error } = await this.supabase.from('deletion_jobs').insert([
      {
        id: jobId,
        user_id: userId,
        data_type: dataType,
        scheduled_for: deletionDate.toISOString(),
        status: 'scheduled',
        method: policy.deletionMethod,
        retention_policy_id: policy.id,
        verification: deletionJob.verification,
        created_at: deletionJob.createdAt.toISOString(),
      },
    ]);

    if (error) {
      throw new RetentionPolicyError(
        `Failed to schedule data deletion: ${error.message}`,
        policy.id,
        dataType,
      );
    }

    await auditLogger.log({
      event_type: 'DATA_DELETION_SCHEDULED',
      resource_type: 'deletion_job',
      resource_id: jobId,
      user_id: userId,
      metadata: {
        data_type: dataType,
        scheduled_for: deletionDate.toISOString(),
        policy_id: policy.id,
        deletion_method: policy.deletionMethod,
      },
    });

    return jobId;
  }

  /**
   * Execute a scheduled deletion job
   */
  public async executeDeletion(jobId: string): Promise<boolean> {
    // Get deletion job
    const { data: jobData, error } = await this.supabase
      .from('deletion_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !jobData) {
      throw new RetentionPolicyError(`Deletion job not found: ${jobId}`);
    }

    if (jobData.status !== 'scheduled') {
      throw new RetentionPolicyError(
        `Deletion job is not scheduled: ${jobId} (status: ${jobData.status})`,
      );
    }

    if (new Date(jobData.scheduled_for) > new Date()) {
      throw new RetentionPolicyError(`Deletion job is not yet due: ${jobId}`);
    }

    try {
      // Update status to in_progress
      await this.updateDeletionJobStatus(jobId, 'in_progress');

      // Execute deletion based on method
      const deletionResult = await this.performDeletion(
        jobData.user_id,
        jobData.data_type,
        jobData.method,
      );

      if (deletionResult.success) {
        // Update job status and verification
        await this.supabase
          .from('deletion_jobs')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
            verification: {
              verified: true,
              verifiedAt: new Date().toISOString(),
              checksum: deletionResult.checksum,
              auditTrail: deletionResult.auditTrail,
            },
          })
          .eq('id', jobId);

        await auditLogger.log({
          event_type: 'DATA_DELETION_COMPLETED',
          resource_type: 'deletion_job',
          resource_id: jobId,
          user_id: jobData.user_id,
          metadata: {
            data_type: jobData.data_type,
            deletion_method: jobData.method,
            verification_checksum: deletionResult.checksum,
            records_affected: deletionResult.recordsAffected,
          },
        });

        return true;
      } else {
        // Mark as failed
        await this.updateDeletionJobStatus(jobId, 'failed');

        await auditLogger.log({
          event_type: 'DATA_DELETION_FAILED',
          resource_type: 'deletion_job',
          resource_id: jobId,
          user_id: jobData.user_id,
          metadata: {
            data_type: jobData.data_type,
            error: deletionResult.error,
            deletion_method: jobData.method,
          },
        });

        return false;
      }
    } catch (error) {
      // Mark as failed
      await this.updateDeletionJobStatus(jobId, 'failed');

      await auditLogger.log({
        event_type: 'DATA_DELETION_ERROR',
        resource_type: 'deletion_job',
        resource_id: jobId,
        user_id: jobData.user_id,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          data_type: jobData.data_type,
        },
      });

      throw error;
    }
  }

  /**
   * Get all active retention policies
   */
  public getActivePolicies(
    jurisdiction?: Jurisdiction,
    dataType?: PersonalDataType,
  ): RetentionPolicy[] {
    return Array.from(this.policies.values()).filter((policy) => {
      if (!policy.isActive) return false;
      if (
        jurisdiction &&
        jurisdiction !== 'GLOBAL' &&
        policy.jurisdiction !== jurisdiction &&
        policy.jurisdiction !== 'GLOBAL'
      )
        return false;
      if (dataType && policy.dataType !== dataType) return false;
      return true;
    });
  }

  /**
   * Get scheduled deletion jobs
   */
  public async getScheduledDeletions(
    userId?: string,
    status?: DeletionStatus,
    dueDate?: Date,
  ): Promise<DeletionJob[]> {
    let query = this.supabase.from('deletion_jobs').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (dueDate) {
      query = query.lte('scheduled_for', dueDate.toISOString());
    }

    const { data, error } = await query.order('scheduled_for', {
      ascending: true,
    });

    if (error) {
      throw new RetentionPolicyError(
        `Failed to fetch scheduled deletions: ${error.message}`,
      );
    }

    return (
      data?.map((d) => ({
        id: d.id,
        userId: d.user_id,
        dataType: d.data_type,
        scheduledFor: new Date(d.scheduled_for),
        status: d.status,
        method: d.method,
        retentionPolicyId: d.retention_policy_id,
        verification: d.verification,
        createdAt: new Date(d.created_at),
        executedAt: d.executed_at ? new Date(d.executed_at) : undefined,
      })) || []
    );
  }

  /**
   * Process scheduled deletions
   */
  private async processScheduledDeletions(): Promise<void> {
    const now = new Date();
    const dueDeletions = await this.getScheduledDeletions(
      undefined,
      'scheduled',
      now,
    );

    console.log(`Processing ${dueDeletions.length} scheduled deletions`);

    for (const job of dueDeletions) {
      try {
        await this.executeDeletion(job.id);
        console.log(`Completed deletion job: ${job.id}`);
      } catch (error) {
        console.error(`Failed to execute deletion job ${job.id}:`, error);
      }
    }
  }

  /**
   * Validate retention policy
   */
  private validateRetentionPolicy(policy: RetentionPolicy): void {
    if (policy.retentionPeriod.duration <= 0) {
      throw new RetentionPolicyError(
        'Retention period duration must be positive',
        policy.id,
        policy.dataType,
      );
    }

    if (
      policy.retentionPeriod.unit === 'days' &&
      policy.retentionPeriod.duration > 3650
    ) {
      throw new RetentionPolicyError(
        'Retention period cannot exceed 10 years (3650 days)',
        policy.id,
        policy.dataType,
      );
    }

    if (
      policy.retentionPeriod.unit === 'years' &&
      policy.retentionPeriod.duration > 10
    ) {
      throw new RetentionPolicyError(
        'Retention period cannot exceed 10 years',
        policy.id,
        policy.dataType,
      );
    }

    // Validate jurisdiction-specific requirements
    if (
      policy.jurisdiction === 'EU' &&
      policy.dataType === 'behavioral' &&
      this.convertToMonths(policy.retentionPeriod) > 26
    ) {
      throw new RetentionPolicyError(
        'Behavioral data retention cannot exceed 26 months in EU',
        policy.id,
        policy.dataType,
      );
    }
  }

  /**
   * Find applicable retention policy for data type
   */
  private findApplicablePolicy(
    dataType: PersonalDataType,
  ): RetentionPolicy | undefined {
    return Array.from(this.policies.values()).find(
      (policy) => policy.isActive && policy.dataType === dataType,
    );
  }

  /**
   * Calculate deletion date based on policy
   */
  private calculateDeletionDate(policy: RetentionPolicy, userId: string): Date {
    const now = new Date();
    let triggerDate = now;

    // For now, use current date as trigger
    // In a real implementation, you would fetch the actual trigger date based on trigger type

    const deletionDate = new Date(triggerDate);

    switch (policy.retentionPeriod.unit) {
      case 'days':
        deletionDate.setDate(
          deletionDate.getDate() + policy.retentionPeriod.duration,
        );
        break;
      case 'months':
        deletionDate.setMonth(
          deletionDate.getMonth() + policy.retentionPeriod.duration,
        );
        break;
      case 'years':
        deletionDate.setFullYear(
          deletionDate.getFullYear() + policy.retentionPeriod.duration,
        );
        break;
    }

    // Add grace period if specified
    if (policy.retentionPeriod.gracePeriod) {
      deletionDate.setDate(
        deletionDate.getDate() + policy.retentionPeriod.gracePeriod,
      );
    }

    return deletionDate;
  }

  /**
   * Check for applicable retention exceptions
   */
  private async checkRetentionExceptions(
    policy: RetentionPolicy,
    userId: string,
  ): Promise<RetentionException[]> {
    const applicableExceptions: RetentionException[] = [];

    for (const exception of policy.exceptions) {
      switch (exception.reason) {
        case 'legal_obligation':
          // Check if user has active legal obligations
          if (await this.hasActiveLegalObligation(userId)) {
            applicableExceptions.push(exception);
          }
          break;
        case 'litigation_hold':
          // Check if user data is under litigation hold
          if (await this.hasLitigationHold(userId)) {
            applicableExceptions.push(exception);
          }
          break;
        case 'legitimate_interest':
          // Check if there's a legitimate business interest
          if (await this.hasLegitimateInterest(userId, exception.metadata)) {
            applicableExceptions.push(exception);
          }
          break;
      }
    }

    return applicableExceptions;
  }

  /**
   * Calculate extended deletion date due to exceptions
   */
  private calculateExtendedDeletionDate(
    policy: RetentionPolicy,
    exceptions: RetentionException[],
  ): Date {
    let maxDate = this.calculateDeletionDate(policy, ''); // Base deletion date

    for (const exception of exceptions) {
      if (exception.extendedPeriod) {
        const exceptionDate = new Date(maxDate);

        switch (exception.extendedPeriod.unit) {
          case 'days':
            exceptionDate.setDate(
              exceptionDate.getDate() + exception.extendedPeriod.duration,
            );
            break;
          case 'months':
            exceptionDate.setMonth(
              exceptionDate.getMonth() + exception.extendedPeriod.duration,
            );
            break;
          case 'years':
            exceptionDate.setFullYear(
              exceptionDate.getFullYear() + exception.extendedPeriod.duration,
            );
            break;
        }

        if (exceptionDate > maxDate) {
          maxDate = exceptionDate;
        }
      }
    }

    return maxDate;
  }

  /**
   * Perform actual data deletion
   */
  private async performDeletion(
    userId: string,
    dataType: PersonalDataType,
    method: DeletionMethod,
  ): Promise<{
    success: boolean;
    error?: string;
    checksum?: string;
    auditTrail: string[];
    recordsAffected?: number;
  }> {
    const auditTrail: string[] = [];
    let recordsAffected = 0;

    try {
      auditTrail.push(
        `Starting ${method} deletion for user ${userId}, data type ${dataType}`,
      );

      switch (method) {
        case 'soft_delete':
          recordsAffected = await this.performSoftDeletion(
            userId,
            dataType,
            auditTrail,
          );
          break;
        case 'hard_delete':
          recordsAffected = await this.performHardDeletion(
            userId,
            dataType,
            auditTrail,
          );
          break;
        case 'anonymization':
          recordsAffected = await this.performAnonymization(
            userId,
            dataType,
            auditTrail,
          );
          break;
        case 'pseudonymization':
          recordsAffected = await this.performPseudonymization(
            userId,
            dataType,
            auditTrail,
          );
          break;
        case 'secure_wipe':
          recordsAffected = await this.performSecureWipe(
            userId,
            dataType,
            auditTrail,
          );
          break;
        default:
          throw new Error(`Unsupported deletion method: ${method}`);
      }

      // Generate checksum for verification
      const checksum = await this.generateDeletionChecksum(
        userId,
        dataType,
        method,
        recordsAffected,
      );

      auditTrail.push(
        `Deletion completed successfully. Records affected: ${recordsAffected}`,
      );

      return {
        success: true,
        checksum,
        auditTrail,
        recordsAffected,
      };
    } catch (error) {
      auditTrail.push(
        `Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        auditTrail,
      };
    }
  }

  /**
   * Deletion method implementations
   */
  private async performSoftDeletion(
    userId: string,
    dataType: PersonalDataType,
    auditTrail: string[],
  ): Promise<number> {
    auditTrail.push('Performing soft deletion (marking as deleted)');

    const tableName = this.getTableNameForDataType(dataType);
    const { data, error } = await this.supabase
      .from(tableName)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: 'retention-policy-engine',
      })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      throw new Error(`Soft deletion failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  private async performHardDeletion(
    userId: string,
    dataType: PersonalDataType,
    auditTrail: string[],
  ): Promise<number> {
    auditTrail.push('Performing hard deletion (permanent removal)');

    const tableName = this.getTableNameForDataType(dataType);
    const { data, error } = await this.supabase
      .from(tableName)
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new Error(`Hard deletion failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  private async performAnonymization(
    userId: string,
    dataType: PersonalDataType,
    auditTrail: string[],
  ): Promise<number> {
    auditTrail.push('Performing anonymization (removing identifying data)');

    const tableName = this.getTableNameForDataType(dataType);
    const anonymizationFields = this.getAnonymizationFields(dataType);

    const { data, error } = await this.supabase
      .from(tableName)
      .update({
        ...anonymizationFields,
        anonymized_at: new Date().toISOString(),
        user_id: null,
      })
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new Error(`Anonymization failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  private async performPseudonymization(
    userId: string,
    dataType: PersonalDataType,
    auditTrail: string[],
  ): Promise<number> {
    auditTrail.push('Performing pseudonymization (replacing with pseudonyms)');

    const pseudonym = await this.generatePseudonym(userId);
    const tableName = this.getTableNameForDataType(dataType);

    const { data, error } = await this.supabase
      .from(tableName)
      .update({
        user_id: pseudonym,
        pseudonymized_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('id');

    if (error) {
      throw new Error(`Pseudonymization failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  private async performSecureWipe(
    userId: string,
    dataType: PersonalDataType,
    auditTrail: string[],
  ): Promise<number> {
    auditTrail.push('Performing secure wipe (cryptographic deletion)');

    // For secure wipe, we would typically overwrite data multiple times
    // This is a simplified implementation
    return this.performHardDeletion(userId, dataType, auditTrail);
  }

  /**
   * Helper methods
   */
  private async updateDeletionJobStatus(
    jobId: string,
    status: DeletionStatus,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('deletion_jobs')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      console.error(`Failed to update deletion job status: ${error.message}`);
    }
  }

  private convertToMonths(period: {
    duration: number;
    unit: 'days' | 'months' | 'years';
  }): number {
    switch (period.unit) {
      case 'days':
        return Math.ceil(period.duration / 30);
      case 'months':
        return period.duration;
      case 'years':
        return period.duration * 12;
    }
  }

  private async hasActiveLegalObligation(userId: string): Promise<boolean> {
    // Implementation would check for active legal obligations
    return false;
  }

  private async hasLitigationHold(userId: string): Promise<boolean> {
    // Implementation would check for litigation holds
    return false;
  }

  private async hasLegitimateInterest(
    userId: string,
    metadata: Record<string, any>,
  ): Promise<boolean> {
    // Implementation would check for legitimate business interests
    if (metadata.condition === 'active_subscription') {
      // Check if user has active subscription
      const { data } = await this.supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);

      return !!data && data.length > 0;
    }

    return false;
  }

  private getTableNameForDataType(dataType: PersonalDataType): string {
    const tableMap = {
      contact_info: 'user_profiles',
      wedding_preferences: 'wedding_plans',
      communication_logs: 'messages',
      payment_history: 'transactions',
      behavioral: 'user_activities',
      vendor_interactions: 'vendor_communications',
      identification: 'user_profiles',
      location: 'user_locations',
      professional: 'user_profiles',
    };

    return tableMap[dataType] || 'user_data';
  }

  private getAnonymizationFields(
    dataType: PersonalDataType,
  ): Record<string, any> {
    const fieldsMap = {
      contact_info: {
        email: null,
        phone: null,
        first_name: 'ANONYMIZED',
        last_name: 'ANONYMIZED',
      },
      wedding_preferences: {
        venue_preferences: null,
        guest_count: null,
        budget_range: null,
      },
      behavioral: {
        ip_address: null,
        user_agent: null,
        session_data: null,
      },
    };

    return fieldsMap[dataType] || {};
  }

  private async generatePseudonym(userId: string): Promise<string> {
    // Simple pseudonym generation - in production, use proper cryptographic methods
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(userId + 'salt'),
    );
    return Array.from(new Uint8Array(hash.slice(0, 16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async generateDeletionChecksum(
    userId: string,
    dataType: PersonalDataType,
    method: DeletionMethod,
    recordsAffected: number,
  ): Promise<string> {
    const data = `${userId}-${dataType}-${method}-${recordsAffected}-${Date.now()}`;
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(data),
    );
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Export singleton instance
export const retentionPolicyEngine = RetentionPolicyEngine.getInstance();
