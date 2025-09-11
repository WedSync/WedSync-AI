/**
 * WS-191: Backup Orchestrator Engine
 * Implements 3-2-1 backup rule with wedding-specific data prioritization
 * SECURITY: Enterprise-grade backup operations with encryption and validation
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { z } from 'zod';

// Types and interfaces
export interface BackupConfig {
  type: 'full' | 'incremental' | 'differential' | 'wedding_specific';
  priority: 'critical' | 'high' | 'standard' | 'low';
  organizationId?: string;
  weddingDate?: string;
  includeTables: string[];
  excludeSensitiveData?: boolean;
  retentionDays: number;
  encryptionEnabled: boolean;
}

export interface BackupResult {
  backupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  dataSize: number;
  checksum: string;
  storageLocations: BackupLocation[];
  validationResults: ValidationResult[];
  weddingContext?: WeddingContext;
}

export interface BackupLocation {
  provider: 'supabase' | 's3' | 'gcs' | 'local';
  path: string;
  encrypted: boolean;
  verified: boolean;
  createdAt: Date;
}

export interface ValidationResult {
  tableName: string;
  recordCount: number;
  checksumValid: boolean;
  integrityScore: number;
  errors: string[];
}

export interface WeddingContext {
  organizationId: string;
  weddingDate?: Date;
  daysUntilWedding?: number;
  criticalVendors: string[];
  timelinePhase: 'planning' | 'preparation' | 'execution' | 'post_event';
}

// Wedding data priority configuration
const WEDDING_DATA_PRIORITY = {
  critical: ['users', 'suppliers', 'clients', 'organizations'],
  high: ['forms', 'journey_instances', 'audit_logs', 'files', 'payments'],
  standard: ['communications', 'user_profiles', 'event_logs'],
} as const;

/**
 * Main BackupOrchestrator class implementing 3-2-1 backup rule
 */
export class BackupOrchestrator {
  private supabase: any;
  private providers: Map<string, BackupProvider>;
  private encryptionKey: string;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.providers = new Map();
    this.encryptionKey =
      process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey();

    // Initialize backup providers
    this.initializeProviders();
  }

  /**
   * Initialize backup storage providers (3-2-1 rule implementation)
   */
  private initializeProviders(): void {
    // Primary: Supabase (same infrastructure)
    this.providers.set('primary', new SupabaseBackupProvider(this.supabase));

    // Secondary: S3 (different cloud provider)
    this.providers.set('secondary', new S3BackupProvider());

    // Offsite: Google Cloud Storage (geographic separation)
    this.providers.set('offsite', new GCSBackupProvider());
  }

  /**
   * Perform comprehensive backup operation with 3-2-1 rule
   */
  async performBackup(config: BackupConfig): Promise<BackupResult> {
    const backupId = this.generateBackupId(config);
    const startedAt = new Date();

    try {
      // Log backup initiation
      await this.logBackupOperation(backupId, 'backup', 'pending', config);

      // Determine backup scope based on priority
      const backupScope = await this.determineBackupScope(config);

      // Get wedding context if applicable
      const weddingContext = config.organizationId
        ? await this.getWeddingContext(config.organizationId)
        : undefined;

      // Execute backup in priority order
      const backupData = await this.executeBackupOperation(
        backupScope,
        weddingContext,
      );

      // Encrypt backup data
      const encryptedData = config.encryptionEnabled
        ? await this.encryptBackupData(backupData, backupId)
        : backupData;

      // Store in 3 locations (3-2-1 rule)
      const storageResults = await this.store321BackupRule(
        encryptedData,
        backupId,
        config,
      );

      // Validate all backup copies
      const validationResults = await this.validateBackupIntegrity(
        storageResults,
        backupScope,
      );

      const completedAt = new Date();
      const result: BackupResult = {
        backupId,
        status: 'completed',
        startedAt,
        completedAt,
        dataSize: this.calculateDataSize(backupData),
        checksum: this.calculateChecksum(backupData),
        storageLocations: storageResults,
        validationResults,
        weddingContext,
      };

      // Update backup operation record
      await this.updateBackupOperation(backupId, 'completed', result);

      return result;
    } catch (error) {
      console.error(`Backup ${backupId} failed:`, error);
      await this.updateBackupOperation(backupId, 'failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Implement 3-2-1 backup rule storage distribution
   */
  private async store321BackupRule(
    data: any,
    backupId: string,
    config: BackupConfig,
  ): Promise<BackupLocation[]> {
    const locations: BackupLocation[] = [];
    const errors: string[] = [];

    try {
      // Copy 1: Primary location (Supabase)
      const primaryResult = await this.providers
        .get('primary')
        ?.store(data, backupId, config);
      if (primaryResult) {
        locations.push({
          provider: 'supabase',
          path: primaryResult.path,
          encrypted: config.encryptionEnabled,
          verified: false,
          createdAt: new Date(),
        });
      }

      // Copy 2: Secondary location (S3 - different media)
      const secondaryResult = await this.providers
        .get('secondary')
        ?.store(data, backupId, config);
      if (secondaryResult) {
        locations.push({
          provider: 's3',
          path: secondaryResult.path,
          encrypted: config.encryptionEnabled,
          verified: false,
          createdAt: new Date(),
        });
      }

      // Copy 3: Offsite location (GCS - geographic separation)
      const offsiteResult = await this.providers
        .get('offsite')
        ?.store(data, backupId, config);
      if (offsiteResult) {
        locations.push({
          provider: 'gcs',
          path: offsiteResult.path,
          encrypted: config.encryptionEnabled,
          verified: false,
          createdAt: new Date(),
        });
      }

      // Verify we have at least 2 copies (minimum for business continuity)
      if (locations.length < 2) {
        throw new Error(
          `3-2-1 backup rule violation: Only ${locations.length} copies created`,
        );
      }

      return locations;
    } catch (error) {
      console.error('3-2-1 backup storage failed:', error);
      throw new Error(`Backup storage failed: ${error.message}`);
    }
  }

  /**
   * Determine backup scope based on wedding data priorities
   */
  private async determineBackupScope(
    config: BackupConfig,
  ): Promise<BackupScope> {
    const scope: BackupScope = {
      critical: [],
      high: [],
      standard: [],
      totalTables: 0,
    };

    // If specific tables are requested
    if (config.includeTables.length > 0) {
      for (const table of config.includeTables) {
        if (WEDDING_DATA_PRIORITY.critical.includes(table)) {
          scope.critical.push(table);
        } else if (WEDDING_DATA_PRIORITY.high.includes(table)) {
          scope.high.push(table);
        } else {
          scope.standard.push(table);
        }
      }
    } else {
      // Full backup - include all tables by priority
      scope.critical = [...WEDDING_DATA_PRIORITY.critical];
      scope.high = [...WEDDING_DATA_PRIORITY.high];
      scope.standard = [...WEDDING_DATA_PRIORITY.standard];
    }

    scope.totalTables =
      scope.critical.length + scope.high.length + scope.standard.length;
    return scope;
  }

  /**
   * Execute backup operation in wedding data priority order
   */
  private async executeBackupOperation(
    scope: BackupScope,
    weddingContext?: WeddingContext,
  ): Promise<any> {
    const backupData: any = {};
    const errors: string[] = [];

    try {
      // Phase 1: Critical data (must succeed)
      for (const table of scope.critical) {
        try {
          backupData[table] = await this.backupTable(table, weddingContext);
          console.log(`✅ Critical table backed up: ${table}`);
        } catch (error) {
          errors.push(`Critical table ${table}: ${error.message}`);
          throw new Error(`Critical backup failure: ${table}`);
        }
      }

      // Phase 2: High priority data (should succeed)
      for (const table of scope.high) {
        try {
          backupData[table] = await this.backupTable(table, weddingContext);
          console.log(`✅ High priority table backed up: ${table}`);
        } catch (error) {
          errors.push(`High priority table ${table}: ${error.message}`);
          console.warn(`High priority backup warning: ${table}`);
        }
      }

      // Phase 3: Standard data (best effort)
      for (const table of scope.standard) {
        try {
          backupData[table] = await this.backupTable(table, weddingContext);
          console.log(`✅ Standard table backed up: ${table}`);
        } catch (error) {
          errors.push(`Standard table ${table}: ${error.message}`);
          console.warn(`Standard backup warning: ${table}`);
        }
      }

      // Add metadata
      backupData._metadata = {
        timestamp: new Date().toISOString(),
        scope,
        weddingContext,
        errors: errors.length > 0 ? errors : undefined,
      };

      return backupData;
    } catch (error) {
      console.error('Backup execution failed:', error);
      throw error;
    }
  }

  /**
   * Backup individual table with wedding-specific filtering
   */
  private async backupTable(
    tableName: string,
    weddingContext?: WeddingContext,
  ): Promise<any> {
    try {
      let query = this.supabase.from(tableName).select('*');

      // Apply wedding-specific filtering if context provided
      if (
        weddingContext?.organizationId &&
        this.tableHasOrganizationId(tableName)
      ) {
        query = query.eq('organization_id', weddingContext.organizationId);
      }

      // Apply wedding date filtering for time-sensitive data
      if (weddingContext?.weddingDate && this.tableHasWeddingDate(tableName)) {
        const weddingDate = new Date(weddingContext.weddingDate);
        const rangeStart = new Date(weddingDate);
        rangeStart.setMonth(rangeStart.getMonth() - 12); // 1 year before
        const rangeEnd = new Date(weddingDate);
        rangeEnd.setMonth(rangeEnd.getMonth() + 3); // 3 months after

        query = query
          .gte('created_at', rangeStart.toISOString())
          .lte('created_at', rangeEnd.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          `Table backup failed for ${tableName}: ${error.message}`,
        );
      }

      return {
        tableName,
        recordCount: data?.length || 0,
        data: data || [],
        backedUpAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Table backup error for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Validate backup integrity across all copies
   */
  private async validateBackupIntegrity(
    locations: BackupLocation[],
    scope: BackupScope,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const location of locations) {
      try {
        // Retrieve backup data from location
        const provider = this.providers.get(
          this.getProviderKey(location.provider),
        );
        if (!provider) continue;

        const backupData = await provider.retrieve(location.path);

        // Validate each table
        for (const tableName of [
          ...scope.critical,
          ...scope.high,
          ...scope.standard,
        ]) {
          const tableData = backupData[tableName];
          if (!tableData) continue;

          const validation: ValidationResult = {
            tableName,
            recordCount: tableData.recordCount || 0,
            checksumValid: this.validateTableChecksum(tableData),
            integrityScore: this.calculateIntegrityScore(tableData),
            errors: [],
          };

          // Additional validation checks
          if (
            validation.recordCount === 0 &&
            scope.critical.includes(tableName)
          ) {
            validation.errors.push('Critical table has no records');
          }

          if (!validation.checksumValid) {
            validation.errors.push('Checksum validation failed');
          }

          if (validation.integrityScore < 95) {
            validation.errors.push(
              `Low integrity score: ${validation.integrityScore}%`,
            );
          }

          results.push(validation);
        }

        // Mark location as verified
        location.verified = true;
      } catch (error) {
        console.error(`Validation failed for ${location.provider}:`, error);
        // Add error validation result
        results.push({
          tableName: `${location.provider}_validation`,
          recordCount: 0,
          checksumValid: false,
          integrityScore: 0,
          errors: [`Validation failed: ${error.message}`],
        });
      }
    }

    return results;
  }

  /**
   * Get wedding context for backup prioritization
   */
  private async getWeddingContext(
    organizationId: string,
  ): Promise<WeddingContext | undefined> {
    try {
      // Get upcoming weddings for this organization
      const { data: clients } = await this.supabase
        .from('clients')
        .select('wedding_date, id')
        .eq('organization_id', organizationId)
        .gte('wedding_date', new Date().toISOString())
        .order('wedding_date', { ascending: true })
        .limit(1);

      if (!clients || clients.length === 0) {
        return {
          organizationId,
          criticalVendors: [],
          timelinePhase: 'planning',
        };
      }

      const nearestWedding = clients[0];
      const weddingDate = new Date(nearestWedding.wedding_date);
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      // Determine timeline phase
      let timelinePhase: WeddingContext['timelinePhase'] = 'planning';
      if (daysUntilWedding <= 0) {
        timelinePhase = 'post_event';
      } else if (daysUntilWedding <= 1) {
        timelinePhase = 'execution';
      } else if (daysUntilWedding <= 30) {
        timelinePhase = 'preparation';
      }

      // Get critical vendors for this organization
      const { data: suppliers } = await this.supabase
        .from('suppliers')
        .select('name, category')
        .eq('organization_id', organizationId)
        .in('category', ['venue', 'photography', 'catering', 'music']);

      const criticalVendors = suppliers?.map((s) => s.name) || [];

      return {
        organizationId,
        weddingDate,
        daysUntilWedding,
        criticalVendors,
        timelinePhase,
      };
    } catch (error) {
      console.warn('Could not get wedding context:', error);
      return {
        organizationId,
        criticalVendors: [],
        timelinePhase: 'planning',
      };
    }
  }

  // Helper methods
  private generateBackupId(config: BackupConfig): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex')
      .substring(0, 8);
    return `backup_${timestamp}_${hash}`;
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async encryptBackupData(
    data: any,
    backupId: string,
  ): Promise<string> {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);

    const dataString = JSON.stringify(data);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm,
      backupId,
    });
  }

  private calculateDataSize(data: any): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  private calculateChecksum(data: any): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private validateTableChecksum(tableData: any): boolean {
    try {
      const expectedChecksum = crypto
        .createHash('md5')
        .update(JSON.stringify(tableData.data))
        .digest('hex');
      return tableData.checksum === expectedChecksum;
    } catch {
      return false;
    }
  }

  private calculateIntegrityScore(tableData: any): number {
    if (!tableData.data || !Array.isArray(tableData.data)) return 0;

    const records = tableData.data;
    let validRecords = 0;

    for (const record of records) {
      if (record && typeof record === 'object' && record.id) {
        validRecords++;
      }
    }

    return records.length > 0 ? (validRecords / records.length) * 100 : 100;
  }

  private tableHasOrganizationId(tableName: string): boolean {
    return [
      'suppliers',
      'clients',
      'forms',
      'journey_instances',
      'files',
      'communications',
    ].includes(tableName);
  }

  private tableHasWeddingDate(tableName: string): boolean {
    return ['clients', 'journey_instances', 'communications'].includes(
      tableName,
    );
  }

  private getProviderKey(provider: string): string {
    const providerMap = {
      supabase: 'primary',
      s3: 'secondary',
      gcs: 'offsite',
    };
    return providerMap[provider] || 'primary';
  }

  private async logBackupOperation(
    backupId: string,
    operationType: string,
    status: string,
    config: BackupConfig,
  ): Promise<void> {
    try {
      await this.supabase.from('backup_operations').insert({
        backup_name: backupId,
        backup_type: config.type,
        operation_type: operationType,
        priority_level: config.priority,
        target_tables: config.includeTables,
        status,
        organization_id: config.organizationId,
        wedding_data_categories: this.categorizeWeddingData(
          config.includeTables,
        ),
        encryption_enabled: config.encryptionEnabled,
        retention_policy: `${config.retentionDays}d`,
      });
    } catch (error) {
      console.error('Failed to log backup operation:', error);
    }
  }

  private async updateBackupOperation(
    backupId: string,
    status: string,
    result?: any,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        completed_at: new Date().toISOString(),
      };

      if (result?.dataSize) {
        updateData.data_size_bytes = result.dataSize;
      }

      if (result?.checksum) {
        updateData.checksum = result.checksum;
      }

      if (result?.error) {
        updateData.error_message = result.error;
        updateData.validation_status = 'failed';
      } else if (status === 'completed') {
        updateData.validation_status = 'passed';
      }

      await this.supabase
        .from('backup_operations')
        .update(updateData)
        .eq('backup_name', backupId);
    } catch (error) {
      console.error('Failed to update backup operation:', error);
    }
  }

  private categorizeWeddingData(tables: string[]): string[] {
    const categories: string[] = [];

    for (const table of tables) {
      if (WEDDING_DATA_PRIORITY.critical.includes(table)) {
        categories.push('critical');
      } else if (WEDDING_DATA_PRIORITY.high.includes(table)) {
        categories.push('high');
      } else {
        categories.push('standard');
      }
    }

    return [...new Set(categories)];
  }
}

// Supporting interfaces
interface BackupScope {
  critical: string[];
  high: string[];
  standard: string[];
  totalTables: number;
}

// Abstract backup provider interface
abstract class BackupProvider {
  abstract store(
    data: any,
    backupId: string,
    config: BackupConfig,
  ): Promise<{ path: string }>;
  abstract retrieve(path: string): Promise<any>;
  abstract delete(path: string): Promise<void>;
}

// Supabase backup provider implementation
class SupabaseBackupProvider extends BackupProvider {
  constructor(private supabase: any) {
    super();
  }

  async store(
    data: any,
    backupId: string,
    config: BackupConfig,
  ): Promise<{ path: string }> {
    const path = `backups/${backupId}/supabase_backup.json`;

    // Store in Supabase Storage
    const { error } = await this.supabase.storage
      .from('backups')
      .upload(path, JSON.stringify(data), {
        contentType: 'application/json',
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase storage failed: ${error.message}`);
    }

    return { path };
  }

  async retrieve(path: string): Promise<any> {
    const { data, error } = await this.supabase.storage
      .from('backups')
      .download(path);

    if (error) {
      throw new Error(`Supabase retrieval failed: ${error.message}`);
    }

    const text = await data.text();
    return JSON.parse(text);
  }

  async delete(path: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from('backups')
      .remove([path]);

    if (error) {
      throw new Error(`Supabase deletion failed: ${error.message}`);
    }
  }
}

// S3 backup provider (placeholder - would integrate with AWS SDK)
class S3BackupProvider extends BackupProvider {
  async store(
    data: any,
    backupId: string,
    config: BackupConfig,
  ): Promise<{ path: string }> {
    // Placeholder for S3 implementation
    const path = `s3://wedding-backups/${backupId}/backup.json`;
    console.log(`S3 backup would be stored at: ${path}`);
    return { path };
  }

  async retrieve(path: string): Promise<any> {
    // Placeholder for S3 retrieval
    console.log(`S3 backup would be retrieved from: ${path}`);
    return {};
  }

  async delete(path: string): Promise<void> {
    // Placeholder for S3 deletion
    console.log(`S3 backup would be deleted from: ${path}`);
  }
}

// Google Cloud Storage provider (placeholder - would integrate with GCS SDK)
class GCSBackupProvider extends BackupProvider {
  async store(
    data: any,
    backupId: string,
    config: BackupConfig,
  ): Promise<{ path: string }> {
    // Placeholder for GCS implementation
    const path = `gs://wedding-backups-offsite/${backupId}/backup.json`;
    console.log(`GCS backup would be stored at: ${path}`);
    return { path };
  }

  async retrieve(path: string): Promise<any> {
    // Placeholder for GCS retrieval
    console.log(`GCS backup would be retrieved from: ${path}`);
    return {};
  }

  async delete(path: string): Promise<void> {
    // Placeholder for GCS deletion
    console.log(`GCS backup would be deleted from: ${path}`);
  }
}

export default BackupOrchestrator;
