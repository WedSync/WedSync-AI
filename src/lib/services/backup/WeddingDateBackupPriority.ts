import { SupabaseClient } from '@supabase/supabase-js';

export interface WeddingPriorityData {
  weddingId: string;
  weddingDate: Date;
  coupleName: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  daysUntilWedding: number;
  vendorCount: number;
  lastBackup: Date | null;
  backupFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  requiredBackupTypes: ('FULL' | 'INCREMENTAL' | 'DIFFERENTIAL')[];
}

export interface OrganizationPriorityMetrics {
  organizationId: string;
  overallPriority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  criticalWeddingsCount: number;
  highPriorityWeddingsCount: number;
  upcomingWeddings: WeddingPriorityData[];
  recommendedBackupFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';
  nextCriticalWeddingDate: Date | null;
}

export class WeddingDateBackupPriority {
  private supabase: SupabaseClient;

  // Priority thresholds in days
  private readonly CRITICAL_THRESHOLD = 7; // Within 7 days
  private readonly HIGH_THRESHOLD = 30; // Within 30 days
  private readonly NORMAL_THRESHOLD = 90; // Within 90 days

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async calculateOrganizationPriority(
    organizationId: string,
  ): Promise<'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'> {
    try {
      const upcomingWeddings = await this.getUpcomingWeddings(organizationId);

      if (upcomingWeddings.length === 0) {
        return 'LOW';
      }

      // Check for any critical weddings (within 7 days)
      const criticalWeddings = upcomingWeddings.filter(
        (w) => w.daysUntilWedding <= this.CRITICAL_THRESHOLD,
      );

      if (criticalWeddings.length > 0) {
        return 'CRITICAL';
      }

      // Check for high priority weddings (within 30 days)
      const highPriorityWeddings = upcomingWeddings.filter(
        (w) => w.daysUntilWedding <= this.HIGH_THRESHOLD,
      );

      if (highPriorityWeddings.length > 0) {
        return 'HIGH';
      }

      // Check for normal priority weddings (within 90 days)
      const normalPriorityWeddings = upcomingWeddings.filter(
        (w) => w.daysUntilWedding <= this.NORMAL_THRESHOLD,
      );

      if (normalPriorityWeddings.length > 0) {
        return 'NORMAL';
      }

      return 'LOW';
    } catch (error) {
      console.error(
        `Failed to calculate organization priority: ${error.message}`,
      );
      return 'NORMAL'; // Default to normal if calculation fails
    }
  }

  async getOrganizationPriorityMetrics(
    organizationId: string,
  ): Promise<OrganizationPriorityMetrics> {
    const upcomingWeddings = await this.getUpcomingWeddings(organizationId);

    const criticalWeddings = upcomingWeddings.filter(
      (w) => w.daysUntilWedding <= this.CRITICAL_THRESHOLD,
    );

    const highPriorityWeddings = upcomingWeddings.filter(
      (w) =>
        w.daysUntilWedding <= this.HIGH_THRESHOLD &&
        w.daysUntilWedding > this.CRITICAL_THRESHOLD,
    );

    // Determine overall priority
    let overallPriority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
    let recommendedBackupFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY';

    if (criticalWeddings.length > 0) {
      overallPriority = 'CRITICAL';
      recommendedBackupFrequency = 'HOURLY';
    } else if (highPriorityWeddings.length > 0) {
      overallPriority = 'HIGH';
      recommendedBackupFrequency = 'DAILY';
    } else if (upcomingWeddings.length > 0) {
      overallPriority = 'NORMAL';
      recommendedBackupFrequency = 'DAILY';
    } else {
      overallPriority = 'LOW';
      recommendedBackupFrequency = 'WEEKLY';
    }

    const nextCriticalWedding = criticalWeddings.sort(
      (a, b) => a.daysUntilWedding - b.daysUntilWedding,
    )[0];

    return {
      organizationId,
      overallPriority,
      criticalWeddingsCount: criticalWeddings.length,
      highPriorityWeddingsCount: highPriorityWeddings.length,
      upcomingWeddings: upcomingWeddings.slice(0, 10), // Top 10 upcoming
      recommendedBackupFrequency,
      nextCriticalWeddingDate: nextCriticalWedding
        ? nextCriticalWedding.weddingDate
        : null,
    };
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
          new Date(
            Date.now() + this.CRITICAL_THRESHOLD * 24 * 60 * 60 * 1000,
          ).toISOString(),
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

  async getWeddingBackupPriority(
    weddingId: string,
  ): Promise<WeddingPriorityData> {
    try {
      const { data: wedding, error } = await this.supabase
        .from('weddings')
        .select(
          `
          id,
          wedding_date,
          couple_name,
          organization_id,
          wedding_vendors (count)
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

      // Calculate priority based on days until wedding
      const priority = this.calculatePriorityFromDays(daysUntilWedding);

      // Get last backup info
      const { data: lastBackup } = await this.supabase
        .from('backup_executions')
        .select('completed_at')
        .eq('wedding_id', weddingId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const backupFrequency = this.getRecommendedBackupFrequency(priority);
      const requiredBackupTypes = this.getRequiredBackupTypes(
        priority,
        daysUntilWedding,
      );

      return {
        weddingId: wedding.id,
        weddingDate,
        coupleName: wedding.couple_name,
        priority,
        daysUntilWedding,
        vendorCount: wedding.wedding_vendors?.[0]?.count || 0,
        lastBackup: lastBackup ? new Date(lastBackup.completed_at) : null,
        backupFrequency,
        requiredBackupTypes,
      };
    } catch (error) {
      console.error(`Failed to get wedding backup priority: ${error.message}`);
      throw error;
    }
  }

  async getWeddingsRequiringBackup(
    organizationId: string,
    maxHoursSinceLastBackup: number = 24,
  ): Promise<WeddingPriorityData[]> {
    try {
      const upcomingWeddings = await this.getUpcomingWeddings(organizationId);
      const cutoffTime = new Date(
        Date.now() - maxHoursSinceLastBackup * 60 * 60 * 1000,
      );

      return upcomingWeddings.filter((wedding) => {
        // Include if no backup exists or last backup is older than cutoff
        if (!wedding.lastBackup || wedding.lastBackup < cutoffTime) {
          return true;
        }

        // For critical weddings, require more frequent backups
        if (
          wedding.priority === 'CRITICAL' &&
          wedding.lastBackup < new Date(Date.now() - 4 * 60 * 60 * 1000)
        ) {
          return true; // Backup every 4 hours for critical weddings
        }

        // For high priority weddings, require daily backups
        if (
          wedding.priority === 'HIGH' &&
          wedding.lastBackup < new Date(Date.now() - 12 * 60 * 60 * 1000)
        ) {
          return true; // Backup every 12 hours for high priority weddings
        }

        return false;
      });
    } catch (error) {
      console.error(
        `Failed to get weddings requiring backup: ${error.message}`,
      );
      return [];
    }
  }

  async scheduleWeddingBackups(organizationId: string): Promise<any[]> {
    try {
      const weddingsNeedingBackup =
        await this.getWeddingsRequiringBackup(organizationId);
      const scheduledBackups: any[] = [];

      for (const wedding of weddingsNeedingBackup) {
        const backupConfig = {
          organizationId,
          weddingId: wedding.weddingId,
          priority: wedding.priority,
          backupType: this.selectOptimalBackupType(wedding),
          scheduledFor: this.calculateOptimalBackupTime(wedding),
          reason: `Wedding in ${wedding.daysUntilWedding} days - ${wedding.priority} priority`,
        };

        scheduledBackups.push(backupConfig);
      }

      return scheduledBackups;
    } catch (error) {
      console.error(`Failed to schedule wedding backups: ${error.message}`);
      return [];
    }
  }

  private async getUpcomingWeddings(
    organizationId: string,
  ): Promise<WeddingPriorityData[]> {
    const { data: weddings, error } = await this.supabase
      .from('weddings')
      .select(
        `
        id,
        wedding_date,
        couple_name,
        wedding_vendors (count)
      `,
      )
      .eq('organization_id', organizationId)
      .gte('wedding_date', new Date().toISOString())
      .order('wedding_date', { ascending: true })
      .limit(50); // Get next 50 weddings

    if (error) {
      console.error(`Failed to get upcoming weddings: ${error.message}`);
      return [];
    }

    const weddingPromises = (weddings || []).map(async (wedding) => {
      const weddingDate = new Date(wedding.wedding_date);
      const daysUntilWedding = Math.ceil(
        (weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      const priority = this.calculatePriorityFromDays(daysUntilWedding);

      // Get last backup
      const { data: lastBackup } = await this.supabase
        .from('backup_executions')
        .select('completed_at')
        .eq('wedding_id', wedding.id)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const backupFrequency = this.getRecommendedBackupFrequency(priority);
      const requiredBackupTypes = this.getRequiredBackupTypes(
        priority,
        daysUntilWedding,
      );

      return {
        weddingId: wedding.id,
        weddingDate,
        coupleName: wedding.couple_name,
        priority,
        daysUntilWedding,
        vendorCount: wedding.wedding_vendors?.[0]?.count || 0,
        lastBackup: lastBackup ? new Date(lastBackup.completed_at) : null,
        backupFrequency,
        requiredBackupTypes,
      };
    });

    return await Promise.all(weddingPromises);
  }

  private calculatePriorityFromDays(
    daysUntilWedding: number,
  ): 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW' {
    if (daysUntilWedding <= this.CRITICAL_THRESHOLD) {
      return 'CRITICAL';
    } else if (daysUntilWedding <= this.HIGH_THRESHOLD) {
      return 'HIGH';
    } else if (daysUntilWedding <= this.NORMAL_THRESHOLD) {
      return 'NORMAL';
    } else {
      return 'LOW';
    }
  }

  private getRecommendedBackupFrequency(
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW',
  ): 'HOURLY' | 'DAILY' | 'WEEKLY' {
    switch (priority) {
      case 'CRITICAL':
        return 'HOURLY';
      case 'HIGH':
      case 'NORMAL':
        return 'DAILY';
      case 'LOW':
        return 'WEEKLY';
      default:
        return 'DAILY';
    }
  }

  private getRequiredBackupTypes(
    priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW',
    daysUntilWedding: number,
  ): ('FULL' | 'INCREMENTAL' | 'DIFFERENTIAL')[] {
    switch (priority) {
      case 'CRITICAL':
        // For critical weddings, do full backups more frequently
        return ['FULL', 'INCREMENTAL'];
      case 'HIGH':
        // Mix of full and incremental
        return daysUntilWedding <= 14
          ? ['FULL', 'INCREMENTAL']
          : ['INCREMENTAL', 'DIFFERENTIAL'];
      case 'NORMAL':
        // Mostly incremental with occasional full
        return ['INCREMENTAL', 'DIFFERENTIAL'];
      case 'LOW':
        // Lightweight backups
        return ['DIFFERENTIAL'];
      default:
        return ['INCREMENTAL'];
    }
  }

  private selectOptimalBackupType(
    wedding: WeddingPriorityData,
  ): 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' {
    // Select the most appropriate backup type based on priority and last backup
    const hoursSinceLastBackup = wedding.lastBackup
      ? (Date.now() - wedding.lastBackup.getTime()) / (1000 * 60 * 60)
      : 999;

    if (wedding.priority === 'CRITICAL') {
      // Full backup for critical weddings if more than 12 hours since last backup
      return hoursSinceLastBackup > 12 ? 'FULL' : 'INCREMENTAL';
    } else if (wedding.priority === 'HIGH') {
      // Full backup if more than 24 hours, otherwise incremental
      return hoursSinceLastBackup > 24 ? 'FULL' : 'INCREMENTAL';
    } else {
      // Differential backup for normal/low priority
      return hoursSinceLastBackup > 48 ? 'FULL' : 'DIFFERENTIAL';
    }
  }

  private calculateOptimalBackupTime(wedding: WeddingPriorityData): Date {
    const now = new Date();
    let optimalTime = new Date(now);

    if (wedding.priority === 'CRITICAL') {
      // Schedule immediately for critical weddings
      optimalTime.setMinutes(now.getMinutes() + 5);
    } else if (wedding.priority === 'HIGH') {
      // Schedule within the next hour for high priority
      optimalTime.setHours(now.getHours() + 1);
    } else {
      // Schedule during off-peak hours (2-5 AM) for normal/low priority
      optimalTime.setHours(3, 0, 0, 0);
      if (optimalTime <= now) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
    }

    return optimalTime;
  }
}
