/**
 * WS-234 Database Health Monitoring API
 * GET /api/admin/database/health
 *
 * Real-time database health monitoring with wedding season optimizations
 * Admin-only access with comprehensive security
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { DatabaseHealthMonitor } from '@/lib/monitoring/database-health-monitor';
import { ratelimit } from '@/lib/ratelimit';

// Rate limiting: 60 requests per minute for health monitoring
const healthMonitorRateLimit = ratelimit({
  limiter: 'sliding_window_log',
  max: 60,
  window: '1 m',
});

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const { success, limit, reset, remaining } =
      await healthMonitorRateLimit.limit(request.ip || 'anonymous');

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for database health monitoring',
          limit,
          reset,
          remaining: 0,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        },
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify authentication and admin role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required for database health monitoring' },
        { status: 401 },
      );
    }

    // Check admin role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required for database health monitoring' },
        { status: 403 },
      );
    }

    // Get query parameters for customization
    const searchParams = request.nextUrl.searchParams;
    const includeQueryDetails = searchParams.get('includeQueries') === 'true';
    const includeIndexDetails = searchParams.get('includeIndexes') === 'true';
    const includeMaintenance =
      searchParams.get('includeMaintenance') === 'true';

    // Initialize database health monitor
    const healthMonitor = DatabaseHealthMonitor.getInstance();

    // Get comprehensive health metrics
    const healthMetrics = await healthMonitor.checkDatabaseHealth();

    // Prepare response with conditional details
    const response: any = {
      success: true,
      data: {
        overallStatus: healthMetrics.status,
        connectionPool: {
          active: healthMetrics.connectionPool.active,
          idle: healthMetrics.connectionPool.idle,
          total: healthMetrics.connectionPool.total,
          maxConnections: healthMetrics.connectionPool.maxConnections,
          utilizationPercent: healthMetrics.connectionPool.utilizationPercent,
          status: healthMetrics.connectionPool.status,
          weddingSeasonAdjusted:
            healthMetrics.connectionPool.weddingSeasonAdjusted,
          peakDetected: healthMetrics.connectionPool.peakDetected,
          idleInTransaction: healthMetrics.connectionPool.idleInTransaction,
          waiting: healthMetrics.connectionPool.waiting,
        },
        storage: {
          used: healthMetrics.storage.used,
          available: healthMetrics.storage.available,
          percentage: healthMetrics.storage.percentage,
          prettySize: healthMetrics.storage.prettySize,
          maxSize: healthMetrics.storage.maxSize,
          status: healthMetrics.storage.status,
          weddingDataPercentage: healthMetrics.storage.weddingDataPercentage,
          growthRateMbPerDay: healthMetrics.storage.growthRateMbPerDay,
          projectedFullDate: healthMetrics.storage.projectedFullDate,
          largestTables: healthMetrics.storage.largestTables.slice(0, 10), // Top 10 only
        },
        queryPerformance: {
          avgTime: healthMetrics.queryPerformance.avgTime,
          p95Time: healthMetrics.queryPerformance.p95Time,
          p99Time: healthMetrics.queryPerformance.p99Time,
          totalQueries: healthMetrics.queryPerformance.totalQueries,
          status: healthMetrics.queryPerformance.status,
          criticalQueries: healthMetrics.queryPerformance.criticalQueries,
          weddingSeasonImpact:
            healthMetrics.queryPerformance.weddingSeasonImpact,
          // Include slow queries only if requested
          ...(includeQueryDetails && {
            slowQueries: healthMetrics.queryPerformance.slowQueries.slice(
              0,
              20,
            ),
          }),
        },
        locks: {
          blockingQueries: healthMetrics.locks.blockingQueries,
          blockedQueries: healthMetrics.locks.blockedQueries,
          totalLocks: healthMetrics.locks.totalLocks,
          longestWaitMs: healthMetrics.locks.longestWaitMs,
          weddingCriticalLocks: healthMetrics.locks.weddingCriticalLocks,
          status: healthMetrics.locks.status,
          lockTypes: healthMetrics.locks.lockTypes,
          // Include blocking query details only if requested
          ...(includeQueryDetails && {
            blockingQueryDetails:
              healthMetrics.locks.blockingQueryDetails.slice(0, 10),
          }),
        },
        // Include index health only if requested
        ...(includeIndexDetails && {
          indexHealth: {
            totalIndexes: healthMetrics.indexHealth.totalIndexes,
            healthyIndexes: healthMetrics.indexHealth.healthyIndexes,
            weddingCriticalIndexes:
              healthMetrics.indexHealth.weddingCriticalIndexes,
            status: healthMetrics.indexHealth.status,
            unusedIndexes: healthMetrics.indexHealth.unusedIndexes.slice(0, 10),
            bloatedIndexes: healthMetrics.indexHealth.bloatedIndexes.slice(
              0,
              10,
            ),
            missingIndexRecommendations:
              healthMetrics.indexHealth.missingIndexRecommendations.slice(0, 5),
          },
        }),
        tableBloat: {
          totalBloat: healthMetrics.tableBloat.totalBloat,
          reclaimableSpace: healthMetrics.tableBloat.reclaimableSpace,
          maintenanceRequired: healthMetrics.tableBloat.maintenanceRequired,
          status: healthMetrics.tableBloat.status,
          bloatedTablesCount: healthMetrics.tableBloat.bloatedTables.length,
          // Include detailed bloated tables only if requested
          ...(includeMaintenance && {
            bloatedTables: healthMetrics.tableBloat.bloatedTables.slice(0, 10),
          }),
        },
        weddingSeasonContext: healthMetrics.weddingSeasonContext,
        lastUpdated: healthMetrics.lastChecked,
        refreshInterval: 30000, // 30 seconds
        metadata: {
          monitoringActive: true,
          nextDeepAnalysis: new Date(Date.now() + 300000).toISOString(), // Next 5 minutes
          thresholdsAdjusted:
            healthMetrics.weddingSeasonContext.adjustedThresholds,
          criticalAlerts: await getCriticalAlertCount(supabase),
          uptime: await getDatabaseUptime(supabase),
        },
      },
      timestamp: new Date().toISOString(),
    };

    // Add performance advisory if needed
    if (healthMetrics.status === 'critical') {
      response.advisory = {
        level: 'critical',
        message: 'Critical database performance issues detected',
        recommendedActions: await getEmergencyActions(healthMetrics),
        escalationRequired: true,
      };
    } else if (healthMetrics.status === 'warning') {
      response.advisory = {
        level: 'warning',
        message: 'Database performance degradation detected',
        recommendedActions: await getRecommendedActions(healthMetrics),
        escalationRequired: false,
      };
    }

    // Log health check access for security audit
    await logHealthCheckAccess(supabase, user.id, request.ip || 'unknown');

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, must-revalidate',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
        'X-Database-Status': healthMetrics.status,
        'X-Wedding-Season':
          healthMetrics.weddingSeasonContext.isWeddingSeason.toString(),
      },
    });
  } catch (error) {
    console.error('Database health monitoring API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error in database health monitoring',
        message: 'Failed to retrieve database health metrics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Get count of critical alerts from the database
 */
async function getCriticalAlertCount(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('database_health_metrics')
      .select('id', { count: 'exact' })
      .eq('status', 'critical')
      .gte('measured_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .is('resolved_at', null);

    return error ? 0 : data?.length || 0;
  } catch {
    return 0;
  }
}

/**
 * Get database uptime information
 */
async function getDatabaseUptime(supabase: any): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('execute_sql', {
      sql: `SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime_seconds;`,
    });

    if (error || !data?.[0]?.uptime_seconds) return 'Unknown';

    const uptimeSeconds = data[0].uptime_seconds;
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);

    return `${days}d ${hours}h`;
  } catch {
    return 'Unknown';
  }
}

/**
 * Get emergency actions for critical status
 */
async function getEmergencyActions(healthMetrics: any): Promise<string[]> {
  const actions: string[] = [];

  if (healthMetrics.connectionPool.status === 'critical') {
    actions.push('Kill idle connections immediately');
    actions.push('Scale connection pool if possible');
  }

  if (healthMetrics.storage.status === 'critical') {
    actions.push('Clean up old logs and temporary data');
    actions.push('Archive historical data');
    actions.push('Consider emergency storage expansion');
  }

  if (healthMetrics.queryPerformance.status === 'critical') {
    actions.push('Identify and kill slow queries');
    actions.push('Enable emergency query timeout');
    actions.push('Review recent deployment changes');
  }

  if (actions.length === 0) {
    actions.push('Contact database administrator immediately');
    actions.push('Check for ongoing maintenance or issues');
  }

  return actions;
}

/**
 * Get recommended actions for warning status
 */
async function getRecommendedActions(healthMetrics: any): Promise<string[]> {
  const actions: string[] = [];

  if (healthMetrics.connectionPool.status === 'warning') {
    actions.push('Monitor connection usage patterns');
    actions.push('Consider connection pooling optimization');
  }

  if (healthMetrics.storage.status === 'warning') {
    actions.push('Schedule maintenance for data cleanup');
    actions.push('Review storage growth trends');
  }

  if (healthMetrics.queryPerformance.status === 'warning') {
    actions.push('Review slow query reports');
    actions.push('Consider index optimization');
  }

  if (healthMetrics.tableBloat.maintenanceRequired) {
    actions.push('Schedule VACUUM operations for bloated tables');
    actions.push('Plan for off-peak maintenance window');
  }

  return actions;
}

/**
 * Log health check access for security audit
 */
async function logHealthCheckAccess(
  supabase: any,
  userId: string,
  ipAddress: string,
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert([
      {
        user_id: userId,
        action: 'database_health_check',
        resource_type: 'admin_api',
        resource_id: 'database_health',
        ip_address: ipAddress,
        user_agent: 'Database Health Monitor',
        metadata: {
          endpoint: '/api/admin/database/health',
          timestamp: new Date().toISOString(),
        },
      },
    ]);
  } catch (error) {
    console.error('Failed to log health check access:', error);
    // Don't fail the health check if audit logging fails
  }
}
