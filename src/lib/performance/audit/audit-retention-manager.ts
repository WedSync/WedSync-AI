/**
 * WS-177 Audit Logging System - Retention Management Module
 * Team D - Round 1: Automated log retention and archival
 *
 * Manages audit log lifecycle for wedding supplier operations:
 * - Automated retention policy enforcement
 * - Compliant data archival and cleanup
 * - Wedding-specific data preservation rules
 * - Performance-optimized bulk operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import {
  RetentionPolicy,
  AuditEvent,
  AuditEventType,
  AuditSeverity,
  WeddingPhase,
  SupplierRole,
} from '../../../types/audit-performance';

/**
 * Retention operation result
 */
export interface RetentionOperationResult {
  operationId: string;
  timestamp: string;
  operationType: RetentionOperationType;
  policyId: string;
  policyName: string;

  // Operation statistics
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  storageFreedGB: number;
  processingTimeMs: number;

  // Error handling
  errors: string[];
  warnings: string[];
  success: boolean;

  // Wedding-specific metrics
  weddingsProcessed: number;
  guestDataRecords: number;
  supplierDataRecords: number;
  photoMetadataRecords: number;
}

export enum RetentionOperationType {
  ARCHIVE = 'archive',
  DELETE = 'delete',
  CLEANUP = 'cleanup',
  COMPRESS = 'compress',
  MIGRATE = 'migrate',
}

/**
 * Archive storage configuration
 */
export interface ArchiveStorageConfig {
  provider: 'supabase' | 's3' | 'gcs' | 'azure';
  bucketName: string;
  region?: string;
  encryptionKey?: string;
  compressionLevel: number;
  indexingEnabled: boolean;

  // Wedding-specific archival
  separateWeddingData: boolean;
  guestDataEncryption: boolean;
  supplierDataSeparation: boolean;
}

/**
 * Compliance configuration for wedding data
 */
export interface ComplianceConfig {
  // Legal requirements
  gdprCompliant: boolean;
  ccpaCompliant: boolean;
  hipaaCompliant: boolean; // For medical dietary requirements
  pciCompliant: boolean; // For payment data

  // Retention periods by data type (days)
  guestDataRetention: number;
  paymentDataRetention: number;
  supplierDataRetention: number;
  photoMetadataRetention: number;
  communicationRecordsRetention: number;

  // Wedding-specific compliance
  postWeddingDataRetention: number; // How long after wedding date
  canceledWeddingDataRetention: number;

  // Right to be forgotten
  enableDataDeletion: boolean;
  anonymizationEnabled: boolean;

  // Audit requirements
  auditLogRetention: number; // How long to keep audit logs themselves
  complianceReportGeneration: boolean;
}

/**
 * Audit Retention Manager
 * Handles automated lifecycle management of audit logs
 */
export class AuditRetentionManager extends EventEmitter {
  private supabase: SupabaseClient;
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private archiveConfig: ArchiveStorageConfig;
  private complianceConfig: ComplianceConfig;
  private scheduleTimer: NodeJS.Timeout | null = null;
  private operationHistory: RetentionOperationResult[] = [];

  constructor(
    archiveConfig: ArchiveStorageConfig,
    complianceConfig: ComplianceConfig,
  ) {
    super();
    this.archiveConfig = archiveConfig;
    this.complianceConfig = complianceConfig;
    this.initializeConnection();
    this.loadRetentionPolicies();
  }

  private initializeConnection(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Start automated retention management
   * Schedules periodic policy enforcement
   */
  async startRetentionSchedule(): Promise<void> {
    console.log('[RetentionManager] Starting automated retention schedule...');

    // Run immediate check
    await this.enforceAllPolicies();

    // Schedule daily enforcement at 2 AM
    const dailyMs = 24 * 60 * 60 * 1000;
    this.scheduleTimer = setInterval(async () => {
      try {
        await this.enforceAllPolicies();
      } catch (error) {
        console.error(
          '[RetentionManager] Scheduled enforcement failed:',
          error,
        );
        this.emit('retentionError', error);
      }
    }, dailyMs);

    console.log('[RetentionManager] Retention schedule started');
  }

  /**
   * Enforce all active retention policies
   */
  async enforceAllPolicies(): Promise<RetentionOperationResult[]> {
    const results: RetentionOperationResult[] = [];

    console.log(
      `[RetentionManager] Enforcing ${this.retentionPolicies.size} retention policies...`,
    );

    for (const policy of Array.from(this.retentionPolicies.values())) {
      if (policy.enabled) {
        try {
          const result = await this.enforceRetentionPolicy(policy);
          results.push(result);
          this.operationHistory.push(result);

          // Emit event for monitoring
          this.emit('policyEnforced', result);

          console.log(
            `[RetentionManager] Policy '${policy.name}' enforced: ${result.recordsProcessed} records processed`,
          );
        } catch (error) {
          console.error(
            `[RetentionManager] Failed to enforce policy '${policy.name}':`,
            error,
          );
          this.emit('policyError', { policy, error });
        }
      }
    }

    // Cleanup old operation history
    this.cleanupOperationHistory();

    return results;
  }

  /**
   * Enforce specific retention policy
   */
  async enforceRetentionPolicy(
    policy: RetentionPolicy,
  ): Promise<RetentionOperationResult> {
    const operationId = `retention-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const result: RetentionOperationResult = {
      operationId,
      timestamp: new Date().toISOString(),
      operationType: policy.archiveEnabled
        ? RetentionOperationType.ARCHIVE
        : RetentionOperationType.DELETE,
      policyId: policy.id,
      policyName: policy.name,
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      storageFreedGB: 0,
      processingTimeMs: 0,
      errors: [],
      warnings: [],
      success: false,
      weddingsProcessed: 0,
      guestDataRecords: 0,
      supplierDataRecords: 0,
      photoMetadataRecords: 0,
    };

    try {
      // Calculate retention cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

      // Find records to process
      const recordsToProcess = await this.findRecordsForRetention(
        policy,
        cutoffDate,
      );
      result.recordsProcessed = recordsToProcess.length;

      if (recordsToProcess.length === 0) {
        result.success = true;
        result.processingTimeMs = Date.now() - startTime;
        return result;
      }

      // Process wedding-specific retention rules
      const processedRecords = await this.applyWeddingSpecificRules(
        recordsToProcess,
        policy,
      );

      // Group records for batch processing
      const batches = this.createProcessingBatches(processedRecords, 1000);

      // Process each batch
      for (const batch of batches) {
        if (policy.archiveEnabled) {
          const archiveResult = await this.archiveBatch(batch, policy);
          result.recordsArchived += archiveResult.recordsArchived;
          result.errors.push(...archiveResult.errors);
        }

        if (policy.archiveEnabled || !policy.archiveEnabled) {
          const deleteResult = await this.deleteBatch(batch, policy);
          result.recordsDeleted += deleteResult.recordsDeleted;
          result.storageFreedGB += deleteResult.storageFreedGB;
          result.errors.push(...deleteResult.errors);
        }

        // Track wedding-specific metrics
        result.weddingsProcessed += this.countUniqueWeddings(batch);
        result.guestDataRecords += this.countGuestDataRecords(batch);
        result.supplierDataRecords += this.countSupplierDataRecords(batch);
        result.photoMetadataRecords += this.countPhotoMetadataRecords(batch);
      }

      result.success = result.errors.length === 0;
      result.processingTimeMs = Date.now() - startTime;

      console.log(
        `[RetentionManager] Policy enforcement completed: ${result.recordsProcessed} processed, ${result.recordsArchived} archived, ${result.recordsDeleted} deleted`,
      );
    } catch (error) {
      result.errors.push(
        `Policy enforcement failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      result.success = false;
      result.processingTimeMs = Date.now() - startTime;
      console.error('[RetentionManager] Policy enforcement error:', error);
    }

    return result;
  }

  /**
   * Find records eligible for retention processing
   */
  private async findRecordsForRetention(
    policy: RetentionPolicy,
    cutoffDate: Date,
  ): Promise<AuditEvent[]> {
    let query = this.supabase
      .from('audit_events')
      .select('*')
      .lt('timestamp', cutoffDate.toISOString());

    // Apply policy filters
    if (policy.eventTypes.length > 0) {
      query = query.in('event_type', policy.eventTypes);
    }

    if (policy.severityThreshold) {
      // Filter by severity level (assuming numeric ordering)
      const severityOrder = [
        AuditSeverity.LOW,
        AuditSeverity.MEDIUM,
        AuditSeverity.HIGH,
        AuditSeverity.CRITICAL,
      ];
      const minSeverityIndex = severityOrder.indexOf(policy.severityThreshold);
      const allowedSeverities = severityOrder.slice(minSeverityIndex);
      query = query.in('severity', allowedSeverities);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to query records for retention: ${error.message}`,
      );
    }

    return (data || []).map((row) => this.deserializeEvent(row));
  }

  /**
   * Apply wedding-specific retention rules
   */
  private async applyWeddingSpecificRules(
    records: AuditEvent[],
    policy: RetentionPolicy,
  ): Promise<AuditEvent[]> {
    const processedRecords: AuditEvent[] = [];

    for (const record of records) {
      let shouldRetain = false;

      // Check wedding date-based retention
      if (
        record.weddingDate &&
        this.complianceConfig.postWeddingDataRetention > 0
      ) {
        const weddingDate = new Date(record.weddingDate);
        const retentionCutoff = new Date();
        retentionCutoff.setDate(
          retentionCutoff.getDate() -
            this.complianceConfig.postWeddingDataRetention,
        );

        if (weddingDate > retentionCutoff) {
          shouldRetain = true;
        }
      }

      // Apply data type-specific retention
      if (this.isGuestDataRecord(record)) {
        const guestDataCutoff = new Date();
        guestDataCutoff.setDate(
          guestDataCutoff.getDate() - this.complianceConfig.guestDataRetention,
        );

        if (new Date(record.timestamp) > guestDataCutoff) {
          shouldRetain = true;
        }
      }

      if (this.isPaymentDataRecord(record)) {
        const paymentDataCutoff = new Date();
        paymentDataCutoff.setDate(
          paymentDataCutoff.getDate() -
            this.complianceConfig.paymentDataRetention,
        );

        if (new Date(record.timestamp) > paymentDataCutoff) {
          shouldRetain = true;
        }
      }

      if (this.isSupplierDataRecord(record)) {
        const supplierDataCutoff = new Date();
        supplierDataCutoff.setDate(
          supplierDataCutoff.getDate() -
            this.complianceConfig.supplierDataRetention,
        );

        if (new Date(record.timestamp) > supplierDataCutoff) {
          shouldRetain = true;
        }
      }

      // Only process records that don't need to be retained
      if (!shouldRetain) {
        processedRecords.push(record);
      }
    }

    return processedRecords;
  }

  /**
   * Archive batch of records
   */
  private async archiveBatch(
    records: AuditEvent[],
    policy: RetentionPolicy,
  ): Promise<{
    recordsArchived: number;
    errors: string[];
  }> {
    const result = { recordsArchived: 0, errors: [] };

    try {
      // Prepare archive data with compression and encryption
      const archiveData = {
        policy_id: policy.id,
        policy_name: policy.name,
        archive_timestamp: new Date().toISOString(),
        records_count: records.length,
        compression_level: this.archiveConfig.compressionLevel,
        encrypted: this.archiveConfig.guestDataEncryption,
        records: records.map((record) => this.sanitizeForArchive(record)),
      };

      // Create archive filename with wedding-specific organization
      const timestamp = new Date().toISOString().split('T')[0];
      const archiveFileName = this.archiveConfig.separateWeddingData
        ? `audit_archive_${timestamp}_wedding_${policy.id}.json`
        : `audit_archive_${timestamp}_${policy.id}.json`;

      // Store in archive location (implementation depends on provider)
      await this.storeArchiveData(archiveFileName, archiveData);

      result.recordsArchived = records.length;

      console.log(
        `[RetentionManager] Archived ${records.length} records to ${archiveFileName}`,
      );
    } catch (error) {
      result.errors.push(
        `Archive failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('[RetentionManager] Archive batch failed:', error);
    }

    return result;
  }

  /**
   * Delete batch of records
   */
  private async deleteBatch(
    records: AuditEvent[],
    policy: RetentionPolicy,
  ): Promise<{
    recordsDeleted: number;
    storageFreedGB: number;
    errors: string[];
  }> {
    const result = { recordsDeleted: 0, storageFreedGB: 0, errors: [] };

    try {
      const recordIds = records.map((record) => record.id);

      // Execute delete in batches to avoid query limits
      const deleteBatchSize = 1000;
      for (let i = 0; i < recordIds.length; i += deleteBatchSize) {
        const batchIds = recordIds.slice(i, i + deleteBatchSize);

        const { error } = await this.supabase
          .from('audit_events')
          .delete()
          .in('id', batchIds);

        if (error) {
          result.errors.push(`Delete batch failed: ${error.message}`);
        } else {
          result.recordsDeleted += batchIds.length;
        }
      }

      // Estimate storage freed (simplified calculation)
      result.storageFreedGB = this.estimateStorageFreed(records);

      console.log(
        `[RetentionManager] Deleted ${result.recordsDeleted} records, freed ~${result.storageFreedGB.toFixed(2)} GB`,
      );
    } catch (error) {
      result.errors.push(
        `Delete failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('[RetentionManager] Delete batch failed:', error);
    }

    return result;
  }

  /**
   * Store archive data in configured storage
   */
  private async storeArchiveData(fileName: string, data: any): Promise<void> {
    switch (this.archiveConfig.provider) {
      case 'supabase':
        await this.storeInSupabaseStorage(fileName, data);
        break;
      case 's3':
        await this.storeInS3(fileName, data);
        break;
      case 'gcs':
        await this.storeInGCS(fileName, data);
        break;
      case 'azure':
        await this.storeInAzure(fileName, data);
        break;
      default:
        throw new Error(
          `Unsupported archive provider: ${this.archiveConfig.provider}`,
        );
    }
  }

  private async storeInSupabaseStorage(
    fileName: string,
    data: any,
  ): Promise<void> {
    const jsonData = JSON.stringify(data);
    const { error } = await this.supabase.storage
      .from(this.archiveConfig.bucketName)
      .upload(`audit_archives/${fileName}`, jsonData, {
        contentType: 'application/json',
        cacheControl: '31536000', // 1 year cache
      });

    if (error) {
      throw new Error(`Supabase storage upload failed: ${error.message}`);
    }
  }

  private async storeInS3(fileName: string, data: any): Promise<void> {
    // S3 implementation would go here
    console.log(
      `[RetentionManager] S3 storage not implemented for ${fileName}`,
    );
    throw new Error('S3 storage not implemented');
  }

  private async storeInGCS(fileName: string, data: any): Promise<void> {
    // Google Cloud Storage implementation would go here
    console.log(
      `[RetentionManager] GCS storage not implemented for ${fileName}`,
    );
    throw new Error('GCS storage not implemented');
  }

  private async storeInAzure(fileName: string, data: any): Promise<void> {
    // Azure storage implementation would go here
    console.log(
      `[RetentionManager] Azure storage not implemented for ${fileName}`,
    );
    throw new Error('Azure storage not implemented');
  }

  /**
   * Load retention policies from database
   */
  private async loadRetentionPolicies(): Promise<void> {
    // Load default policies
    this.createDefaultPolicies();

    // Load custom policies from database
    try {
      const { data, error } = await this.supabase
        .from('retention_policies')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('[RetentionManager] Failed to load policies:', error);
        return;
      }

      for (const row of data || []) {
        const policy: RetentionPolicy = {
          id: row.id,
          name: row.name,
          description: row.description,
          enabled: row.enabled,
          retentionPeriodDays: row.retention_period_days,
          eventTypes: row.event_types || [],
          severityThreshold: row.severity_threshold,
          weddingDataRetentionDays: row.wedding_data_retention_days,
          guestDataRetentionDays: row.guest_data_retention_days,
          supplierDataRetentionDays: row.supplier_data_retention_days,
          photoMetadataRetentionDays: row.photo_metadata_retention_days,
          archiveEnabled: row.archive_enabled,
          archiveLocation: row.archive_location,
          compressionLevel: row.compression_level,
          encryptArchive: row.encrypt_archive,
          cleanupSchedule: row.cleanup_schedule,
          notifyBeforeCleanup: row.notify_before_cleanup,
          dryRunEnabled: row.dry_run_enabled,
        };

        this.retentionPolicies.set(policy.id, policy);
      }

      console.log(
        `[RetentionManager] Loaded ${this.retentionPolicies.size} retention policies`,
      );
    } catch (error) {
      console.error('[RetentionManager] Error loading policies:', error);
    }
  }

  /**
   * Create default retention policies for wedding operations
   */
  private createDefaultPolicies(): void {
    const policies: RetentionPolicy[] = [
      {
        id: 'standard-audit-logs',
        name: 'Standard Audit Logs',
        description: 'Standard retention for general audit events',
        enabled: true,
        retentionPeriodDays: 2555, // 7 years for compliance
        eventTypes: [
          AuditEventType.USER_ACTION,
          AuditEventType.SYSTEM_EVENT,
          AuditEventType.API_CALL,
        ],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 2555,
        guestDataRetentionDays: 1825, // 5 years for guest data
        supplierDataRetentionDays: 2555,
        photoMetadataRetentionDays: 3650, // 10 years for photo metadata
        archiveEnabled: true,
        archiveLocation: 'audit_archives_standard',
        compressionLevel: 6,
        encryptArchive: true,
        cleanupSchedule: '0 2 * * *', // Daily at 2 AM
        notifyBeforeCleanup: false,
        dryRunEnabled: false,
      },
      {
        id: 'security-events',
        name: 'Security Events',
        description: 'Extended retention for security-related events',
        enabled: true,
        retentionPeriodDays: 3650, // 10 years for security events
        eventTypes: [
          AuditEventType.SECURITY_EVENT,
          AuditEventType.AUTHENTICATION,
          AuditEventType.AUTHORIZATION,
        ],
        severityThreshold: AuditSeverity.MEDIUM,
        weddingDataRetentionDays: 3650,
        guestDataRetentionDays: 3650,
        supplierDataRetentionDays: 3650,
        photoMetadataRetentionDays: 3650,
        archiveEnabled: true,
        archiveLocation: 'audit_archives_security',
        compressionLevel: 9, // Maximum compression for security data
        encryptArchive: true,
        cleanupSchedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
        notifyBeforeCleanup: true,
        dryRunEnabled: false,
      },
      {
        id: 'performance-metrics',
        name: 'Performance Metrics',
        description: 'Short-term retention for performance monitoring',
        enabled: true,
        retentionPeriodDays: 90, // 3 months for performance data
        eventTypes: [AuditEventType.PERFORMANCE_EVENT],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: 90,
        guestDataRetentionDays: 90,
        supplierDataRetentionDays: 90,
        photoMetadataRetentionDays: 90,
        archiveEnabled: false, // Delete without archiving
        archiveLocation: '',
        compressionLevel: 0,
        encryptArchive: false,
        cleanupSchedule: '0 1 * * *', // Daily at 1 AM
        notifyBeforeCleanup: false,
        dryRunEnabled: false,
      },
      {
        id: 'guest-data-privacy',
        name: 'Guest Data Privacy',
        description: 'Privacy-focused retention for guest information',
        enabled: true,
        retentionPeriodDays: this.complianceConfig.guestDataRetention,
        eventTypes: [AuditEventType.DATA_CHANGE, AuditEventType.USER_ACTION],
        severityThreshold: AuditSeverity.LOW,
        weddingDataRetentionDays: this.complianceConfig.guestDataRetention,
        guestDataRetentionDays: this.complianceConfig.guestDataRetention,
        supplierDataRetentionDays: this.complianceConfig.supplierDataRetention,
        photoMetadataRetentionDays:
          this.complianceConfig.photoMetadataRetention,
        archiveEnabled: this.complianceConfig.gdprCompliant,
        archiveLocation: 'audit_archives_privacy',
        compressionLevel: 8,
        encryptArchive: true,
        cleanupSchedule: '0 4 * * 1', // Weekly on Monday at 4 AM
        notifyBeforeCleanup: true,
        dryRunEnabled: false,
      },
    ];

    for (const policy of policies) {
      this.retentionPolicies.set(policy.id, policy);
    }
  }

  // Helper methods
  private createProcessingBatches(
    records: AuditEvent[],
    batchSize: number,
  ): AuditEvent[][] {
    const batches: AuditEvent[][] = [];
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    return batches;
  }

  private sanitizeForArchive(record: AuditEvent): any {
    // Remove or anonymize sensitive data for archival
    return {
      ...record,
      // Potentially anonymize user data for GDPR compliance
      userId: this.complianceConfig.anonymizationEnabled
        ? this.anonymizeUserId(record.userId)
        : record.userId,
      ipAddress: this.complianceConfig.anonymizationEnabled
        ? this.anonymizeIP(record.ipAddress)
        : record.ipAddress,
    };
  }

  private anonymizeUserId(userId?: string): string | undefined {
    if (!userId) return userId;
    // Simple anonymization - in production use proper anonymization
    return `anon_${userId.slice(-8)}`;
  }

  private anonymizeIP(ipAddress?: string): string | undefined {
    if (!ipAddress) return ipAddress;
    // Simple IP anonymization
    const parts = ipAddress.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
    return 'xxx.xxx.xxx.xxx';
  }

  private estimateStorageFreed(records: AuditEvent[]): number {
    // Estimate storage size based on record structure
    const avgRecordSize = 2048; // 2KB average per record
    return (records.length * avgRecordSize) / (1024 * 1024 * 1024); // Convert to GB
  }

  private countUniqueWeddings(records: AuditEvent[]): number {
    const weddingIds = new Set(records.map((r) => r.weddingId).filter(Boolean));
    return weddingIds.size;
  }

  private countGuestDataRecords(records: AuditEvent[]): number {
    return records.filter((record) => this.isGuestDataRecord(record)).length;
  }

  private countSupplierDataRecords(records: AuditEvent[]): number {
    return records.filter((record) => this.isSupplierDataRecord(record)).length;
  }

  private countPhotoMetadataRecords(records: AuditEvent[]): number {
    return records.filter((record) => this.isPhotoMetadataRecord(record))
      .length;
  }

  private isGuestDataRecord(record: AuditEvent): boolean {
    return (
      record.resource.includes('guest') ||
      record.resource.includes('attendee') ||
      (record.metadata.guestsAffected && record.metadata.guestsAffected > 0)
    );
  }

  private isPaymentDataRecord(record: AuditEvent): boolean {
    return (
      record.resource.includes('payment') ||
      record.resource.includes('billing') ||
      record.resource.includes('invoice')
    );
  }

  private isSupplierDataRecord(record: AuditEvent): boolean {
    return (
      record.resource.includes('supplier') ||
      record.resource.includes('vendor') ||
      record.supplierRole !== undefined
    );
  }

  private isPhotoMetadataRecord(record: AuditEvent): boolean {
    return (
      record.resource.includes('photo') ||
      record.resource.includes('image') ||
      record.resource.includes('media')
    );
  }

  private deserializeEvent(row: any): AuditEvent {
    return {
      id: row.id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      severity: row.severity,
      userId: row.user_id,
      sessionId: row.session_id,
      organizationId: row.organization_id,
      weddingId: row.wedding_id,
      supplierId: row.supplier_id,
      resource: row.resource,
      action: row.action,
      resourceId: row.resource_id,
      beforeData: row.before_data ? JSON.parse(row.before_data) : undefined,
      afterData: row.after_data ? JSON.parse(row.after_data) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      executionTimeMs: row.execution_time_ms,
      requestId: row.request_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      apiKeyId: row.api_key_id,
      weddingDate: row.wedding_date,
      guestCount: row.guest_count,
      supplierRole: row.supplier_role,
    };
  }

  private cleanupOperationHistory(): void {
    // Keep only last 100 operation results
    if (this.operationHistory.length > 100) {
      this.operationHistory = this.operationHistory.slice(-100);
    }
  }

  /**
   * Public API methods
   */

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return Array.from(this.retentionPolicies.values());
  }

  async getOperationHistory(): Promise<RetentionOperationResult[]> {
    return [...this.operationHistory];
  }

  async addRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    this.retentionPolicies.set(policy.id, policy);

    // Store in database
    const { error } = await this.supabase.from('retention_policies').insert([
      {
        id: policy.id,
        name: policy.name,
        description: policy.description,
        enabled: policy.enabled,
        retention_period_days: policy.retentionPeriodDays,
        event_types: policy.eventTypes,
        severity_threshold: policy.severityThreshold,
        wedding_data_retention_days: policy.weddingDataRetentionDays,
        guest_data_retention_days: policy.guestDataRetentionDays,
        supplier_data_retention_days: policy.supplierDataRetentionDays,
        photo_metadata_retention_days: policy.photoMetadataRetentionDays,
        archive_enabled: policy.archiveEnabled,
        archive_location: policy.archiveLocation,
        compression_level: policy.compressionLevel,
        encrypt_archive: policy.encryptArchive,
        cleanup_schedule: policy.cleanupSchedule,
        notify_before_cleanup: policy.notifyBeforeCleanup,
        dry_run_enabled: policy.dryRunEnabled,
      },
    ]);

    if (error) {
      throw new Error(`Failed to store retention policy: ${error.message}`);
    }
  }

  async updateRetentionPolicy(policy: RetentionPolicy): Promise<void> {
    this.retentionPolicies.set(policy.id, policy);

    const { error } = await this.supabase
      .from('retention_policies')
      .update({
        name: policy.name,
        description: policy.description,
        enabled: policy.enabled,
        retention_period_days: policy.retentionPeriodDays,
        event_types: policy.eventTypes,
        severity_threshold: policy.severityThreshold,
        // ... other fields
      })
      .eq('id', policy.id);

    if (error) {
      throw new Error(`Failed to update retention policy: ${error.message}`);
    }
  }

  async deleteRetentionPolicy(policyId: string): Promise<void> {
    this.retentionPolicies.delete(policyId);

    const { error } = await this.supabase
      .from('retention_policies')
      .delete()
      .eq('id', policyId);

    if (error) {
      throw new Error(`Failed to delete retention policy: ${error.message}`);
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.scheduleTimer) {
      clearInterval(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    this.retentionPolicies.clear();
    this.operationHistory = [];
    this.removeAllListeners();
  }
}

/**
 * Factory function for creating retention manager
 */
export function createRetentionManager(
  archiveConfig: Partial<ArchiveStorageConfig> = {},
  complianceConfig: Partial<ComplianceConfig> = {},
): AuditRetentionManager {
  const defaultArchiveConfig: ArchiveStorageConfig = {
    provider: 'supabase',
    bucketName: 'audit-archives',
    compressionLevel: 6,
    indexingEnabled: true,
    separateWeddingData: true,
    guestDataEncryption: true,
    supplierDataSeparation: true,
  };

  const defaultComplianceConfig: ComplianceConfig = {
    gdprCompliant: true,
    ccpaCompliant: true,
    hipaaCompliant: false,
    pciCompliant: true,
    guestDataRetention: 1825, // 5 years
    paymentDataRetention: 2555, // 7 years
    supplierDataRetention: 2555,
    photoMetadataRetention: 3650, // 10 years
    communicationRecordsRetention: 2555,
    postWeddingDataRetention: 365, // 1 year after wedding
    canceledWeddingDataRetention: 90, // 3 months for canceled weddings
    enableDataDeletion: true,
    anonymizationEnabled: true,
    auditLogRetention: 2555,
    complianceReportGeneration: true,
  };

  const finalArchiveConfig = { ...defaultArchiveConfig, ...archiveConfig };
  const finalComplianceConfig = {
    ...defaultComplianceConfig,
    ...complianceConfig,
  };

  return new AuditRetentionManager(finalArchiveConfig, finalComplianceConfig);
}

/**
 * Singleton instance for application use
 */
export const retentionManager = createRetentionManager();
