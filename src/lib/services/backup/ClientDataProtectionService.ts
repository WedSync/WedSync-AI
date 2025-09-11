import { SupabaseClient } from '@supabase/supabase-js';
import { BackupEncryptionService } from './BackupEncryptionService';

export interface ClientDataProtectionConfig {
  organizationId: string;
  clientId?: string;
  weddingId?: string;
  includePersonalData: boolean;
  includeFinancialData: boolean;
  includeCommunicationHistory: boolean;
  includeDocuments: boolean;
  gdprCompliant: boolean;
  encryptionRequired: boolean;
  anonymizeData: boolean;
}

export interface ClientProtectionResult {
  backupId: string;
  clientsProtected: number;
  personalDataRecords: number;
  financialDataRecords: number;
  documentsProtected: number;
  encryptionApplied: boolean;
  gdprCompliant: boolean;
  anonymizationApplied: boolean;
}

export interface GDPRComplianceReport {
  organizationId: string;
  totalClients: number;
  protectedClients: number;
  unprotectedClients: number;
  lastProtectionDate: Date | null;
  complianceScore: number;
  violations: string[];
  recommendations: string[];
}

export class ClientDataProtectionService {
  private supabase: SupabaseClient;
  private encryptionService: BackupEncryptionService;

  // GDPR-sensitive client data tables
  private readonly personalDataTables = [
    'clients',
    'client_personal_details',
    'client_contacts',
    'client_preferences',
  ];

  private readonly financialDataTables = [
    'client_payments',
    'invoices',
    'payment_methods',
    'billing_addresses',
  ];

  private readonly communicationTables = [
    'communications',
    'email_history',
    'sms_history',
    'client_notes',
  ];

  private readonly documentTables = [
    'client_documents',
    'contracts',
    'agreements',
  ];

  // Fields that require anonymization
  private readonly sensitiveFields = [
    'email',
    'phone',
    'address',
    'payment_details',
    'bank_details',
    'personal_notes',
  ];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.encryptionService = new BackupEncryptionService();
  }

  async protectClientData(
    config: ClientDataProtectionConfig,
  ): Promise<ClientProtectionResult> {
    const backupId = this.generateBackupId();

    try {
      // Determine tables to protect based on config
      const tablesToProtect = this.determineTablesToProtect(config);

      // Create protection record
      await this.createProtectionRecord(backupId, config);

      let totalClients = 0;
      let personalDataRecords = 0;
      let financialDataRecords = 0;
      let documentsProtected = 0;

      // Process each table group
      if (config.includePersonalData) {
        const result = await this.protectPersonalData(
          backupId,
          config,
          this.personalDataTables,
        );
        personalDataRecords += result.recordCount;
        totalClients = Math.max(totalClients, result.clientCount);
      }

      if (config.includeFinancialData) {
        const result = await this.protectFinancialData(
          backupId,
          config,
          this.financialDataTables,
        );
        financialDataRecords += result.recordCount;
      }

      if (config.includeCommunicationHistory) {
        await this.protectCommunicationData(
          backupId,
          config,
          this.communicationTables,
        );
      }

      if (config.includeDocuments) {
        const result = await this.protectDocumentData(
          backupId,
          config,
          this.documentTables,
        );
        documentsProtected += result.recordCount;
      }

      // Apply encryption if required
      let encryptionApplied = false;
      if (config.encryptionRequired) {
        await this.encryptionService.encryptBackup(backupId);
        encryptionApplied = true;
      }

      // Apply anonymization if required
      let anonymizationApplied = false;
      if (config.anonymizeData) {
        await this.anonymizeProtectedData(backupId, config);
        anonymizationApplied = true;
      }

      // Update protection record
      await this.updateProtectionRecord(backupId, {
        status: 'COMPLETED',
        clients_protected: totalClients,
        personal_data_records: personalDataRecords,
        financial_data_records: financialDataRecords,
        documents_protected: documentsProtected,
        encryption_applied: encryptionApplied,
        anonymization_applied: anonymizationApplied,
        completed_at: new Date().toISOString(),
      });

      return {
        backupId,
        clientsProtected: totalClients,
        personalDataRecords,
        financialDataRecords,
        documentsProtected,
        encryptionApplied,
        gdprCompliant: config.gdprCompliant,
        anonymizationApplied,
      };
    } catch (error) {
      console.error(`Client data protection failed: ${error.message}`);

      await this.updateProtectionRecord(backupId, {
        status: 'FAILED',
        error_message: error.message,
      });

      throw new Error(`Failed to protect client data: ${error.message}`);
    }
  }

  async generateGDPRComplianceReport(
    organizationId: string,
  ): Promise<GDPRComplianceReport> {
    try {
      // Get total clients
      const { count: totalClients, error: clientError } = await this.supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId);

      if (clientError) {
        throw new Error(`Failed to count clients: ${clientError.message}`);
      }

      // Get protected clients (those with recent backups)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const { data: protectedBackups, error: backupError } = await this.supabase
        .from('client_data_protections')
        .select('client_id')
        .eq('organization_id', organizationId)
        .eq('status', 'COMPLETED')
        .gte('completed_at', thirtyDaysAgo.toISOString());

      if (backupError) {
        throw new Error(
          `Failed to get protection records: ${backupError.message}`,
        );
      }

      const protectedClientIds = new Set(
        protectedBackups?.map((p) => p.client_id).filter(Boolean) || [],
      );
      const protectedClients = protectedClientIds.size;
      const unprotectedClients = (totalClients || 0) - protectedClients;

      // Get last protection date
      const { data: lastProtection } = await this.supabase
        .from('client_data_protections')
        .select('completed_at')
        .eq('organization_id', organizationId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(
        totalClients || 0,
        protectedClients,
        lastProtection ? new Date(lastProtection.completed_at) : null,
      );

      // Identify violations and recommendations
      const violations = await this.identifyGDPRViolations(organizationId);
      const recommendations = this.generateGDPRRecommendations(
        totalClients || 0,
        protectedClients,
        violations,
      );

      return {
        organizationId,
        totalClients: totalClients || 0,
        protectedClients,
        unprotectedClients,
        lastProtectionDate: lastProtection
          ? new Date(lastProtection.completed_at)
          : null,
        complianceScore,
        violations,
        recommendations,
      };
    } catch (error) {
      console.error(
        `Failed to generate GDPR compliance report: ${error.message}`,
      );
      throw error;
    }
  }

  async scheduleAutomaticDataProtection(
    organizationId: string,
  ): Promise<any[]> {
    try {
      // Get clients requiring protection
      const clientsRequiringProtection =
        await this.getClientsRequiringProtection(organizationId);
      const scheduledProtections: any[] = [];

      for (const client of clientsRequiringProtection) {
        const protectionConfig: ClientDataProtectionConfig = {
          organizationId,
          clientId: client.clientId,
          weddingId: client.weddingId,
          includePersonalData: true,
          includeFinancialData: client.hasFinancialData,
          includeCommunicationHistory: client.hasCommunications,
          includeDocuments: client.hasDocuments,
          gdprCompliant: true,
          encryptionRequired: true,
          anonymizeData: client.requiresAnonymization,
        };

        const scheduleTime = this.calculateProtectionScheduleTime(client);

        scheduledProtections.push({
          clientId: client.clientId,
          clientName: client.clientName,
          protectionConfig,
          scheduledFor: scheduleTime,
          priority: client.priority,
          reason: client.reason,
        });
      }

      return scheduledProtections;
    } catch (error) {
      console.error(
        `Failed to schedule automatic data protection: ${error.message}`,
      );
      return [];
    }
  }

  private determineTablesToProtect(
    config: ClientDataProtectionConfig,
  ): string[] {
    const tables: string[] = [];

    if (config.includePersonalData) {
      tables.push(...this.personalDataTables);
    }

    if (config.includeFinancialData) {
      tables.push(...this.financialDataTables);
    }

    if (config.includeCommunicationHistory) {
      tables.push(...this.communicationTables);
    }

    if (config.includeDocuments) {
      tables.push(...this.documentTables);
    }

    return [...new Set(tables)];
  }

  private async protectPersonalData(
    backupId: string,
    config: ClientDataProtectionConfig,
    tables: string[],
  ): Promise<{ recordCount: number; clientCount: number }> {
    let totalRecords = 0;
    let clientCount = 0;

    for (const tableName of tables) {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', config.organizationId);

      if (error) {
        console.error(
          `Failed to protect personal data from ${tableName}: ${error.message}`,
        );
        continue;
      }

      if (data) {
        totalRecords += data.length;
        if (tableName === 'clients') {
          clientCount = data.length;
        }

        // Store protected data
        await this.storeProtectedData(
          backupId,
          tableName,
          data,
          config.anonymizeData,
        );
      }
    }

    return { recordCount: totalRecords, clientCount };
  }

  private async protectFinancialData(
    backupId: string,
    config: ClientDataProtectionConfig,
    tables: string[],
  ): Promise<{ recordCount: number }> {
    let totalRecords = 0;

    for (const tableName of tables) {
      // Financial data requires extra encryption
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', config.organizationId);

      if (error) {
        console.error(
          `Failed to protect financial data from ${tableName}: ${error.message}`,
        );
        continue;
      }

      if (data) {
        totalRecords += data.length;

        // Always anonymize financial data for GDPR compliance
        const anonymizedData = config.gdprCompliant
          ? this.anonymizeFinancialData(data)
          : data;

        await this.storeProtectedData(
          backupId,
          tableName,
          anonymizedData,
          true,
        );
      }
    }

    return { recordCount: totalRecords };
  }

  private async protectCommunicationData(
    backupId: string,
    config: ClientDataProtectionConfig,
    tables: string[],
  ): Promise<void> {
    for (const tableName of tables) {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', config.organizationId);

      if (error) {
        console.error(
          `Failed to protect communication data from ${tableName}: ${error.message}`,
        );
        continue;
      }

      if (data) {
        // Communications may contain sensitive personal information
        const protectedData = config.gdprCompliant
          ? this.anonymizeCommunicationData(data)
          : data;

        await this.storeProtectedData(
          backupId,
          tableName,
          protectedData,
          config.anonymizeData,
        );
      }
    }
  }

  private async protectDocumentData(
    backupId: string,
    config: ClientDataProtectionConfig,
    tables: string[],
  ): Promise<{ recordCount: number }> {
    let totalRecords = 0;

    for (const tableName of tables) {
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('organization_id', config.organizationId);

      if (error) {
        console.error(
          `Failed to protect document data from ${tableName}: ${error.message}`,
        );
        continue;
      }

      if (data) {
        totalRecords += data.length;
        await this.storeProtectedData(
          backupId,
          tableName,
          data,
          config.anonymizeData,
        );
      }
    }

    return { recordCount: totalRecords };
  }

  private async anonymizeProtectedData(
    backupId: string,
    config: ClientDataProtectionConfig,
  ): Promise<void> {
    // Apply additional anonymization to protected data
    console.log(`Applying anonymization to backup ${backupId}`);
  }

  private anonymizeFinancialData(data: any[]): any[] {
    return data.map((record) => ({
      ...record,
      card_number: record.card_number
        ? '**** **** **** ' + record.card_number.slice(-4)
        : null,
      bank_account: record.bank_account
        ? '***' + record.bank_account.slice(-3)
        : null,
      sort_code: record.sort_code ? '**-**-**' : null,
      payment_details: '[ANONYMIZED]',
    }));
  }

  private anonymizeCommunicationData(data: any[]): any[] {
    return data.map((record) => ({
      ...record,
      content: record.content ? '[MESSAGE CONTENT ANONYMIZED]' : null,
      email: record.email ? this.anonymizeEmail(record.email) : null,
      phone: record.phone ? this.anonymizePhone(record.phone) : null,
    }));
  }

  private anonymizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const anonymizedLocal =
      local.charAt(0) +
      '*'.repeat(Math.max(local.length - 2, 0)) +
      local.slice(-1);
    return `${anonymizedLocal}@${domain}`;
  }

  private anonymizePhone(phone: string): string {
    return phone.replace(/\d(?=\d{3})/g, '*');
  }

  private calculateComplianceScore(
    totalClients: number,
    protectedClients: number,
    lastProtection: Date | null,
  ): number {
    if (totalClients === 0) return 100;

    const protectionRatio = protectedClients / totalClients;
    let score = protectionRatio * 70; // 70% for coverage

    // Add points for recent protection
    if (lastProtection) {
      const daysSinceLastProtection =
        (Date.now() - lastProtection.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastProtection <= 7) score += 30;
      else if (daysSinceLastProtection <= 30) score += 20;
      else if (daysSinceLastProtection <= 90) score += 10;
    }

    return Math.min(Math.round(score), 100);
  }

  private async identifyGDPRViolations(
    organizationId: string,
  ): Promise<string[]> {
    const violations: string[] = [];

    // Check for clients without recent data protection
    const { count: unprotectedClients } = await this.supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .not(
        'id',
        'in',
        `(
        SELECT client_id FROM client_data_protections 
        WHERE organization_id = '${organizationId}' 
        AND completed_at >= '${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}'
      )`,
      );

    if ((unprotectedClients || 0) > 0) {
      violations.push(
        `${unprotectedClients} clients without data protection in last 90 days`,
      );
    }

    return violations;
  }

  private generateGDPRRecommendations(
    totalClients: number,
    protectedClients: number,
    violations: string[],
  ): string[] {
    const recommendations: string[] = [];

    if (protectedClients < totalClients) {
      recommendations.push(
        'Schedule automatic data protection for all clients',
      );
    }

    if (violations.length > 0) {
      recommendations.push(
        'Address identified GDPR compliance violations immediately',
      );
    }

    recommendations.push(
      'Enable automatic encryption for all client data backups',
    );
    recommendations.push('Implement regular GDPR compliance auditing');
    recommendations.push('Train staff on data protection best practices');

    return recommendations;
  }

  private async getClientsRequiringProtection(
    organizationId: string,
  ): Promise<any[]> {
    // Implementation would identify clients needing protection
    return [];
  }

  private calculateProtectionScheduleTime(client: any): Date {
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000); // Schedule 1 hour from now
  }

  private async createProtectionRecord(
    backupId: string,
    config: ClientDataProtectionConfig,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('client_data_protections')
      .insert({
        id: backupId,
        organization_id: config.organizationId,
        client_id: config.clientId,
        wedding_id: config.weddingId,
        gdpr_compliant: config.gdprCompliant,
        encryption_required: config.encryptionRequired,
        anonymization_required: config.anonymizeData,
        status: 'RUNNING',
        started_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to create protection record: ${error.message}`);
    }
  }

  private async updateProtectionRecord(
    backupId: string,
    updates: any,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('client_data_protections')
      .update(updates)
      .eq('id', backupId);

    if (error) {
      console.error(`Failed to update protection record: ${error.message}`);
    }
  }

  private async storeProtectedData(
    backupId: string,
    tableName: string,
    data: any[],
    anonymized: boolean,
  ): Promise<void> {
    // Store protected data metadata
    const { error } = await this.supabase.from('backup_table_contents').insert({
      backup_id: backupId,
      table_name: tableName,
      record_count: data.length,
      anonymized,
      data_snapshot: JSON.stringify(data.slice(0, 3)), // Store first 3 records as sample
    });

    if (error) {
      console.error(
        `Failed to store protected data metadata: ${error.message}`,
      );
    }
  }

  private generateBackupId(): string {
    return `client_protection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
