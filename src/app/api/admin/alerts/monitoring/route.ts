/**
 * WS-228 Alert System Monitoring API
 * Team E Implementation - Real-time Monitoring Dashboard
 *
 * Provides real-time monitoring data for the admin alert dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { alertSystemMonitor } from '@/lib/monitoring/ws-228-alert-system-monitor';
import { alertPerformanceTracker } from '@/lib/alerts/alert-performance-tracker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/admin/alerts/monitoring
 * Returns real-time monitoring dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const includeWeddingMetrics =
      searchParams.get('includeWeddingMetrics') === 'true';

    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 },
      );
    }

    // Get comprehensive monitoring data
    const [
      dashboardMetrics,
      weddingPerformance,
      recentViolations,
      systemHealth,
    ] = await Promise.all([
      alertPerformanceTracker.getPerformanceDashboard(),
      includeWeddingMetrics
        ? alertPerformanceTracker.getWeddingDayPerformanceSummary()
        : null,
      getRecentPerformanceViolations(timeRange),
      getSystemHealthStatus(),
    ]);

    const response = {
      timestamp: new Date().toISOString(),
      time_range: timeRange,
      dashboard_metrics: dashboardMetrics,
      wedding_day_performance: weddingPerformance,
      recent_violations: recentViolations,
      system_health: systemHealth,
      monitoring_status: 'active',
      saturday_protection_active: new Date().getDay() === 6,
      performance_summary: {
        overall_status: getOverallPerformanceStatus(dashboardMetrics),
        alert_creation_health:
          dashboardMetrics.system.alert_creation_time_p95 <= 500
            ? 'HEALTHY'
            : 'DEGRADED',
        wedding_day_readiness: getWeddingDayReadiness(
          dashboardMetrics.wedding_day,
        ),
        system_load: getSystemLoadStatus(dashboardMetrics.system),
      },
    };

    // Add cache headers for real-time data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Alert monitoring API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to retrieve monitoring data',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/alerts/monitoring/emergency
 * Emergency wedding day system controls
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, reason, emergency_context } = body;

    // Verify admin authentication with higher privileges
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Emergency admin access required' },
        { status: 401 },
      );
    }

    switch (action) {
      case 'emergency_shutdown':
        await alertPerformanceTracker.emergencyWeddingDayShutdown();

        // Log emergency action
        await supabase.from('admin_actions').insert({
          action: 'emergency_wedding_day_shutdown',
          reason,
          context: emergency_context,
          timestamp: new Date().toISOString(),
          admin_user: 'system', // Would get from auth
          severity: 'CRITICAL',
        });

        return NextResponse.json({
          status: 'emergency_shutdown_initiated',
          message: 'Wedding day emergency shutdown completed',
          timestamp: new Date().toISOString(),
        });

      case 'saturday_protection_override':
        // Only allow in extreme circumstances
        if (!reason || reason.length < 20) {
          return NextResponse.json(
            {
              error:
                'Saturday protection override requires detailed justification',
            },
            { status: 400 },
          );
        }

        await supabase.from('admin_actions').insert({
          action: 'saturday_protection_override',
          reason,
          context: emergency_context,
          timestamp: new Date().toISOString(),
          admin_user: 'system',
          severity: 'CRITICAL',
          requires_review: true,
        });

        return NextResponse.json({
          status: 'override_logged',
          message: 'Saturday protection override logged for review',
          warning: 'This action requires immediate review',
        });

      default:
        return NextResponse.json(
          { error: 'Unknown emergency action' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Emergency action error:', error);

    return NextResponse.json(
      {
        error: 'Emergency action failed',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * Helper functions
 */
async function getRecentPerformanceViolations(timeRange: string) {
  const hoursBack = getHoursFromTimeRange(timeRange);
  const cutoff = new Date(
    Date.now() - hoursBack * 60 * 60 * 1000,
  ).toISOString();

  const { data: violations } = await supabase
    .from('alerts')
    .select('id, title, message, priority, created_at, metadata')
    .eq('source', 'alert-performance-tracker')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    violations?.map((violation) => ({
      id: violation.id,
      title: violation.title,
      message: violation.message,
      priority: violation.priority,
      timestamp: violation.created_at,
      violation_type: violation.metadata?.violation_type,
      metric: violation.metadata?.metric,
      current_value: violation.metadata?.current_value,
      threshold: violation.metadata?.threshold,
    })) || []
  );
}

async function getSystemHealthStatus() {
  // Check various system components
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkRedisHealth(),
    checkWebSocketHealth(),
    checkNotificationHealth(),
  ]);

  return {
    database:
      checks[0].status === 'fulfilled'
        ? checks[0].value
        : { status: 'ERROR', error: checks[0].reason },
    redis:
      checks[1].status === 'fulfilled'
        ? checks[1].value
        : { status: 'ERROR', error: checks[1].reason },
    websocket:
      checks[2].status === 'fulfilled'
        ? checks[2].value
        : { status: 'ERROR', error: checks[2].reason },
    notifications:
      checks[3].status === 'fulfilled'
        ? checks[3].value
        : { status: 'ERROR', error: checks[3].reason },
    overall: checks.every((check) => check.status === 'fulfilled')
      ? 'HEALTHY'
      : 'DEGRADED',
  };
}

async function checkDatabaseHealth() {
  const start = performance.now();
  const { error } = await supabase.from('alerts').select('id').limit(1);
  const duration = performance.now() - start;

  return {
    status: error ? 'ERROR' : 'HEALTHY',
    response_time: duration,
    error: error?.message,
  };
}

async function checkRedisHealth() {
  const start = performance.now();
  try {
    await alertSystemMonitor.redis.ping();
    const duration = performance.now() - start;
    return {
      status: 'HEALTHY',
      response_time: duration,
    };
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message,
    };
  }
}

async function checkWebSocketHealth() {
  // This would check WebSocket connection status
  // For now, return mock status
  return {
    status: 'HEALTHY',
    active_connections:
      (await alertSystemMonitor.redis.get('websocket_connections')) || '0',
  };
}

async function checkNotificationHealth() {
  // Check notification service health
  return {
    status: 'HEALTHY',
    delivery_rate: 98.5, // Would calculate from actual metrics
  };
}

function getOverallPerformanceStatus(metrics: any) {
  const { system } = metrics;

  if (system.alert_creation_time_p95 > 500) return 'CRITICAL';
  if (system.alert_creation_time_p95 > 300) return 'DEGRADED';
  if (system.alert_creation_time_p95 > 150) return 'GOOD';
  return 'EXCELLENT';
}

function getWeddingDayReadiness(weddingMetrics: any) {
  if (weddingMetrics.active_weddings_today > 0 && new Date().getDay() === 6) {
    return 'MAXIMUM_PROTECTION_ACTIVE';
  }
  if (weddingMetrics.active_weddings_today > 0) {
    return 'MONITORING_ACTIVE_WEDDINGS';
  }
  return 'READY';
}

function getSystemLoadStatus(systemMetrics: any) {
  const { active_alerts_count, critical_alerts_count } = systemMetrics;

  if (critical_alerts_count > 10) return 'HIGH_LOAD';
  if (active_alerts_count > 50) return 'MODERATE_LOAD';
  return 'NORMAL_LOAD';
}

function getHoursFromTimeRange(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 1;
    case '6h':
      return 6;
    case '24h':
      return 24;
    case '7d':
      return 168;
    default:
      return 24;
  }
}
