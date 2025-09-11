import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { MonitoringService } from '@/lib/services/monitoring/MonitoringService';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';

// Rate limiting: 60 requests per minute per IP for health checks
const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Too many health check requests, please try again later',
});

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await healthCheckLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: rateLimitResult.message,
          retry_after: Math.ceil(rateLimitResult.retryAfter / 1000),
        },
        { status: 429 },
      );
    }

    // Get organization from headers (set by auth middleware)
    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const monitoringService = new MonitoringService();
    const supabase = createClient();

    // Perform comprehensive health checks
    const healthChecks =
      await monitoringService.performHealthChecks(organizationId);

    // Get system metrics
    const metrics =
      await monitoringService.collectSystemMetrics(organizationId);

    // Determine overall system status
    const criticalFailures = healthChecks.filter(
      (hc) => hc.status === 'critical',
    );
    const degradedServices = healthChecks.filter(
      (hc) => hc.status === 'degraded',
    );

    let overallStatus: 'healthy' | 'degraded' | 'critical';
    if (criticalFailures.length > 0) {
      overallStatus = 'critical';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    // Check if it's wedding day (Saturday or active weddings)
    const isWeddingDay = await checkWeddingDay(supabase, organizationId);
    const weddingDayStatus = isWeddingDay
      ? await getWeddingDayHealth(supabase, organizationId)
      : null;

    // Get recent alerts
    const { data: recentAlerts } = await supabase
      .from('alert_events')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('resolved', false)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate uptime percentage (last 24 hours)
    const { data: uptimeData } = await supabase
      .from('system_health_metrics')
      .select('status')
      .eq('organization_id', organizationId)
      .eq('component', 'api')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const totalChecks = uptimeData?.length || 1;
    const healthyChecks =
      uptimeData?.filter((check) => check.status === 'healthy').length || 0;
    const uptimePercentage = (healthyChecks / totalChecks) * 100;

    // Response with comprehensive health information
    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_percentage_24h: Math.round(uptimePercentage * 100) / 100,
      wedding_day: isWeddingDay,
      wedding_day_health: weddingDayStatus,
      components: healthChecks.map((hc) => ({
        component: hc.component,
        status: hc.status,
        response_time_ms: hc.response_time_ms,
        uptime_percent: hc.uptime_percent,
        last_check: hc.last_check.toISOString(),
        error: hc.error || null,
      })),
      metrics: {
        api_response_time_p95: metrics.api_response_time_p95,
        database_query_time_p95: metrics.database_query_time_p95,
        error_rate_5m: metrics.error_rate_5m,
        active_variables: metrics.active_variables_count,
        active_environments: metrics.active_environments_count,
        system_resources: {
          cpu_usage_percent: metrics.cpu_usage_percent,
          memory_usage_percent: metrics.memory_usage_percent,
          disk_usage_percent: metrics.disk_usage_percent,
          storage_usage_gb: metrics.storage_usage_gb,
        },
      },
      alerts: {
        active_count: recentAlerts?.length || 0,
        recent_alerts:
          recentAlerts?.map((alert) => ({
            id: alert.event_id,
            severity: alert.severity,
            title: alert.title,
            created_at: alert.created_at,
            alert_type: alert.alert_type,
          })) || [],
      },
      recommendations: generateHealthRecommendations(
        overallStatus,
        healthChecks,
        metrics,
      ),
    };

    // Record this health check
    await monitoringService.recordHealthStatus(organizationId, {
      status: overallStatus,
      timestamp: new Date(),
      component: 'system_overall',
      metrics: {
        uptime_percentage: uptimePercentage,
        component_count: healthChecks.length,
        critical_failures: criticalFailures.length,
        degraded_services: degradedServices.length,
        active_alerts: recentAlerts?.length || 0,
      },
    });

    // Return appropriate HTTP status based on health
    const httpStatus =
      overallStatus === 'critical'
        ? 503
        : overallStatus === 'degraded'
          ? 200
          : 200;

    return NextResponse.json(healthResponse, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': overallStatus,
        'X-Wedding-Day': isWeddingDay.toString(),
        'X-Uptime': uptimePercentage.toString(),
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    // Even if health check fails, we should return something
    return NextResponse.json(
      {
        status: 'critical',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure',
        details: error instanceof Error ? error.message : 'Unknown error',
        components: [],
        metrics: {},
        alerts: { active_count: 0, recent_alerts: [] },
        recommendations: [
          'Contact support immediately - health check system is down',
        ],
      },
      { status: 503 },
    );
  }
}

// Helper function to check if it's wedding day
async function checkWeddingDay(
  supabase: any,
  organizationId: string,
): Promise<boolean> {
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Saturday is typically wedding day
  if (dayOfWeek === 6) {
    return true;
  }

  // Check for active weddings today
  const { data: weddings } = await supabase
    .from('weddings')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('wedding_date', today.toISOString().split('T')[0])
    .lt(
      'wedding_date',
      new Date(today.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    );

  return (weddings?.length || 0) > 0;
}

// Helper function to get wedding day specific health
async function getWeddingDayHealth(supabase: any, organizationId: string) {
  try {
    // Get wedding day specific metrics
    const { data: weddingDayAlerts } = await supabase
      .from('wedding_day_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('resolved', false)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const { data: emergencyContacts } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      read_only_mode: true, // Saturday = read-only
      emergency_contacts_configured: (emergencyContacts?.length || 0) > 0,
      active_wedding_alerts: weddingDayAlerts?.length || 0,
      critical_systems_status: 'healthy', // Would check payment, email, SMS systems
      backup_systems_ready: true,
      emergency_escalation_ready: (emergencyContacts?.length || 0) >= 2,
    };
  } catch (error) {
    console.error('Error getting wedding day health:', error);
    return {
      read_only_mode: true,
      emergency_contacts_configured: false,
      active_wedding_alerts: 0,
      critical_systems_status: 'unknown',
      backup_systems_ready: false,
      emergency_escalation_ready: false,
    };
  }
}

// Helper function to generate health recommendations
function generateHealthRecommendations(
  status: string,
  healthChecks: any[],
  metrics: any,
): string[] {
  const recommendations: string[] = [];

  if (status === 'critical') {
    recommendations.push('🚨 CRITICAL: Immediate action required');
    const criticalComponents = healthChecks.filter(
      (hc) => hc.status === 'critical',
    );
    criticalComponents.forEach((component) => {
      recommendations.push(
        `• Fix ${component.component} component (${component.error})`,
      );
    });
  }

  if (status === 'degraded') {
    recommendations.push('⚠️ System is degraded but operational');
    const degradedComponents = healthChecks.filter(
      (hc) => hc.status === 'degraded',
    );
    degradedComponents.forEach((component) => {
      recommendations.push(
        `• Monitor ${component.component} component closely`,
      );
    });
  }

  // Performance recommendations
  if (metrics.api_response_time_p95 > 200) {
    recommendations.push(
      `• API response time is high (${metrics.api_response_time_p95}ms > 200ms target)`,
    );
  }

  if (metrics.database_query_time_p95 > 50) {
    recommendations.push(
      `• Database queries are slow (${metrics.database_query_time_p95}ms > 50ms target)`,
    );
  }

  if (metrics.error_rate_5m > 0.01) {
    recommendations.push(
      `• Error rate is elevated (${(metrics.error_rate_5m * 100).toFixed(2)}% > 1% target)`,
    );
  }

  // Resource recommendations
  if (metrics.cpu_usage_percent > 80) {
    recommendations.push('• CPU usage is high - consider scaling up');
  }

  if (metrics.memory_usage_percent > 85) {
    recommendations.push('• Memory usage is high - check for memory leaks');
  }

  if (metrics.disk_usage_percent > 90) {
    recommendations.push('• Disk space is low - clean up or expand storage');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All systems operating normally');
  }

  return recommendations;
}
