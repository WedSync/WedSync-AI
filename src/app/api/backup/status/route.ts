import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get recent backup jobs
    const { data: backupJobs, error: jobsError } = await supabase
      .from('backup_jobs')
      .select(
        `
        *,
        backup_snapshots(*)
      `,
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('Error fetching backup jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch backup status' },
        { status: 500 },
      );
    }

    // Get system backup statistics
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_backup_system_stats',
    );

    const backupStats = stats || {
      total_backups: 0,
      successful_backups: 0,
      failed_backups: 0,
      total_data_backed_up_gb: 0,
      last_successful_backup: null,
      upcoming_weddings_protected: 0,
    };

    // Get active recovery operations
    const { data: activeRecoveries, error: recoveryError } = await supabase
      .from('recovery_operations')
      .select('*')
      .in('status', ['initiated', 'in-progress'])
      .order('started_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        recentBackups: backupJobs || [],
        systemStats: backupStats,
        activeRecoveries: activeRecoveries || [],
        systemHealth: calculateSystemHealth(backupJobs, backupStats),
      },
    });
  } catch (error) {
    console.error('Backup status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

function calculateSystemHealth(backupJobs: any[], stats: any) {
  const recentJobs = backupJobs.slice(0, 5);
  const successfulRecent = recentJobs.filter(
    (job) => job.status === 'completed',
  ).length;
  const successRate =
    recentJobs.length > 0 ? (successfulRecent / recentJobs.length) * 100 : 100;

  let healthStatus = 'excellent';
  if (successRate < 80) {
    healthStatus = 'poor';
  } else if (successRate < 95) {
    healthStatus = 'fair';
  } else if (successRate < 100) {
    healthStatus = 'good';
  }

  return {
    status: healthStatus,
    successRate: Math.round(successRate),
    lastBackupAge: getLastBackupAge(stats.last_successful_backup),
    recommendations: getHealthRecommendations(successRate, stats),
  };
}

function getLastBackupAge(lastBackup: string | null): string {
  if (!lastBackup) return 'Unknown';

  const lastBackupDate = new Date(lastBackup);
  const now = new Date();
  const diffHours = Math.floor(
    (now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60),
  );

  if (diffHours < 1) return 'Less than 1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

function getHealthRecommendations(successRate: number, stats: any): string[] {
  const recommendations = [];

  if (successRate < 95) {
    recommendations.push(
      'Review failed backup jobs and address underlying issues',
    );
  }

  if (stats.upcoming_weddings_protected < 5) {
    recommendations.push(
      'Ensure upcoming weddings have proper backup coverage',
    );
  }

  if (
    !stats.last_successful_backup ||
    new Date().getTime() - new Date(stats.last_successful_backup).getTime() >
      25 * 60 * 60 * 1000
  ) {
    recommendations.push(
      'Schedule immediate backup - last successful backup is over 25 hours old',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Backup system is operating optimally');
  }

  return recommendations;
}
