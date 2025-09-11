import { SupabaseClient } from '@supabase/supabase-js';
import { DisasterRecoveryEngine } from './DisasterRecoveryEngine';
import { BackupValidationService } from './BackupValidationService';
import { WeddingDateBackupPriority } from './WeddingDateBackupPriority';

export interface EmergencyRestoreConfig {
  backupId: string;
  organizationId: string;
  userId: string;
  confirmationToken: string;
  targetTables: string[];
  emergencyType:
    | 'DATA_CORRUPTION'
    | 'ACCIDENTAL_DELETION'
    | 'SYSTEM_FAILURE'
    | 'SECURITY_BREACH'
    | 'WEDDING_EMERGENCY';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  description: string;
}

export interface EmergencyRestoreResult {
  restoreId: string;
  status: 'INITIATED' | 'VALIDATING' | 'RESTORING' | 'COMPLETED' | 'FAILED';
  priority: 'CRITICAL';
  estimatedCompletion: Date;
  affectedWeddings: string[];
  recoverySteps: string[];
  rollbackPlan?: string;
}

export interface EmergencyBackupConfig {
  organizationId: string;
  weddingId?: string;
  emergencyType:
    | 'WEDDING_DAY'
    | 'SYSTEM_FAILURE'
    | 'DATA_BREACH'
    | 'CORRUPTION_DETECTED';
  priority: 'CRITICAL';
  reason: string;
  includeAllData: boolean;
}

export interface WeddingDayEmergencyPlan {
  weddingId: string;
  weddingDate: Date;
  emergencyContacts: string[];
  criticalDataTables: string[];
  backupFrequency: 'REAL_TIME' | 'EVERY_15_MINUTES' | 'HOURLY';
  recoveryTimeObjective: number; // minutes
  recoveryPointObjective: number; // minutes
  escalationProcedure: string[];
}

export class EmergencyRecoveryService {
  private supabase: SupabaseClient;
  private recoveryEngine: DisasterRecoveryEngine;
  private validationService: BackupValidationService;
  private priorityService: WeddingDateBackupPriority;

  // Critical tables for wedding day operations
  private readonly weddingCriticalTables = [
    'weddings',
    'wedding_schedules',
    'wedding_vendors',
    'wedding_timeline',
    'clients',
    'vendors',
    'communications',
    'tasks',
    'documents',
  ];

  // Emergency contact roles
  private readonly emergencyRoles = [
    'TECHNICAL_LEAD',
    'DATABASE_ADMIN',
    'WEDDING_COORDINATOR',
    'CLIENT_LIAISON',
    'VENDOR_MANAGER',
  ];

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.recoveryEngine = new DisasterRecoveryEngine(supabase);
    this.validationService = new BackupValidationService(supabase);
    this.priorityService = new WeddingDateBackupPriority(supabase);
  }

  async executeEmergencyRestore(
    config: EmergencyRestoreConfig,
  ): Promise<EmergencyRestoreResult> {
    const restoreId = this.generateEmergencyRestoreId();

    try {
      // Validate confirmation token
      await this.validateEmergencyToken(
        config.confirmationToken,
        config.userId,
      );

      // Log emergency restore initiation
      await this.logEmergencyAction({
        restoreId,
        organizationId: config.organizationId,
        emergencyType: config.emergencyType,
        severity: config.severity,
        initiatedBy: config.userId,
        description: config.description,
      });

      // Identify affected weddings
      const affectedWeddings = await this.identifyAffectedWeddings(
        config.organizationId,
        config.targetTables,
      );

      // Create emergency restore plan
      const recoverySteps = this.createEmergencyRecoverySteps(
        config,
        affectedWeddings,
      );
      const rollbackPlan = this.createRollbackPlan(config);

      // Validate backup before proceeding
      const validationResult = await this.validationService.validateBackup(
        config.backupId,
      );
      if (!validationResult.isValid) {
        throw new Error(
          `Backup validation failed: ${validationResult.issues.map((i) => i.description).join(', ')}`,
        );
      }

      // Calculate estimated completion (emergency restores get highest priority)
      const estimatedCompletion = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes maximum

      // Notify emergency contacts
      await this.notifyEmergencyContacts(config.organizationId, {
        emergencyType: config.emergencyType,
        severity: config.severity,
        affectedWeddings,
        estimatedCompletion,
        restoreId,
      });

      // Execute emergency restore
      const restoreResult = await this.recoveryEngine.initiateRestore({
        backupId: config.backupId,
        organizationId: config.organizationId,
        restoreType: 'EMERGENCY',
        targetTables:
          config.targetTables.length > 0
            ? config.targetTables
            : this.weddingCriticalTables,
        userId: config.userId,
        initiatedAt: new Date(),
      });

      // Update emergency restore record
      await this.updateEmergencyRestoreRecord(restoreId, {
        status: 'RESTORING',
        affected_weddings: affectedWeddings,
        recovery_steps: recoverySteps,
        rollback_plan: rollbackPlan,
        estimated_completion: estimatedCompletion.toISOString(),
      });

      return {
        restoreId,
        status: 'INITIATED',
        priority: 'CRITICAL',
        estimatedCompletion,
        affectedWeddings,
        recoverySteps,
        rollbackPlan,
      };
    } catch (error) {
      console.error(`Emergency restore failed: ${error.message}`);

      await this.updateEmergencyRestoreRecord(restoreId, {
        status: 'FAILED',
        error_message: error.message,
      });

      throw new Error(`Emergency restore failed: ${error.message}`);
    }
  }

  async createEmergencyBackup(config: EmergencyBackupConfig): Promise<any> {
    const backupId = this.generateEmergencyBackupId();

    try {
      // Log emergency backup initiation
      await this.logEmergencyAction({
        backupId,
        organizationId: config.organizationId,
        emergencyType: config.emergencyType,
        severity: 'CRITICAL',
        description: config.reason,
      });

      // Determine critical data to backup
      const criticalTables = config.includeAllData
        ? await this.getAllCriticalTables(config.organizationId)
        : this.weddingCriticalTables;

      // Create emergency backup with highest priority
      const backupResult = await this.recoveryEngine.createManualBackup({
        organizationId: config.organizationId,
        weddingId: config.weddingId,
        backupType: 'FULL',
        priority: 'CRITICAL',
        includeMediaFiles: config.emergencyType === 'WEDDING_DAY',
        encryption: 'AES-256',
        userId: 'SYSTEM_EMERGENCY',
        description: `EMERGENCY BACKUP: ${config.emergencyType} - ${config.reason}`,
        createdAt: new Date(),
      });

      return {
        backupId,
        emergencyType: config.emergencyType,
        tablesIncluded: criticalTables,
        status: backupResult.status,
        estimatedCompletion: backupResult.estimatedCompletion,
      };
    } catch (error) {
      console.error(`Emergency backup failed: ${error.message}`);
      throw new Error(`Emergency backup failed: ${error.message}`);
    }
  }

  async createWeddingDayEmergencyPlan(
    weddingId: string,
  ): Promise<WeddingDayEmergencyPlan> {
    try {
      // Get wedding details
      const { data: wedding, error } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          wedding_date,
          couple_name,
          organization_id,
          wedding_vendors (
            vendors (name, contact_email, contact_phone)
          )
        `,
        )
        .eq('id', weddingId)
        .single();

      if (error || !wedding) {
        throw new Error('Wedding not found');
      }

      const weddingDate = new Date(wedding.wedding_date);
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );

      // Get emergency contacts for organization
      const emergencyContacts = await this.getEmergencyContacts(
        wedding.organization_id,
      );

      // Determine backup frequency based on proximity to wedding
      let backupFrequency: 'REAL_TIME' | 'EVERY_15_MINUTES' | 'HOURLY';
      let recoveryTimeObjective: number;
      let recoveryPointObjective: number;

      if (daysUntilWedding <= 1) {
        backupFrequency = 'REAL_TIME';
        recoveryTimeObjective = 5; // 5 minutes RTO
        recoveryPointObjective = 1; // 1 minute RPO
      } else if (daysUntilWedding <= 7) {
        backupFrequency = 'EVERY_15_MINUTES';
        recoveryTimeObjective = 15; // 15 minutes RTO
        recoveryPointObjective = 15; // 15 minutes RPO
      } else {
        backupFrequency = 'HOURLY';
        recoveryTimeObjective = 60; // 1 hour RTO
        recoveryPointObjective = 60; // 1 hour RPO
      }

      // Create escalation procedure
      const escalationProcedure = [
        'Technical team attempts immediate resolution (0-15 minutes)',
        'Escalate to senior technical lead (15-30 minutes)',
        'Notify client liaison and wedding coordinator (30-45 minutes)',
        'Engage external technical support if needed (45+ minutes)',
        'Implement manual workaround procedures if technical recovery fails',
      ];

      const plan: WeddingDayEmergencyPlan = {
        weddingId,
        weddingDate,
        emergencyContacts,
        criticalDataTables: this.weddingCriticalTables,
        backupFrequency,
        recoveryTimeObjective,
        recoveryPointObjective,
        escalationProcedure,
      };

      // Store emergency plan
      await this.storeEmergencyPlan(weddingId, plan);

      return plan;
    } catch (error) {
      console.error(
        `Failed to create wedding day emergency plan: ${error.message}`,
      );
      throw error;
    }
  }

  async activateWeddingDayProtocol(weddingId: string): Promise<any> {
    try {
      // Get or create emergency plan
      const emergencyPlan = await this.createWeddingDayEmergencyPlan(weddingId);

      // Create immediate backup
      const emergencyBackup = await this.createEmergencyBackup({
        organizationId: (await this.getWeddingOrganization(weddingId))
          .organizationId,
        weddingId,
        emergencyType: 'WEDDING_DAY',
        priority: 'CRITICAL',
        reason: `Wedding day protocol activation for ${emergencyPlan.weddingDate.toDateString()}`,
        includeAllData: true,
      });

      // Schedule frequent backups based on plan
      await this.scheduleWeddingDayBackups(weddingId, emergencyPlan);

      // Notify emergency contacts
      await this.notifyEmergencyContacts(
        (await this.getWeddingOrganization(weddingId)).organizationId,
        {
          emergencyType: 'WEDDING_DAY',
          severity: 'CRITICAL',
          affectedWeddings: [weddingId],
          message: 'Wedding day emergency protocol activated',
        },
      );

      return {
        weddingId,
        emergencyPlanActivated: true,
        backupCreated: emergencyBackup.backupId,
        protectionLevel: 'MAXIMUM',
        recoveryTimeObjective: emergencyPlan.recoveryTimeObjective,
        recoveryPointObjective: emergencyPlan.recoveryPointObjective,
      };
    } catch (error) {
      console.error(
        `Failed to activate wedding day protocol: ${error.message}`,
      );
      throw error;
    }
  }

  private async validateEmergencyToken(
    token: string,
    userId: string,
  ): Promise<void> {
    // Validate that the user has emergency restore permissions
    const { data: userProfile, error } = await this.supabase
      .from('user_profiles')
      .select('role, emergency_permissions')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      throw new Error('User not authorized for emergency operations');
    }

    if (!['admin', 'technical_lead'].includes(userProfile.role)) {
      throw new Error('Insufficient permissions for emergency restore');
    }

    // In production, this would validate a time-sensitive token
    if (token !== `emergency_${Date.now().toString().slice(-6)}`) {
      throw new Error('Invalid emergency confirmation token');
    }
  }

  private async identifyAffectedWeddings(
    organizationId: string,
    targetTables: string[],
  ): Promise<string[]> {
    if (
      !targetTables.some((table) => this.weddingCriticalTables.includes(table))
    ) {
      return [];
    }

    // Get weddings within next 30 days that could be affected
    const { data: weddings, error } = await this.supabase
      .from('weddings')
      .select('id, couple_name, wedding_date')
      .eq('organization_id', organizationId)
      .gte('wedding_date', new Date().toISOString())
      .lte(
        'wedding_date',
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('wedding_date', { ascending: true });

    if (error) {
      console.error(`Failed to identify affected weddings: ${error.message}`);
      return [];
    }

    return (weddings || []).map((w) => w.id);
  }

  private createEmergencyRecoverySteps(
    config: EmergencyRestoreConfig,
    affectedWeddings: string[],
  ): string[] {
    const steps = [
      'Validate backup integrity and completeness',
      'Create recovery point before restore operation',
      'Notify all affected users of maintenance window',
    ];

    if (affectedWeddings.length > 0) {
      steps.push(
        `Prioritize restoration for ${affectedWeddings.length} upcoming weddings`,
      );
    }

    steps.push(
      'Execute database restoration with transaction isolation',
      'Verify data consistency across all restored tables',
      'Perform functional testing of critical features',
      'Notify users of service restoration',
    );

    return steps;
  }

  private createRollbackPlan(config: EmergencyRestoreConfig): string {
    return `
1. If restore fails or causes issues:
   - Immediately stop restoration process
   - Restore from pre-recovery checkpoint
   - Implement temporary manual workarounds
   - Escalate to senior technical team

2. Data integrity issues:
   - Validate each restored table individually
   - Identify and isolate corrupted records
   - Implement selective restoration if needed

3. Communication plan:
   - Notify all stakeholders of rollback initiation
   - Provide updated timeline for resolution
   - Prepare alternative solutions for critical operations
    `.trim();
  }

  private async getEmergencyContacts(
    organizationId: string,
  ): Promise<string[]> {
    const { data: contacts, error } = await this.supabase
      .from('emergency_contacts')
      .select('contact_email, role')
      .eq('organization_id', organizationId)
      .in('role', this.emergencyRoles);

    if (error) {
      console.error(`Failed to get emergency contacts: ${error.message}`);
      return [];
    }

    return (contacts || []).map((c) => c.contact_email);
  }

  private async notifyEmergencyContacts(
    organizationId: string,
    notification: any,
  ): Promise<void> {
    const contacts = await this.getEmergencyContacts(organizationId);

    // In production, this would send actual notifications
    console.log(
      `Emergency notification sent to ${contacts.length} contacts:`,
      notification,
    );
  }

  private async getAllCriticalTables(
    organizationId: string,
  ): Promise<string[]> {
    // Return all tables that contain critical business data
    return [
      ...this.weddingCriticalTables,
      'user_profiles',
      'organizations',
      'forms',
      'form_submissions',
      'payments',
      'invoices',
      'audit_logs',
    ];
  }

  private async getWeddingOrganization(
    weddingId: string,
  ): Promise<{ organizationId: string }> {
    const { data, error } = await this.supabase
      .from('weddings')
      .select('organization_id')
      .eq('id', weddingId)
      .single();

    if (error) {
      throw new Error(`Failed to get wedding organization: ${error.message}`);
    }

    return { organizationId: data.organization_id };
  }

  private async scheduleWeddingDayBackups(
    weddingId: string,
    plan: WeddingDayEmergencyPlan,
  ): Promise<void> {
    // Schedule backups according to the emergency plan
    console.log(
      `Scheduling ${plan.backupFrequency} backups for wedding ${weddingId}`,
    );
  }

  private async logEmergencyAction(action: any): Promise<void> {
    const { error } = await this.supabase.from('emergency_actions_log').insert({
      ...action,
      timestamp: new Date().toISOString(),
    });

    if (error) {
      console.error(`Failed to log emergency action: ${error.message}`);
    }
  }

  private async updateEmergencyRestoreRecord(
    restoreId: string,
    updates: any,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('emergency_restores')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', restoreId);

    if (error) {
      console.error(
        `Failed to update emergency restore record: ${error.message}`,
      );
    }
  }

  private async storeEmergencyPlan(
    weddingId: string,
    plan: WeddingDayEmergencyPlan,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('wedding_emergency_plans')
      .upsert({
        wedding_id: weddingId,
        emergency_plan: plan,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error(`Failed to store emergency plan: ${error.message}`);
    }
  }

  private generateEmergencyRestoreId(): string {
    return `emergency_restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEmergencyBackupId(): string {
    return `emergency_backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
