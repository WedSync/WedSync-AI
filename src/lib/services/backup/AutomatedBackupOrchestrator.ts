import { SupabaseClient } from '@supabase/supabase-js';
import { WeddingDateBackupPriority } from './WeddingDateBackupPriority';
import { BackupEncryptionService } from './BackupEncryptionService';

export interface BackupSchedule {
  organizationId: string;
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  customCron?: string;
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  userId: string;
  retentionDays?: number;
}

export interface ScheduledBackupResult {
  backupId: string;
  scheduledAt: Date;
  nextRun: Date;
  priority: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}

export interface BackupOverview {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  lastBackup: Date | null;
  nextScheduledBackup: Date | null;
  storageUsed: number;
  criticalWeddings: number;
}

export class AutomatedBackupOrchestrator {
  private supabase: SupabaseClient;
  private priorityService: WeddingDateBackupPriority;
  private encryptionService: BackupEncryptionService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.priorityService = new WeddingDateBackupPriority(supabase);
    this.encryptionService = new BackupEncryptionService();
  }

  async scheduleBackup(config: BackupSchedule): Promise<ScheduledBackupResult> {
    const backupId = this.generateBackupId();
    const scheduledAt = new Date();
    const nextRun = this.calculateNextRun(config.schedule, config.customCron);

    // Create backup schedule record
    const { error } = await this.supabase.from('backup_schedules').insert({
      id: backupId,
      organization_id: config.organizationId,
      schedule_type: config.schedule,
      custom_cron: config.customCron,
      backup_type: config.backupType,
      priority: config.priority,
      created_by: config.userId,
      scheduled_at: scheduledAt.toISOString(),
      next_run: nextRun.toISOString(),
      retention_days: config.retentionDays || 30,
      status: 'SCHEDULED',
    });

    if (error) {
      throw new Error(`Failed to schedule backup: ${error.message}`);
    }

    // If this is for a critical wedding period, increase priority
    const weddingPriority =
      await this.priorityService.calculateOrganizationPriority(
        config.organizationId,
      );
    if (weddingPriority === 'CRITICAL') {
      await this.updateBackupPriority(backupId, 'CRITICAL');
    }

    return {
      backupId,
      scheduledAt,
      nextRun,
      priority: weddingPriority === 'CRITICAL' ? 'CRITICAL' : config.priority,
      status: 'SCHEDULED',
    };
  }

  async getScheduledBackups(organizationId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('backup_schedules')
      .select(
        `
        *,
        backup_executions (
          id,
          status,
          started_at,
          completed_at,
          progress,
          error_message
        )
      `,
      )
      .eq('organization_id', organizationId)
      .eq('status', 'SCHEDULED')
      .order('next_run', { ascending: true });

    if (error) {
      throw new Error(`Failed to get scheduled backups: ${error.message}`);
    }

    return data || [];
  }

  async cancelScheduledBackup(scheduleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('backup_schedules')
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    if (error) {
      throw new Error(`Failed to cancel backup schedule: ${error.message}`);
    }
  }

  async getBackupOverview(organizationId: string): Promise<BackupOverview> {
    // Get backup statistics
    const { data: backupStats, error: statsError } = await this.supabase
      .from('backup_executions')
      .select('status, completed_at, file_size')
      .eq('organization_id', organizationId);

    if (statsError) {
      throw new Error(`Failed to get backup statistics: ${statsError.message}`);
    }

    // Get next scheduled backup
    const { data: nextBackup, error: nextError } = await this.supabase
      .from('backup_schedules')
      .select('next_run')
      .eq('organization_id', organizationId)
      .eq('status', 'SCHEDULED')
      .order('next_run', { ascending: true })
      .limit(1)
      .single();

    // Get critical weddings count
    const criticalWeddings =
      await this.priorityService.getCriticalWeddingsCount(organizationId);

    const totalBackups = backupStats?.length || 0;
    const successfulBackups =
      backupStats?.filter((b) => b.status === 'COMPLETED').length || 0;
    const failedBackups =
      backupStats?.filter((b) => b.status === 'FAILED').length || 0;
    const lastBackup = backupStats
      ?.filter((b) => b.completed_at)
      .sort(
        (a, b) =>
          new Date(b.completed_at).getTime() -
          new Date(a.completed_at).getTime(),
      )[0]?.completed_at
      ? new Date(backupStats[0].completed_at)
      : null;
    const storageUsed =
      backupStats?.reduce((sum, b) => sum + (b.file_size || 0), 0) || 0;

    return {
      totalBackups,
      successfulBackups,
      failedBackups,
      lastBackup,
      nextScheduledBackup: nextBackup ? new Date(nextBackup.next_run) : null,
      storageUsed,
      criticalWeddings,
    };
  }

  async getSystemBackupStatus(): Promise<any> {
    // System-wide backup monitoring (admin only)
    const { data: systemStats, error } = await this.supabase
      .from('backup_executions')
      .select(
        `
        organization_id,
        status,
        started_at,
        completed_at,
        file_size,
        organizations (
          name,
          subscription_tier
        )
      `,
      )
      .gte(
        'started_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get system backup status: ${error.message}`);
    }

    return {
      recentBackups: data || [],
      totalOrganizations: [...new Set(data?.map((b) => b.organization_id))]
        .length,
      activeBackups: data?.filter((b) => b.status === 'RUNNING').length || 0,
      failedBackups: data?.filter((b) => b.status === 'FAILED').length || 0,
    };
  }

  private generateBackupId(): string {
    return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextRun(schedule: string, customCron?: string): Date {
    const now = new Date();

    switch (schedule) {
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth;
      case 'CUSTOM':
        if (customCron) {
          // Simple cron parser for basic schedules
          return this.parseCronExpression(customCron);
        }
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private parseCronExpression(cron: string): Date {
    // Basic cron parsing - in production, use a proper cron library
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  private async updateBackupPriority(
    backupId: string,
    priority: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from('backup_schedules')
      .update({ priority })
      .eq('id', backupId);

    if (error) {
      console.error(`Failed to update backup priority: ${error.message}`);
    }
  }
}
