import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';

const statusLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many deployment status requests',
});

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await statusLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const environmentId = searchParams.get('environment_id');
    const targetType = searchParams.get('target_type');
    const targetId = searchParams.get('target_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supabase = createClient();

    // Get deployment targets
    let deploymentTargetsQuery = supabase
      .from('deployment_targets')
      .select('*')
      .eq('organization_id', organizationId);

    if (targetType) {
      deploymentTargetsQuery = deploymentTargetsQuery.eq('type', targetType);
    }

    if (targetId) {
      deploymentTargetsQuery = deploymentTargetsQuery.eq('target_id', targetId);
    }

    const { data: deploymentTargets } = await deploymentTargetsQuery;

    // Get recent sync results
    let syncResultsQuery = supabase
      .from('sync_results')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (environmentId) {
      syncResultsQuery = syncResultsQuery.eq('environment_id', environmentId);
    }

    if (targetId) {
      syncResultsQuery = syncResultsQuery.eq('target_id', targetId);
    }

    const { data: syncResults } = await syncResultsQuery;

    // Get deployment sync logs for additional context
    let syncLogsQuery = supabase
      .from('deployment_sync_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (environmentId) {
      syncLogsQuery = syncLogsQuery.eq('environment_id', environmentId);
    }

    if (targetType) {
      syncLogsQuery = syncLogsQuery.eq('target_type', targetType);
    }

    const { data: syncLogs } = await syncLogsQuery;

    // Calculate deployment statistics
    const stats = await calculateDeploymentStats(supabase, organizationId, {
      environmentId,
      targetType,
      targetId,
    });

    // Get active deployment targets status
    const targetStatuses = await Promise.all(
      (deploymentTargets || []).map(async (target) => {
        const recentSyncs =
          syncResults?.filter((sr) => sr.target_id === target.target_id) || [];
        const lastSync = recentSyncs[0];

        return {
          target_id: target.target_id,
          target_type: target.type,
          target_name: target.name,
          enabled: target.enabled,
          auto_sync: target.auto_sync,
          last_sync: lastSync
            ? {
                timestamp: lastSync.created_at,
                success: lastSync.success,
                variables_synced: lastSync.variables_synced,
                sync_duration_ms: lastSync.sync_duration_ms,
                environment_id: lastSync.environment_id,
              }
            : null,
          health_status: await checkTargetHealth(target, lastSync),
        };
      }),
    );

    // Check for any pending/in-progress syncs
    const { data: pendingSyncs } = await supabase
      .from('deployment_sync_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('success', false)
      .is('completed_at', null)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()); // Last 10 minutes

    // Wedding day status check
    const isWeddingDay = new Date().getDay() === 6;
    const weddingDayStatus = isWeddingDay
      ? await getWeddingDayDeploymentStatus(supabase, organizationId)
      : null;

    const response = {
      deployment_targets: targetStatuses,
      recent_syncs:
        syncResults?.map((sr) => ({
          sync_id: sr.id,
          target_id: sr.target_id,
          environment_id: sr.environment_id,
          timestamp: sr.created_at,
          success: sr.success,
          variables_synced: sr.variables_synced,
          variables_failed: sr.variables_failed,
          sync_duration_ms: sr.sync_duration_ms,
          errors: sr.errors || [],
        })) || [],
      deployment_logs:
        syncLogs?.map((sl) => ({
          log_id: sl.id,
          user_id: sl.user_id,
          target_type: sl.target_type,
          target_id: sl.target_id,
          environment_id: sl.environment_id,
          timestamp: sl.created_at,
          success: sl.success,
          wedding_day_deployment: sl.wedding_day_deployment,
          forced_deployment: sl.forced_deployment,
          dry_run: sl.dry_run,
          error_message: sl.error_message,
        })) || [],
      statistics: stats,
      pending_syncs: pendingSyncs?.length || 0,
      wedding_day: {
        is_wedding_day: isWeddingDay,
        deployment_restrictions: isWeddingDay,
        status: weddingDayStatus,
      },
      summary: {
        total_targets: deploymentTargets?.length || 0,
        active_targets:
          deploymentTargets?.filter((dt) => dt.enabled).length || 0,
        healthy_targets: targetStatuses.filter(
          (ts) => ts.health_status === 'healthy',
        ).length,
        recent_failures: syncResults?.filter((sr) => !sr.success).length || 0,
        avg_sync_duration: stats.avg_sync_duration_ms,
        success_rate_24h: stats.success_rate_24h,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Deployment status check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to get deployment status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper function to calculate deployment statistics
async function calculateDeploymentStats(
  supabase: any,
  organizationId: string,
  filters: { environmentId?: string; targetType?: string; targetId?: string },
): Promise<any> {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Base query
    let baseQuery = supabase
      .from('sync_results')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.environmentId) {
      baseQuery = baseQuery.eq('environment_id', filters.environmentId);
    }
    if (filters.targetId) {
      baseQuery = baseQuery.eq('target_id', filters.targetId);
    }

    // Get 24h stats
    const { data: syncs24h } = await baseQuery.gte(
      'created_at',
      last24h.toISOString(),
    );

    // Get 7d stats
    const { data: syncs7d } = await baseQuery.gte(
      'created_at',
      last7d.toISOString(),
    );

    const successful24h = syncs24h?.filter((s) => s.success).length || 0;
    const total24h = syncs24h?.length || 1;

    const avgDuration =
      syncs24h?.length > 0
        ? syncs24h.reduce(
            (sum, sync) => sum + (sync.sync_duration_ms || 0),
            0,
          ) / syncs24h.length
        : 0;

    return {
      success_rate_24h: Math.round((successful24h / total24h) * 100),
      total_syncs_24h: total24h,
      total_syncs_7d: syncs7d?.length || 0,
      avg_sync_duration_ms: Math.round(avgDuration),
      failed_syncs_24h: total24h - successful24h,
      variables_synced_24h:
        syncs24h?.reduce(
          (sum, sync) => sum + (sync.variables_synced || 0),
          0,
        ) || 0,
      most_active_target: getMostActiveTarget(syncs24h || []),
      peak_sync_hour: getPeakSyncHour(syncs24h || []),
    };
  } catch (error) {
    console.error('Error calculating deployment stats:', error);
    return {
      success_rate_24h: 0,
      total_syncs_24h: 0,
      total_syncs_7d: 0,
      avg_sync_duration_ms: 0,
      failed_syncs_24h: 0,
      variables_synced_24h: 0,
    };
  }
}

// Helper function to check target health
async function checkTargetHealth(
  target: any,
  lastSync: any,
): Promise<'healthy' | 'degraded' | 'critical' | 'unknown'> {
  try {
    if (!lastSync) {
      return 'unknown';
    }

    const lastSyncTime = new Date(lastSync.created_at);
    const now = new Date();
    const hoursSinceLastSync =
      (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

    // If last sync failed
    if (!lastSync.success) {
      return hoursSinceLastSync < 24 ? 'critical' : 'degraded';
    }

    // If last sync was more than 7 days ago
    if (hoursSinceLastSync > 7 * 24) {
      return 'degraded';
    }

    return 'healthy';
  } catch (error) {
    return 'unknown';
  }
}

// Helper function to get wedding day deployment status
async function getWeddingDayDeploymentStatus(
  supabase: any,
  organizationId: string,
): Promise<any> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check for any deployments today
    const { data: todaysDeployments } = await supabase
      .from('deployment_sync_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', today);

    // Check emergency contacts
    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      deployments_today: todaysDeployments?.length || 0,
      forced_deployments_today:
        todaysDeployments?.filter((d) => d.forced_deployment).length || 0,
      emergency_contacts_available: (emergencyContacts?.length || 0) > 0,
      read_only_mode_active: true,
      deployment_restrictions: [
        'All deployments require force=true flag',
        'Emergency contacts will be notified',
        'Extra validation and rollback procedures active',
        'Production changes strongly discouraged',
      ],
    };
  } catch (error) {
    console.error('Error getting wedding day status:', error);
    return {
      deployments_today: 0,
      forced_deployments_today: 0,
      emergency_contacts_available: false,
      read_only_mode_active: true,
    };
  }
}

// Helper function to get most active deployment target
function getMostActiveTarget(syncs: any[]): string | null {
  if (syncs.length === 0) return null;

  const targetCounts = syncs.reduce(
    (acc, sync) => {
      acc[sync.target_id] = (acc[sync.target_id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    Object.entries(targetCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null
  );
}

// Helper function to get peak sync hour
function getPeakSyncHour(syncs: any[]): number | null {
  if (syncs.length === 0) return null;

  const hourCounts = syncs.reduce(
    (acc, sync) => {
      const hour = new Date(sync.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  return parseInt(
    Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '0',
  );
}
