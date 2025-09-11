/**
 * WS-339 Performance Monitoring System - Dashboard API
 * API routes for performance monitoring dashboard data
 * Wedding-specific metrics and service health for vendors
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  try {
    // Get current user and organization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const organizationId = userProfile.organization_id;
    const timeRange = searchParams.get('timeRange') || '24h';
    const serviceType = searchParams.get('serviceType');

    // Calculate time range
    const timeRangeHours = getTimeRangeHours(timeRange);
    const startTime = new Date(
      Date.now() - timeRangeHours * 60 * 60 * 1000,
    ).toISOString();

    // Get performance metrics
    let metricsQuery = supabase
      .from('apm_performance_metrics')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('timestamp', startTime)
      .order('timestamp', { ascending: false });

    if (serviceType) {
      metricsQuery = metricsQuery.eq('service_name', serviceType);
    }

    const { data: metrics, error: metricsError } =
      await metricsQuery.limit(1000);
    if (metricsError) throw metricsError;

    // Get service health status
    const { data: services, error: servicesError } = await supabase
      .from('apm_service_health_status')
      .select('*')
      .eq('organization_id', organizationId)
      .order('wedding_critical', { ascending: false });

    if (servicesError) throw servicesError;

    // Get active alerts
    const { data: activeAlerts, error: alertsError } = await supabase
      .from('apm_alert_incidents')
      .select('*, alert:amp_performance_alerts(*)')
      .eq('organization_id', organizationId)
      .eq('status', 'firing')
      .order('triggered_at', { ascending: false });

    if (alertsError) throw alertsError;

    // Calculate dashboard metrics
    const dashboardData = await calculateDashboardMetrics(
      metrics || [],
      services || [],
      activeAlerts || [],
    );

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 },
    );
  }
}

function getTimeRangeHours(timeRange: string): number {
  switch (timeRange) {
    case '1h':
      return 1;
    case '6h':
      return 6;
    case '24h':
      return 24;
    case '7d':
      return 168;
    case '30d':
      return 720;
    default:
      return 24;
  }
}

async function calculateDashboardMetrics(
  metrics: any[],
  services: any[],
  activeAlerts: any[],
) {
  // Overall performance metrics
  const totalRequests = metrics.length;
  const averageResponseTime =
    totalRequests > 0
      ? Math.round(
          metrics.reduce((sum, m) => sum + (m.metric_value || 0), 0) /
            totalRequests,
        )
      : 0;

  const errorMetrics = metrics.filter(
    (m) => m.tags?.status_code >= 400 || m.tags?.success === false,
  );
  const errorRate =
    totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0;

  // Wedding-specific metrics
  const weddingDayMetrics = metrics.filter(
    (m) => m.wedding_context?.is_wedding_day === true,
  );
  const weddingDayPerformance =
    weddingDayMetrics.length > 0
      ? Math.round(
          weddingDayMetrics.reduce((sum, m) => sum + m.metric_value, 0) /
            weddingDayMetrics.length,
        )
      : 0;

  // Service health summary
  const healthyServices = services.filter((s) => s.status === 'healthy').length;
  const totalServices = services.length;
  const serviceUptime =
    totalServices > 0 ? (healthyServices / totalServices) * 100 : 0;

  // Wedding-critical services
  const weddingCriticalServices = services.filter((s) => s.wedding_critical);
  const criticalHealthy = weddingCriticalServices.filter(
    (s) => s.status === 'healthy',
  ).length;
  const weddingReadiness =
    weddingCriticalServices.length > 0
      ? (criticalHealthy / weddingCriticalServices.length) * 100
      : 100;

  // Performance trends (by service)
  const performanceByService = metrics.reduce(
    (acc, metric) => {
      const serviceName = metric.service_name;
      if (!acc[serviceName]) {
        acc[serviceName] = {
          name: serviceName,
          totalRequests: 0,
          averageResponse: 0,
          errorCount: 0,
          weddingDayRequests: 0,
        };
      }

      acc[serviceName].totalRequests++;
      acc[serviceName].averageResponse += metric.metric_value;

      if (metric.tags?.status_code >= 400 || metric.tags?.success === false) {
        acc[serviceName].errorCount++;
      }

      if (metric.wedding_context?.is_wedding_day) {
        acc[serviceName].weddingDayRequests++;
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  // Calculate averages
  Object.values(performanceByService).forEach((service: any) => {
    service.averageResponse =
      service.totalRequests > 0
        ? Math.round(service.averageResponse / service.totalRequests)
        : 0;
    service.errorRate =
      service.totalRequests > 0
        ? (service.errorCount / service.totalRequests) * 100
        : 0;
  });

  // Time series data for charts
  const timeSeriesData = generateTimeSeriesData(metrics);

  // Web Vitals summary
  const webVitalsMetrics = metrics.filter(
    (m) => m.service_name === 'web_vitals',
  );
  const webVitals = calculateWebVitals(webVitalsMetrics);

  // CDN performance
  const cdnMetrics = metrics.filter((m) => m.service_name === 'cdn_delivery');
  const cdnPerformance = calculateCDNPerformance(cdnMetrics);

  return {
    overview: {
      totalRequests,
      averageResponseTime,
      errorRate: Math.round(errorRate * 100) / 100,
      serviceUptime: Math.round(serviceUptime * 100) / 100,
      weddingDayPerformance,
      weddingReadiness: Math.round(weddingReadiness * 100) / 100,
      activeAlertsCount: activeAlerts.length,
    },
    services: services.map((service) => ({
      name: service.service_name,
      displayName: formatServiceName(service.service_name),
      status: service.status,
      responseTime: service.response_time_ms || 0,
      availability: service.availability_percentage || 0,
      errorRate: service.error_rate || 0,
      weddingCritical: service.wedding_critical,
      lastCheck: service.last_check_at,
      statusHistory: service.status_history || [],
    })),
    performanceByService: Object.values(performanceByService),
    timeSeriesData,
    webVitals,
    cdnPerformance,
    activeAlerts: activeAlerts.map((alert) => ({
      id: alert.id,
      alertName: alert.alert?.alert_name || 'Unknown Alert',
      severity: alert.severity,
      triggeredAt: alert.triggered_at,
      metricValue: alert.metric_value,
      threshold: alert.threshold_value,
      isWeddingDay: alert.was_wedding_day,
    })),
    weddingCriticalServices: weddingCriticalServices.map((service) => ({
      name: service.service_name,
      status: service.status,
      responseTime: service.response_time_ms || 0,
      availability: service.availability_percentage || 0,
    })),
  };
}

function generateTimeSeriesData(metrics: any[]) {
  // Group metrics by hour for the time series chart
  const hourlyData = metrics.reduce(
    (acc, metric) => {
      const hour =
        new Date(metric.timestamp).toISOString().slice(0, 13) + ':00:00Z';

      if (!acc[hour]) {
        acc[hour] = {
          timestamp: hour,
          responseTime: [],
          errorCount: 0,
          totalRequests: 0,
          weddingDayRequests: 0,
        };
      }

      acc[hour].responseTime.push(metric.metric_value);
      acc[hour].totalRequests++;

      if (metric.tags?.status_code >= 400 || metric.tags?.success === false) {
        acc[hour].errorCount++;
      }

      if (metric.wedding_context?.is_wedding_day) {
        acc[hour].weddingDayRequests++;
      }

      return acc;
    },
    {} as Record<string, any>,
  );

  // Calculate averages for each hour
  return Object.values(hourlyData)
    .map((hour: any) => ({
      timestamp: hour.timestamp,
      averageResponseTime:
        hour.responseTime.length > 0
          ? Math.round(
              hour.responseTime.reduce((a: number, b: number) => a + b, 0) /
                hour.responseTime.length,
            )
          : 0,
      errorRate:
        hour.totalRequests > 0
          ? (hour.errorCount / hour.totalRequests) * 100
          : 0,
      totalRequests: hour.totalRequests,
      weddingDayRequests: hour.weddingDayRequests,
    }))
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function calculateWebVitals(webVitalsMetrics: any[]) {
  if (webVitalsMetrics.length === 0) {
    return {
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      score: 'poor',
    };
  }

  const latest = webVitalsMetrics.reduce(
    (acc, metric) => {
      acc[metric.metric_name] = metric.metric_value;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Calculate Core Web Vitals score
  const lcpScore =
    (latest.lcp || 0) < 2500
      ? 'good'
      : (latest.lcp || 0) < 4000
        ? 'needs-improvement'
        : 'poor';
  const fidScore =
    (latest.fid || 0) < 100
      ? 'good'
      : (latest.fid || 0) < 300
        ? 'needs-improvement'
        : 'poor';
  const clsScore =
    (latest.cls || 0) < 0.1
      ? 'good'
      : (latest.cls || 0) < 0.25
        ? 'needs-improvement'
        : 'poor';

  const scores = [lcpScore, fidScore, clsScore];
  const goodCount = scores.filter((s) => s === 'good').length;
  const overallScore =
    goodCount === 3 ? 'good' : goodCount >= 1 ? 'needs-improvement' : 'poor';

  return {
    lcp: latest.lcp || 0,
    fid: latest.fid || 0,
    cls: latest.cls || 0,
    ttfb: latest.ttfb || 0,
    score: overallScore,
  };
}

function calculateCDNPerformance(cdnMetrics: any[]) {
  if (cdnMetrics.length === 0) {
    return {
      averageLoadTime: 0,
      cacheHitRate: 0,
      totalAssets: 0,
      errorRate: 0,
    };
  }

  const totalAssets = cdnMetrics.length;
  const averageLoadTime = Math.round(
    cdnMetrics.reduce((sum, metric) => sum + metric.metric_value, 0) /
      totalAssets,
  );

  const cacheHits = cdnMetrics.filter((m) => m.tags?.cache_hit === true).length;
  const cacheHitRate = (cacheHits / totalAssets) * 100;

  const errors = cdnMetrics.filter((m) => m.tags?.status_code >= 400).length;
  const errorRate = (errors / totalAssets) * 100;

  return {
    averageLoadTime,
    cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    totalAssets,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}

function formatServiceName(serviceName: string): string {
  return serviceName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
