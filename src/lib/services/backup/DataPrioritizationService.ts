import { SupabaseClient } from '@supabase/supabase-js';

export interface TablePriority {
  tableName: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  backupFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  retentionDays: number;
  encryptionRequired: boolean;
}

export interface WeddingPriorityMetrics {
  daysUntilWedding: number;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  vendorCount: number;
  clientDataSize: number;
  mediaFilesCount: number;
  lastBackup: Date | null;
}

export class DataPrioritizationService {
  private supabase: SupabaseClient;

  // Wedding-critical table priorities
  private readonly tablePriorities: Map<string, TablePriority> = new Map([
    // CRITICAL - Wedding day essential data
    [
      'weddings',
      {
        tableName: 'weddings',
        priority: 'CRITICAL',
        backupFrequency: 'HOURLY',
        retentionDays: 365,
        encryptionRequired: true,
      },
    ],
    [
      'wedding_schedules',
      {
        tableName: 'wedding_schedules',
        priority: 'CRITICAL',
        backupFrequency: 'HOURLY',
        retentionDays: 365,
        encryptionRequired: true,
      },
    ],
    [
      'clients',
      {
        tableName: 'clients',
        priority: 'CRITICAL',
        backupFrequency: 'HOURLY',
        retentionDays: 365,
        encryptionRequired: true,
      },
    ],
    [
      'vendors',
      {
        tableName: 'vendors',
        priority: 'CRITICAL',
        backupFrequency: 'DAILY',
        retentionDays: 365,
        encryptionRequired: true,
      },
    ],

    // HIGH - Business essential data
    [
      'organizations',
      {
        tableName: 'organizations',
        priority: 'HIGH',
        backupFrequency: 'DAILY',
        retentionDays: 180,
        encryptionRequired: true,
      },
    ],
    [
      'user_profiles',
      {
        tableName: 'user_profiles',
        priority: 'HIGH',
        backupFrequency: 'DAILY',
        retentionDays: 180,
        encryptionRequired: true,
      },
    ],
    [
      'forms',
      {
        tableName: 'forms',
        priority: 'HIGH',
        backupFrequency: 'DAILY',
        retentionDays: 180,
        encryptionRequired: false,
      },
    ],
    [
      'form_submissions',
      {
        tableName: 'form_submissions',
        priority: 'HIGH',
        backupFrequency: 'DAILY',
        retentionDays: 180,
        encryptionRequired: true,
      },
    ],

    // NORMAL - Important operational data
    [
      'communications',
      {
        tableName: 'communications',
        priority: 'NORMAL',
        backupFrequency: 'DAILY',
        retentionDays: 90,
        encryptionRequired: false,
      },
    ],
    [
      'tasks',
      {
        tableName: 'tasks',
        priority: 'NORMAL',
        backupFrequency: 'DAILY',
        retentionDays: 90,
        encryptionRequired: false,
      },
    ],
    [
      'documents',
      {
        tableName: 'documents',
        priority: 'NORMAL',
        backupFrequency: 'DAILY',
        retentionDays: 90,
        encryptionRequired: true,
      },
    ],

    // LOW - System and audit data
    [
      'audit_logs',
      {
        tableName: 'audit_logs',
        priority: 'LOW',
        backupFrequency: 'WEEKLY',
        retentionDays: 30,
        encryptionRequired: false,
      },
    ],
    [
      'system_logs',
      {
        tableName: 'system_logs',
        priority: 'LOW',
        backupFrequency: 'WEEKLY',
        retentionDays: 30,
        encryptionRequired: false,
      },
    ],
    [
      'analytics_events',
      {
        tableName: 'analytics_events',
        priority: 'LOW',
        backupFrequency: 'WEEKLY',
        retentionDays: 30,
        encryptionRequired: false,
      },
    ],
  ]);

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async calculateWeddingPriority(
    weddingId: string,
  ): Promise<'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'> {
    try {
      // Get wedding details
      const { data: wedding, error } = await this.supabase
        .from('weddings')
        .select('wedding_date, couple_name')
        .eq('id', weddingId)
        .single();

      if (error || !wedding) {
        return 'NORMAL';
      }

      const weddingDate = new Date(wedding.wedding_date);
      const now = new Date();
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Priority based on days until wedding
      if (daysUntilWedding <= 7) {
        return 'CRITICAL'; // Wedding within a week
      } else if (daysUntilWedding <= 30) {
        return 'HIGH'; // Wedding within a month
      } else if (daysUntilWedding <= 90) {
        return 'NORMAL'; // Wedding within 3 months
      } else {
        return 'LOW'; // Wedding more than 3 months away
      }
    } catch (error) {
      console.error(`Failed to calculate wedding priority: ${error.message}`);
      return 'NORMAL';
    }
  }

  async calculateOrganizationPriority(
    organizationId: string,
  ): Promise<'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'> {
    try {
      // Get upcoming weddings for organization
      const { data: upcomingWeddings, error } = await this.supabase
        .from('weddings')
        .select('wedding_date')
        .eq('organization_id', organizationId)
        .gte('wedding_date', new Date().toISOString())
        .order('wedding_date', { ascending: true })
        .limit(5);

      if (error) {
        return 'NORMAL';
      }

      if (!upcomingWeddings || upcomingWeddings.length === 0) {
        return 'LOW';
      }

      // Check for critical weddings (within 7 days)
      const criticalWeddings = upcomingWeddings.filter((wedding) => {
        const weddingDate = new Date(wedding.wedding_date);
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        return daysUntil <= 7;
      });

      if (criticalWeddings.length > 0) {
        return 'CRITICAL';
      }

      // Check for high priority weddings (within 30 days)
      const highPriorityWeddings = upcomingWeddings.filter((wedding) => {
        const weddingDate = new Date(wedding.wedding_date);
        const daysUntil = Math.ceil(
          (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        return daysUntil <= 30;
      });

      if (highPriorityWeddings.length > 0) {
        return 'HIGH';
      }

      return 'NORMAL';
    } catch (error) {
      console.error(
        `Failed to calculate organization priority: ${error.message}`,
      );
      return 'NORMAL';
    }
  }

  async getTablesForBackup(
    organizationId: string,
    backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL',
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW',
  ): Promise<string[]> {
    const tables: string[] = [];

    // Always include critical tables for any backup
    if (priority === 'CRITICAL' || backupType === 'FULL') {
      this.tablePriorities.forEach((config, tableName) => {
        if (config.priority === 'CRITICAL') {
          tables.push(tableName);
        }
      });
    }

    // Include high priority tables for high priority backups or full backups
    if (
      priority === 'HIGH' ||
      priority === 'CRITICAL' ||
      backupType === 'FULL'
    ) {
      this.tablePriorities.forEach((config, tableName) => {
        if (config.priority === 'HIGH' && !tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    // Include normal priority tables for full backups or normal priority
    if (backupType === 'FULL' || priority === 'NORMAL') {
      this.tablePriorities.forEach((config, tableName) => {
        if (config.priority === 'NORMAL' && !tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    // Include low priority tables only for full backups
    if (backupType === 'FULL') {
      this.tablePriorities.forEach((config, tableName) => {
        if (config.priority === 'LOW' && !tables.includes(tableName)) {
          tables.push(tableName);
        }
      });
    }

    return tables;
  }

  async getCriticalWeddingsCount(organizationId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('weddings')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte('wedding_date', new Date().toISOString())
        .lte(
          'wedding_date',
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error) {
        console.error(
          `Failed to get critical weddings count: ${error.message}`,
        );
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error(`Failed to get critical weddings count: ${error.message}`);
      return 0;
    }
  }

  async getWeddingPriorityMetrics(
    weddingId: string,
  ): Promise<WeddingPriorityMetrics> {
    try {
      // Get wedding details with related data
      const { data: wedding, error } = await this.supabase
        .from('weddings')
        .select(
          `
          wedding_date,
          couple_name,
          organization_id,
          vendors (count),
          clients (count),
          documents (count)
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

      // Calculate priority
      let priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
      if (daysUntilWedding <= 7) {
        priority = 'CRITICAL';
      } else if (daysUntilWedding <= 30) {
        priority = 'HIGH';
      } else if (daysUntilWedding <= 90) {
        priority = 'NORMAL';
      } else {
        priority = 'LOW';
      }

      // Get last backup info
      const { data: lastBackup } = await this.supabase
        .from('backup_executions')
        .select('completed_at')
        .eq('wedding_id', weddingId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      return {
        daysUntilWedding,
        priority,
        vendorCount: wedding.vendors?.[0]?.count || 0,
        clientDataSize: 0, // Would calculate actual data size
        mediaFilesCount: wedding.documents?.[0]?.count || 0,
        lastBackup: lastBackup ? new Date(lastBackup.completed_at) : null,
      };
    } catch (error) {
      console.error(`Failed to get wedding priority metrics: ${error.message}`);
      throw error;
    }
  }

  async getTablePriority(tableName: string): Promise<TablePriority | null> {
    return this.tablePriorities.get(tableName) || null;
  }

  async shouldEncryptTable(tableName: string): Promise<boolean> {
    const priority = this.tablePriorities.get(tableName);
    return priority?.encryptionRequired || false;
  }

  async getBackupFrequency(
    tableName: string,
  ): Promise<'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY'> {
    const priority = this.tablePriorities.get(tableName);
    return priority?.backupFrequency || 'DAILY';
  }

  async getRetentionPeriod(tableName: string): Promise<number> {
    const priority = this.tablePriorities.get(tableName);
    return priority?.retentionDays || 30;
  }

  getAllTablePriorities(): Map<string, TablePriority> {
    return new Map(this.tablePriorities);
  }
}
