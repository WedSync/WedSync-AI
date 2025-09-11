/**
 * Next.js API Route for Performance Monitoring Dashboard
 * Provides endpoints for metrics, health checks, and monitoring data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  dashboard,
  alertManager,
  metrics,
  logger,
  errorTracker,
  healthCheckHandler,
} from '@/lib/monitoring';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, pathname } = new URL(request.url);
    const endpoint = pathname.split('/').pop();

    // Add request logging
    logger.info('Monitoring API request', {
      endpoint,
      method: 'GET',
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    switch (endpoint) {
      case 'health':
        return handleHealthCheck(request);

      case 'metrics':
        return handleMetrics(request);

      case 'dashboard':
        return handleDashboard(request);

      case 'alerts':
        return handleAlerts(request);

      case 'errors':
        return handleErrors(request);

      case 'prometheus':
        return handlePrometheus(request);

      default:
        return handleOverview(request);
    }
  } catch (error) {
    logger.error('Monitoring API error', error as Error, {
      path: request.nextUrl.pathname,
      method: 'GET',
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pathname } = new URL(request.url);
    const endpoint = pathname.split('/').pop();

    logger.info('Monitoring API POST request', {
      endpoint,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });

    switch (endpoint) {
      case 'acknowledge-alert':
        return handleAcknowledgeAlert(request);

      case 'test-alert':
        return handleTestAlert(request);

      default:
        return NextResponse.json(
          {
            error: 'Endpoint not found',
            timestamp: Date.now(),
          },
          { status: 404 },
        );
    }
  } catch (error) {
    logger.error('Monitoring API POST error', error as Error, {
      path: request.nextUrl.pathname,
      method: 'POST',
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

// Health check endpoint
async function handleHealthCheck(request: NextRequest): Promise<NextResponse> {
  try {
    const health = await dashboard.getHealthStatus();
    const statusCode =
      health.status === 'healthy'
        ? 200
        : health.status === 'degraded'
          ? 200
          : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: Date.now(),
      },
      { status: 503 },
    );
  }
}

// Metrics endpoint
async function handleMetrics(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '1');
  const format = searchParams.get('format') || 'json';

  const currentMetrics = dashboard.getCurrentMetrics();
  const history = dashboard.getMetricsHistory(hours);
  const healthStatus = await dashboard.getHealthStatus();

  if (format === 'prometheus') {
    return handlePrometheus(request);
  }

  return NextResponse.json({
    current: currentMetrics,
    history,
    health: healthStatus,
    timestamp: Date.now(),
    metadata: {
      hours,
      dataPoints: history.length,
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
    },
  });
}

// Dashboard endpoint (returns HTML)
async function handleDashboard(request: NextRequest): Promise<Response> {
  try {
    const dashboardHTML = dashboard.generateDashboardHTML();

    return new Response(dashboardHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    logger.error('Dashboard generation failed', error as Error);

    const errorHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Dashboard Error</title></head>
        <body>
          <h1>Dashboard Unavailable</h1>
          <p>Error: ${(error as Error).message}</p>
          <p>Please try again later.</p>
        </body>
      </html>
    `;

    return new Response(errorHTML, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    });
  }
}

// Alerts endpoint
async function handleAlerts(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'active';
  const hours = parseInt(searchParams.get('hours') || '24');

  switch (type) {
    case 'active':
      const activeAlerts = alertManager.getActiveAlerts();
      return NextResponse.json({
        alerts: activeAlerts,
        count: activeAlerts.length,
        timestamp: Date.now(),
      });

    case 'history':
      const alertHistory = alertManager.getAlertHistory(hours);
      return NextResponse.json({
        alerts: alertHistory,
        count: alertHistory.length,
        hours,
        timestamp: Date.now(),
      });

    case 'rules':
      const rules = alertManager.getRules();
      return NextResponse.json({
        rules,
        count: rules.length,
        enabled: rules.filter((r) => r.enabled).length,
        timestamp: Date.now(),
      });

    case 'status':
      const status = alertManager.getStatus();
      return NextResponse.json({
        status,
        timestamp: Date.now(),
      });

    default:
      return NextResponse.json(
        {
          error: 'Invalid alert type',
          validTypes: ['active', 'history', 'rules', 'status'],
        },
        { status: 400 },
      );
  }
}

// Errors endpoint
async function handleErrors(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const hours = parseInt(searchParams.get('hours') || '24');

  const errorStats = errorTracker.getErrorStats();

  return NextResponse.json({
    stats: errorStats,
    timestamp: Date.now(),
    metadata: {
      hours,
      environment: process.env.NODE_ENV,
    },
  });
}

// Prometheus metrics endpoint
async function handlePrometheus(request: NextRequest): Promise<Response> {
  try {
    const metricsData = metrics.getMetrics();
    const currentDashboardMetrics = dashboard.getCurrentMetrics();

    let prometheusOutput = '# WedSync Performance Metrics\n';
    prometheusOutput += `# Generated at ${new Date().toISOString()}\n\n`;

    // Convert counters to Prometheus format
    metricsData.counters.forEach((counter) => {
      const metricName = `wedsync_${counter.name.replace(/[.-]/g, '_')}`;
      prometheusOutput += `# HELP ${metricName} Counter metric for ${counter.name}\n`;
      prometheusOutput += `# TYPE ${metricName} counter\n`;
      prometheusOutput += `${metricName} ${counter.value}\n\n`;
    });

    // Convert gauges to Prometheus format
    metricsData.gauges.forEach((gauge) => {
      const metricName = `wedsync_${gauge.name.replace(/[.-]/g, '_')}`;
      prometheusOutput += `# HELP ${metricName} Gauge metric for ${gauge.name}\n`;
      prometheusOutput += `# TYPE ${metricName} gauge\n`;
      prometheusOutput += `${metricName} ${gauge.value}\n\n`;
    });

    // Add histogram percentiles
    metricsData.histograms.forEach((histogram) => {
      const baseName = `wedsync_${histogram.name.replace(/[.-]/g, '_')}`;

      Object.entries(histogram.percentiles).forEach(([percentile, value]) => {
        const metricName = `${baseName}_${percentile}`;
        prometheusOutput += `# HELP ${metricName} ${percentile} percentile for ${histogram.name}\n`;
        prometheusOutput += `# TYPE ${metricName} gauge\n`;
        prometheusOutput += `${metricName} ${value}\n\n`;
      });
    });

    // Add system metrics if available
    if (currentDashboardMetrics) {
      const systemMetrics = [
        {
          name: 'memory_usage_percent',
          value: currentDashboardMetrics.system.memory.percentage,
        },
        {
          name: 'memory_used_bytes',
          value: currentDashboardMetrics.system.memory.used,
        },
        {
          name: 'memory_total_bytes',
          value: currentDashboardMetrics.system.memory.total,
        },
        {
          name: 'cpu_usage_percent',
          value: currentDashboardMetrics.system.cpu.usage,
        },
        {
          name: 'event_loop_lag_ms',
          value: currentDashboardMetrics.system.eventLoop.lag,
        },
      ];

      systemMetrics.forEach(({ name, value }) => {
        const metricName = `wedsync_system_${name}`;
        prometheusOutput += `# HELP ${metricName} System metric: ${name}\n`;
        prometheusOutput += `# TYPE ${metricName} gauge\n`;
        prometheusOutput += `${metricName} ${value}\n\n`;
      });

      // Business metrics
      const businessMetrics = [
        {
          name: 'users_active',
          value: currentDashboardMetrics.business.users.active,
        },
        {
          name: 'forms_created',
          value: currentDashboardMetrics.business.forms.created,
        },
        {
          name: 'payments_processed',
          value: currentDashboardMetrics.business.payments.processed,
        },
        {
          name: 'pdf_processed',
          value: currentDashboardMetrics.business.pdf.processed,
        },
      ];

      businessMetrics.forEach(({ name, value }) => {
        const metricName = `wedsync_business_${name}`;
        prometheusOutput += `# HELP ${metricName} Business metric: ${name}\n`;
        prometheusOutput += `# TYPE ${metricName} counter\n`;
        prometheusOutput += `${metricName} ${value}\n\n`;
      });
    }

    // Add metadata
    prometheusOutput += `# HELP wedsync_info Build information\n`;
    prometheusOutput += `# TYPE wedsync_info gauge\n`;
    prometheusOutput += `wedsync_info{version="${process.env.APP_VERSION || '1.0.0'}",environment="${process.env.NODE_ENV}",service="wedsync"} 1\n\n`;

    return new Response(prometheusOutput, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('Prometheus metrics generation failed', error as Error);
    return new Response('# Error generating metrics\n', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500,
    });
  }
}

// Overview endpoint (default)
async function handleOverview(request: NextRequest): Promise<NextResponse> {
  const currentMetrics = dashboard.getCurrentMetrics();
  const health = await dashboard.getHealthStatus();
  const alertStatus = alertManager.getStatus();
  const errorStats = errorTracker.getErrorStats();

  return NextResponse.json({
    service: 'WedSync Performance Monitoring',
    timestamp: Date.now(),
    status: health.status,
    uptime: health.uptime,
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,

    overview: {
      health: {
        status: health.status,
        checks: Object.keys(health.checks).length,
        uptime: health.uptime,
      },
      metrics: currentMetrics
        ? {
            system: {
              memoryUsage: `${currentMetrics.system.memory.percentage.toFixed(1)}%`,
              cpuLoad:
                currentMetrics.system.cpu.loadAverage[0]?.toFixed(2) || 'N/A',
            },
            application: {
              requests: currentMetrics.application.requests.total,
              responseTime: `${currentMetrics.application.requests.responseTime.p95}ms`,
              errorRate: `${(currentMetrics.errors.rate * 100).toFixed(2)}%`,
            },
            business: {
              activeUsers: currentMetrics.business.users.active,
              formsCreated: currentMetrics.business.forms.created,
              paymentsProcessed: currentMetrics.business.payments.processed,
            },
          }
        : null,
      alerts: {
        rules: alertStatus.rulesCount,
        enabled: alertStatus.enabledRules,
        active: alertStatus.activeAlerts,
      },
      errors: {
        total: errorStats.totalErrors,
        recent: errorStats.recentErrors.length,
      },
    },

    endpoints: {
      health: '/api/monitoring/health',
      metrics: '/api/monitoring/metrics',
      dashboard: '/api/monitoring/dashboard',
      alerts: '/api/monitoring/alerts',
      errors: '/api/monitoring/errors',
      prometheus: '/api/monitoring/prometheus',
    },
  });
}

// Acknowledge alert
async function handleAcknowledgeAlert(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const { alertId, userId } = await request.json();

    if (!alertId || !userId) {
      return NextResponse.json(
        {
          error: 'Missing alertId or userId',
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    const success = alertManager.acknowledgeAlert(alertId, userId);

    if (success) {
      logger.info('Alert acknowledged via API', {
        alertId,
        acknowledgedBy: userId,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged successfully',
        timestamp: Date.now(),
      });
    } else {
      return NextResponse.json(
        {
          error: 'Alert not found or already acknowledged',
          timestamp: Date.now(),
        },
        { status: 404 },
      );
    }
  } catch (error) {
    logger.error('Failed to acknowledge alert', error as Error);
    return NextResponse.json(
      {
        error: 'Failed to acknowledge alert',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

// Test alert (for development/testing)
async function handleTestAlert(request: NextRequest): Promise<NextResponse> {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'Test alerts not available in production',
          timestamp: Date.now(),
        },
        { status: 403 },
      );
    }

    const { type = 'info', message = 'Test alert from API' } =
      await request.json();

    // Create a temporary test error for demonstration
    const testError = new Error(message);
    testError.name = 'TestError';

    errorTracker.captureError(
      testError,
      {
        endpoint: '/api/monitoring/test-alert',
        method: 'POST',
        userId: 'test_user',
      },
      {
        type: 'test',
        severity: type,
      },
    );

    return NextResponse.json({
      success: true,
      message: 'Test alert created',
      type,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('Failed to create test alert', error as Error);
    return NextResponse.json(
      {
        error: 'Failed to create test alert',
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
