import { createClient } from '@/lib/supabase/server';

interface RetentionPolicy {
  severity: string;
  retentionDays: number;
  archiveAfterDays?: number;
}

export class AuditRetentionService {
  private static supabase = createClient();

  private static policies: RetentionPolicy[] = [
    { severity: 'critical', retentionDays: 2555, archiveAfterDays: 365 }, // 7 years, archive after 1 year
    { severity: 'warning', retentionDays: 1095, archiveAfterDays: 180 }, // 3 years, archive after 6 months
    { severity: 'info', retentionDays: 365, archiveAfterDays: 90 }, // 1 year, archive after 3 months
  ];

  static async enforceRetention(): Promise<void> {
    console.log('Starting audit log retention enforcement...');

    for (const policy of this.policies) {
      try {
        await this.processRetentionPolicy(policy);
      } catch (error) {
        console.error(
          `Retention enforcement failed for ${policy.severity}:`,
          error,
        );
      }
    }

    console.log('Audit log retention enforcement completed.');
  }

  private static async processRetentionPolicy(
    policy: RetentionPolicy,
  ): Promise<void> {
    // Archive old logs if policy specifies
    if (policy.archiveAfterDays) {
      await this.archiveBySeverity(policy);
    }

    // Delete expired logs
    await this.cleanupBySeverity(policy);
  }

  private static async archiveBySeverity(
    policy: RetentionPolicy,
  ): Promise<void> {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - policy.archiveAfterDays!);

    console.log(
      `Archiving ${policy.severity} logs older than ${archiveDate.toISOString()}`,
    );

    // Move old logs to archive table in batches to avoid timeouts
    const batchSize = 1000;
    let processedCount = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: logsToArchive, error: selectError } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('severity', policy.severity)
        .lt('timestamp', archiveDate.toISOString())
        .limit(batchSize);

      if (selectError) {
        throw selectError;
      }

      if (!logsToArchive || logsToArchive.length === 0) {
        hasMore = false;
        break;
      }

      // Insert into archive table
      const { error: archiveError } = await this.supabase
        .from('audit_logs_archive')
        .insert(logsToArchive);

      if (archiveError) {
        console.error(
          `Archive insertion failed for ${policy.severity}:`,
          archiveError,
        );
        throw archiveError;
      }

      // Delete from main table
      const idsToDelete = logsToArchive.map((log) => log.id);
      const { error: deleteError } = await this.supabase
        .from('audit_logs')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error(
          `Archive deletion failed for ${policy.severity}:`,
          deleteError,
        );
        throw deleteError;
      }

      processedCount += logsToArchive.length;
      console.log(`Archived ${processedCount} ${policy.severity} logs...`);

      hasMore = logsToArchive.length === batchSize;
    }

    console.log(
      `Completed archiving ${processedCount} ${policy.severity} logs`,
    );
  }

  private static async cleanupBySeverity(
    policy: RetentionPolicy,
  ): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(
      `Deleting ${policy.severity} logs older than ${cutoffDate.toISOString()}`,
    );

    // Delete from main table
    const { count: mainDeleteCount, error: mainDeleteError } =
      await this.supabase
        .from('audit_logs')
        .delete({ count: 'exact' })
        .eq('severity', policy.severity)
        .lt('timestamp', cutoffDate.toISOString());

    if (mainDeleteError) {
      console.error(
        `Main table cleanup failed for ${policy.severity}:`,
        mainDeleteError,
      );
      throw mainDeleteError;
    }

    // Delete from archive table
    const { count: archiveDeleteCount, error: archiveDeleteError } =
      await this.supabase
        .from('audit_logs_archive')
        .delete({ count: 'exact' })
        .eq('severity', policy.severity)
        .lt('timestamp', cutoffDate.toISOString());

    if (archiveDeleteError) {
      console.error(
        `Archive table cleanup failed for ${policy.severity}:`,
        archiveDeleteError,
      );
      throw archiveDeleteError;
    }

    console.log(
      `Deleted ${mainDeleteCount || 0} from main table, ${archiveDeleteCount || 0} from archive for ${policy.severity}`,
    );
  }

  static async getRetentionStats() {
    const stats = [];

    for (const policy of this.policies) {
      // Count main table
      const { count: mainCount } = await this.supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', policy.severity);

      // Count archive table
      const { count: archiveCount } = await this.supabase
        .from('audit_logs_archive')
        .select('*', { count: 'exact', head: true })
        .eq('severity', policy.severity);

      // Calculate dates for status
      const archiveDate = new Date();
      archiveDate.setDate(
        archiveDate.getDate() - (policy.archiveAfterDays || 0),
      );

      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() - policy.retentionDays);

      stats.push({
        severity: policy.severity,
        mainTableCount: mainCount || 0,
        archiveTableCount: archiveCount || 0,
        totalCount: (mainCount || 0) + (archiveCount || 0),
        retentionDays: policy.retentionDays,
        archiveAfterDays: policy.archiveAfterDays,
        nextArchiveDate: policy.archiveAfterDays
          ? archiveDate.toISOString()
          : null,
        nextDeleteDate: deleteDate.toISOString(),
      });
    }

    return {
      policies: stats,
      lastEnforced: await this.getLastEnforcementTime(),
      nextScheduled: await this.getNextScheduledTime(),
    };
  }

  private static async getLastEnforcementTime(): Promise<string | null> {
    // This would typically be stored in a system table
    return new Date().toISOString(); // Placeholder
  }

  private static async getNextScheduledTime(): Promise<string | null> {
    // Calculate next scheduled run (e.g., daily at 2 AM)
    const next = new Date();
    next.setHours(2, 0, 0, 0);
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  static async scheduleAutomaticRetention(): Promise<void> {
    // This would integrate with a job scheduler like cron or background jobs
    console.log('Automatic retention enforcement scheduled');

    // Run retention enforcement
    await this.enforceRetention();

    // Schedule next run
    setTimeout(
      () => {
        this.scheduleAutomaticRetention();
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours
  }
}
