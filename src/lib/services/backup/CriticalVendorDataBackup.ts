import { SupabaseClient } from '@supabase/supabase-js';
import { BackupEncryptionService } from './BackupEncryptionService';

export interface VendorDataBackupConfig {
  organizationId: string;
  vendorId?: string;
  includeClientData: boolean;
  includeVendorCommunications: boolean;
  includeContractData: boolean;
  includePaymentHistory: boolean;
  includeDocuments: boolean;
  encryptionLevel: 'STANDARD' | 'HIGH' | 'MAXIMUM';
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
}

export interface VendorBackupResult {
  backupId: string;
  vendorId?: string;
  tablesBackedUp: string[];
  recordsBackedUp: number;
  documentsBackedUp: number;
  encryptionApplied: boolean;
  backupSize: number;
  createdAt: Date;
}

export interface CriticalVendorMetrics {
  vendorId: string;
  vendorName: string;
  vendorType: string;
  clientCount: number;
  upcomingWeddingsCount: number;
  contractValue: number;
  lastBackup: Date | null;
  dataRiskScore: number; // 0-100
  requiresImmediateBackup: boolean;
}

export class CriticalVendorDataBackup {
  private supabase: SupabaseClient;
  private encryptionService: BackupEncryptionService;

  // Tables containing critical vendor data
  private readonly vendorCriticalTables = [
    'vendors',
    'vendor_services',
    'vendor_contracts',
    'vendor_payments',
    'vendor_communications',
    'vendor_documents',
    'vendor_availability',
    'vendor_reviews',
    'wedding_vendors', // Junction table
  ];

  // Tables containing vendor-related client data
  private readonly vendorClientTables = [
    'clients',
    'weddings',
    'wedding_schedules',
    'communications',
    'form_submissions',
    'tasks',
  ];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.encryptionService = new BackupEncryptionService();
  }

  async createVendorDataBackup(
    config: VendorDataBackupConfig,
  ): Promise<VendorBackupResult> {
    const backupId = this.generateBackupId();
    const startTime = new Date();

    try {
      // Determine which tables to backup based on configuration
      const tablesToBackup = this.determineTablesToBackup(config);

      // Create backup execution record
      await this.createBackupRecord(backupId, config, tablesToBackup);

      let totalRecords = 0;
      let totalDocuments = 0;
      const backedUpTables: string[] = [];

      // Backup vendor-specific data
      for (const tableName of tablesToBackup) {
        const backupResult = await this.backupVendorTable(
          backupId,
          tableName,
          config.organizationId,
          config.vendorId,
        );

        totalRecords += backupResult.recordCount;
        if (tableName.includes('document')) {
          totalDocuments += backupResult.recordCount;
        }
        backedUpTables.push(tableName);
      }

      // Apply encryption based on level
      let encryptionApplied = false;
      if (config.encryptionLevel !== 'STANDARD') {
        await this.applyVendorDataEncryption(backupId, config.encryptionLevel);
        encryptionApplied = true;
      }

      // Calculate backup size (placeholder - would be actual file size in production)
      const backupSize = totalRecords * 1024 + totalDocuments * 10240;

      // Update backup record with completion
      await this.updateBackupRecord(backupId, {
        status: 'COMPLETED',
        records_backed_up: totalRecords,
        documents_backed_up: totalDocuments,
        backup_size: backupSize,
        completed_at: new Date().toISOString(),
      });

      return {
        backupId,
        vendorId: config.vendorId,
        tablesBackedUp: backedUpTables,
        recordsBackedUp: totalRecords,
        documentsBackedUp: totalDocuments,
        encryptionApplied,
        backupSize,
        createdAt: startTime,
      };
    } catch (error) {
      console.error(`Vendor data backup failed: ${error.message}`);

      // Mark backup as failed
      await this.updateBackupRecord(backupId, {
        status: 'FAILED',
        error_message: error.message,
      });

      throw new Error(`Failed to create vendor data backup: ${error.message}`);
    }
  }

  async identifyCriticalVendors(
    organizationId: string,
  ): Promise<CriticalVendorMetrics[]> {
    try {
      const { data: vendors, error } = await this.supabase
        .from('vendors')
        .select(
          `
          id,
          name,
          vendor_type,
          contract_value,
          vendor_communications (count),
          vendor_contracts (count),
          vendor_payments (count),
          wedding_vendors (
            count,
            weddings (
              wedding_date
            )
          )
        `,
        )
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(`Failed to get vendors: ${error.message}`);
      }

      const criticalVendorPromises = (vendors || []).map(async (vendor) => {
        // Calculate upcoming weddings for this vendor
        const upcomingWeddings =
          vendor.wedding_vendors?.filter(
            (wv) =>
              wv.weddings && new Date(wv.weddings.wedding_date) > new Date(),
          ).length || 0;

        // Get last backup info
        const { data: lastBackup } = await this.supabase
          .from('backup_executions')
          .select('completed_at')
          .eq('vendor_id', vendor.id)
          .eq('status', 'COMPLETED')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Calculate data risk score
        const dataRiskScore = this.calculateVendorDataRiskScore({
          upcomingWeddingsCount: upcomingWeddings,
          contractValue: vendor.contract_value || 0,
          communicationsCount: vendor.vendor_communications?.[0]?.count || 0,
          contractsCount: vendor.vendor_contracts?.[0]?.count || 0,
          paymentsCount: vendor.vendor_payments?.[0]?.count || 0,
          daysSinceLastBackup: lastBackup
            ? Math.ceil(
                (Date.now() - new Date(lastBackup.completed_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 999,
        });

        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorType: vendor.vendor_type,
          clientCount: vendor.wedding_vendors?.[0]?.count || 0,
          upcomingWeddingsCount: upcomingWeddings,
          contractValue: vendor.contract_value || 0,
          lastBackup: lastBackup ? new Date(lastBackup.completed_at) : null,
          dataRiskScore,
          requiresImmediateBackup: dataRiskScore >= 80,
        };
      });

      const criticalVendors = await Promise.all(criticalVendorPromises);

      // Sort by risk score, highest first
      return criticalVendors.sort((a, b) => b.dataRiskScore - a.dataRiskScore);
    } catch (error) {
      console.error(`Failed to identify critical vendors: ${error.message}`);
      return [];
    }
  }

  async scheduleAutomatedVendorBackups(organizationId: string): Promise<any[]> {
    try {
      const criticalVendors =
        await this.identifyCriticalVendors(organizationId);
      const scheduledBackups: any[] = [];

      for (const vendor of criticalVendors) {
        if (vendor.requiresImmediateBackup || vendor.dataRiskScore >= 60) {
          const backupConfig: VendorDataBackupConfig = {
            organizationId,
            vendorId: vendor.vendorId,
            includeClientData: vendor.upcomingWeddingsCount > 0,
            includeVendorCommunications: true,
            includeContractData: vendor.contractValue > 0,
            includePaymentHistory: true,
            includeDocuments: true,
            encryptionLevel: vendor.dataRiskScore >= 80 ? 'MAXIMUM' : 'HIGH',
            priority: this.determinePriorityFromRiskScore(vendor.dataRiskScore),
          };

          const scheduledTime = this.calculateBackupScheduleTime(vendor);

          scheduledBackups.push({
            vendorId: vendor.vendorId,
            vendorName: vendor.vendorName,
            backupConfig,
            scheduledFor: scheduledTime,
            riskScore: vendor.dataRiskScore,
            reason: this.generateBackupReason(vendor),
          });
        }
      }

      return scheduledBackups;
    } catch (error) {
      console.error(
        `Failed to schedule automated vendor backups: ${error.message}`,
      );
      return [];
    }
  }

  async getVendorBackupHistory(
    organizationId: string,
    vendorId?: string,
  ): Promise<any[]> {
    try {
      let query = this.supabase
        .from('backup_executions')
        .select(
          `
          id,
          vendor_id,
          status,
          records_backed_up,
          documents_backed_up,
          backup_size,
          started_at,
          completed_at,
          error_message,
          vendors (
            name,
            vendor_type
          )
        `,
        )
        .eq('organization_id', organizationId)
        .not('vendor_id', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(
          `Failed to get vendor backup history: ${error.message}`,
        );
      }

      return data || [];
    } catch (error) {
      console.error(`Failed to get vendor backup history: ${error.message}`);
      return [];
    }
  }

  private determineTablesToBackup(config: VendorDataBackupConfig): string[] {
    const tables: string[] = [...this.vendorCriticalTables];

    if (config.includeClientData) {
      tables.push(...this.vendorClientTables);
    }

    // Remove duplicates
    return [...new Set(tables)];
  }

  private async backupVendorTable(
    backupId: string,
    tableName: string,
    organizationId: string,
    vendorId?: string,
  ): Promise<{ recordCount: number }> {
    try {
      // Build query based on table name and vendor relationship
      let query = this.supabase.from(tableName).select('*');

      // Apply organization filter
      if (
        [
          'vendors',
          'vendor_services',
          'vendor_contracts',
          'vendor_payments',
          'vendor_communications',
          'vendor_documents',
          'vendor_availability',
          'vendor_reviews',
        ].includes(tableName)
      ) {
        query = query.eq('organization_id', organizationId);
      }

      // Apply vendor-specific filter if provided
      if (vendorId) {
        if (tableName === 'vendors') {
          query = query.eq('id', vendorId);
        } else if (tableName.startsWith('vendor_')) {
          query = query.eq('vendor_id', vendorId);
        } else if (tableName === 'wedding_vendors') {
          query = query.eq('vendor_id', vendorId);
        } else if (
          ['clients', 'weddings', 'communications', 'tasks'].includes(tableName)
        ) {
          // For client tables, filter by weddings that involve this vendor
          const { data: weddingIds } = await this.supabase
            .from('wedding_vendors')
            .select('wedding_id')
            .eq('vendor_id', vendorId);

          const ids = weddingIds?.map((w) => w.wedding_id) || [];
          if (ids.length > 0) {
            if (tableName === 'weddings') {
              query = query.in('id', ids);
            } else if (tableName === 'clients') {
              const { data: clientIds } = await this.supabase
                .from('weddings')
                .select('client_id')
                .in('id', ids);
              const clientIdsArray = clientIds?.map((c) => c.client_id) || [];
              if (clientIdsArray.length > 0) {
                query = query.in('id', clientIdsArray);
              }
            } else {
              query = query.in('wedding_id', ids);
            }
          } else {
            return { recordCount: 0 };
          }
        }
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(`Failed to backup table ${tableName}: ${error.message}`);
        return { recordCount: 0 };
      }

      // Store backup data (in production, this would write to backup storage)
      await this.storeTableBackupData(backupId, tableName, data || []);

      return { recordCount: count || data?.length || 0 };
    } catch (error) {
      console.error(
        `Failed to backup vendor table ${tableName}: ${error.message}`,
      );
      return { recordCount: 0 };
    }
  }

  private calculateVendorDataRiskScore(metrics: {
    upcomingWeddingsCount: number;
    contractValue: number;
    communicationsCount: number;
    contractsCount: number;
    paymentsCount: number;
    daysSinceLastBackup: number;
  }): number {
    let score = 0;

    // Upcoming weddings (30 points max)
    score += Math.min(metrics.upcomingWeddingsCount * 10, 30);

    // Contract value (20 points max)
    if (metrics.contractValue > 10000) score += 20;
    else if (metrics.contractValue > 5000) score += 15;
    else if (metrics.contractValue > 1000) score += 10;
    else if (metrics.contractValue > 0) score += 5;

    // Data volume (20 points max)
    const totalDataPoints =
      metrics.communicationsCount +
      metrics.contractsCount +
      metrics.paymentsCount;
    if (totalDataPoints > 100) score += 20;
    else if (totalDataPoints > 50) score += 15;
    else if (totalDataPoints > 20) score += 10;
    else if (totalDataPoints > 0) score += 5;

    // Time since last backup (30 points max)
    if (metrics.daysSinceLastBackup > 30) score += 30;
    else if (metrics.daysSinceLastBackup > 14) score += 20;
    else if (metrics.daysSinceLastBackup > 7) score += 15;
    else if (metrics.daysSinceLastBackup > 3) score += 10;
    else if (metrics.daysSinceLastBackup > 1) score += 5;

    return Math.min(score, 100);
  }

  private determinePriorityFromRiskScore(
    riskScore: number,
  ): 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' {
    if (riskScore >= 80) return 'CRITICAL';
    if (riskScore >= 60) return 'HIGH';
    if (riskScore >= 40) return 'NORMAL';
    return 'LOW';
  }

  private calculateBackupScheduleTime(vendor: CriticalVendorMetrics): Date {
    const now = new Date();
    const scheduleTime = new Date(now);

    if (vendor.dataRiskScore >= 90) {
      // Immediate backup for highest risk
      scheduleTime.setMinutes(now.getMinutes() + 5);
    } else if (vendor.dataRiskScore >= 70) {
      // Within 1 hour for high risk
      scheduleTime.setHours(now.getHours() + 1);
    } else {
      // During off-peak hours for normal risk
      scheduleTime.setHours(2, 0, 0, 0);
      if (scheduleTime <= now) {
        scheduleTime.setDate(scheduleTime.getDate() + 1);
      }
    }

    return scheduleTime;
  }

  private generateBackupReason(vendor: CriticalVendorMetrics): string {
    const reasons: string[] = [];

    if (vendor.upcomingWeddingsCount > 0) {
      reasons.push(
        `${vendor.upcomingWeddingsCount} upcoming wedding${vendor.upcomingWeddingsCount > 1 ? 's' : ''}`,
      );
    }

    if (vendor.contractValue > 0) {
      reasons.push(`£${vendor.contractValue.toLocaleString()} contract value`);
    }

    if (!vendor.lastBackup) {
      reasons.push('no previous backup');
    } else {
      const daysSince = Math.ceil(
        (Date.now() - vendor.lastBackup.getTime()) / (1000 * 60 * 60 * 24),
      );
      reasons.push(`${daysSince} days since last backup`);
    }

    return `Risk score: ${vendor.dataRiskScore}% - ${reasons.join(', ')}`;
  }

  private async applyVendorDataEncryption(
    backupId: string,
    level: 'HIGH' | 'MAXIMUM',
  ): Promise<void> {
    // Apply encryption based on level
    const password =
      level === 'MAXIMUM'
        ? this.generateSecurePassword(64) // 64-character password for maximum security
        : this.generateSecurePassword(32); // 32-character password for high security

    await this.encryptionService.encryptBackup(backupId, password);
  }

  private generateSecurePassword(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async createBackupRecord(
    backupId: string,
    config: VendorDataBackupConfig,
    tables: string[],
  ): Promise<void> {
    const { error } = await this.supabase.from('backup_executions').insert({
      id: backupId,
      organization_id: config.organizationId,
      vendor_id: config.vendorId,
      backup_type: 'VENDOR_DATA',
      priority: config.priority,
      tables_included: tables,
      encryption_level: config.encryptionLevel,
      status: 'RUNNING',
      started_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to create backup record: ${error.message}`);
    }
  }

  private async updateBackupRecord(
    backupId: string,
    updates: any,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('backup_executions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', backupId);

    if (error) {
      console.error(`Failed to update backup record: ${error.message}`);
    }
  }

  private async storeTableBackupData(
    backupId: string,
    tableName: string,
    data: any[],
  ): Promise<void> {
    // Store backup table content metadata
    const { error } = await this.supabase.from('backup_table_contents').insert({
      backup_id: backupId,
      table_name: tableName,
      record_count: data.length,
      data_snapshot: JSON.stringify(data.slice(0, 5)), // Store first 5 records as sample
    });

    if (error) {
      console.error(`Failed to store table backup metadata: ${error.message}`);
    }
  }

  private generateBackupId(): string {
    return `vendor_backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
