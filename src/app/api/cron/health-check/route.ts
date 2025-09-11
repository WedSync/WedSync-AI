/**
 * Team E: Automated Health Check System
 * Runs comprehensive health checks every 5 minutes via Vercel Cron
 * Critical for preventing wedding day disasters
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  details?: any;
  error?: string;
}

interface HealthReport {
  overall: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  checks: HealthCheck[];
  metadata: {
    weddingsToday: number;
    weddingsNext24h: number;
    criticalWeddings: number;
    totalResponseTime: number;
  };
}

// Verify cron authentication
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - allowing in development');
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Database connectivity check
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const supabase = await createClient();

    // Test basic connectivity
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .single();

    if (error) {
      return {
        name: 'Database',
        status: 'critical',
        responseTime: Date.now() - start,
        error: error.message,
      };
    }

    const responseTime = Date.now() - start;

    return {
      name: 'Database',
      status: responseTime > 1000 ? 'warning' : 'healthy',
      responseTime,
      details: {
        connection: 'active',
        responseTimeMs: responseTime,
      },
    };
  } catch (error) {
    return {
      name: 'Database',
      status: 'critical',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// API endpoints health check
async function checkAPIEndpoints(): Promise<HealthCheck> {
  const start = Date.now();
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    // Test critical endpoints
    const endpoints = ['/api/monitoring/status', '/api/auth/session'];

    const results = await Promise.allSettled(
      endpoints.map((endpoint) =>
        fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: { 'User-Agent': 'WedSync-HealthCheck/1.0' },
        }),
      ),
    );

    const failed = results.filter(
      (result) =>
        result.status === 'rejected' ||
        (result.status === 'fulfilled' && !result.value.ok),
    ).length;

    const responseTime = Date.now() - start;

    return {
      name: 'API Endpoints',
      status:
        failed > 0 ? 'critical' : responseTime > 2000 ? 'warning' : 'healthy',
      responseTime,
      details: {
        totalEndpoints: endpoints.length,
        failedEndpoints: failed,
        averageResponseTime: responseTime / endpoints.length,
      },
    };
  } catch (error) {
    return {
      name: 'API Endpoints',
      status: 'critical',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'API connectivity failed',
    };
  }
}

// Third-party services check
async function checkThirdPartyServices(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check Sentry (if configured)
    let sentryOk = true;
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        // Basic Sentry connectivity check
        const response = await fetch('https://sentry.io/api/0/', {
          method: 'HEAD',
          headers: { 'User-Agent': 'WedSync-HealthCheck/1.0' },
        });
        sentryOk = response.ok;
      } catch {
        sentryOk = false;
      }
    }

    // Check Supabase status
    let supabaseOk = true;
    try {
      const response = await fetch(
        'https://status.supabase.com/api/v2/status.json',
        {
          headers: { 'User-Agent': 'WedSync-HealthCheck/1.0' },
        },
      );
      const status = await response.json();
      supabaseOk = status.status?.indicator === 'none'; // No incidents
    } catch {
      supabaseOk = false;
    }

    const responseTime = Date.now() - start;
    const issues = [!sentryOk, !supabaseOk].filter(Boolean).length;

    return {
      name: 'Third-party Services',
      status: issues > 1 ? 'critical' : issues > 0 ? 'warning' : 'healthy',
      responseTime,
      details: {
        sentry: sentryOk ? 'operational' : 'degraded',
        supabase: supabaseOk ? 'operational' : 'degraded',
      },
    };
  } catch (error) {
    return {
      name: 'Third-party Services',
      status: 'warning',
      responseTime: Date.now() - start,
      error:
        error instanceof Error ? error.message : 'Third-party check failed',
    };
  }
}

// Security check
async function checkSecurity(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const supabase = await createClient();

    // Check for recent security alerts
    const { data: recentAlerts, error } = await supabase
      .from('monitoring_events')
      .select('severity, event_type')
      .eq('event_type', 'security_alert')
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('created_at', { ascending: false });

    if (error) {
      return {
        name: 'Security',
        status: 'warning',
        responseTime: Date.now() - start,
        error: 'Failed to check security alerts',
      };
    }

    const criticalAlerts =
      recentAlerts?.filter((alert) => alert.severity === 'error').length || 0;
    const warningAlerts =
      recentAlerts?.filter((alert) => alert.severity === 'warning').length || 0;

    const responseTime = Date.now() - start;

    return {
      name: 'Security',
      status:
        criticalAlerts > 0
          ? 'critical'
          : warningAlerts > 5
            ? 'warning'
            : 'healthy',
      responseTime,
      details: {
        criticalAlerts,
        warningAlerts,
        totalAlerts: recentAlerts?.length || 0,
      },
    };
  } catch (error) {
    return {
      name: 'Security',
      status: 'warning',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Security check failed',
    };
  }
}

// Wedding-specific checks
async function checkWeddingCriticalPath(): Promise<{
  weddingsToday: number;
  weddingsNext24h: number;
  criticalWeddings: number;
}> {
  try {
    const supabase = await createClient();

    // Get wedding counts
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data: weddingsToday } = await supabase
      .from('clients')
      .select('id')
      .eq('wedding_date', today);

    const { data: weddingsNext24h } = await supabase
      .from('clients')
      .select('id')
      .gte('wedding_date', today)
      .lte('wedding_date', tomorrow);

    return {
      weddingsToday: weddingsToday?.length || 0,
      weddingsNext24h: weddingsNext24h?.length || 0,
      criticalWeddings: weddingsToday?.length || 0,
    };
  } catch (error) {
    return {
      weddingsToday: 0,
      weddingsNext24h: 0,
      criticalWeddings: 0,
    };
  }
}

// Determine overall system health
function determineOverallHealth(
  checks: HealthCheck[],
): 'healthy' | 'warning' | 'critical' {
  const criticalCount = checks.filter((c) => c.status === 'critical').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;

  if (criticalCount > 0) return 'critical';
  if (warningCount > 1) return 'warning';
  if (warningCount > 0) return 'warning';
  return 'healthy';
}

// Send critical alerts
async function sendCriticalAlerts(health: HealthReport): Promise<void> {
  try {
    // Send to monitoring events table
    const supabase = await createClient();

    await supabase.from('monitoring_events').insert({
      event_type: 'health_check_critical',
      severity: 'error',
      message: `Critical health check failure: ${health.checks
        .filter((c) => c.status === 'critical')
        .map((c) => c.name)
        .join(', ')}`,
      metadata: health,
    });

    // Send Slack alert if webhook configured
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🚨 CRITICAL: WedSync Health Check Failure',
          attachments: [
            {
              color: 'danger',
              fields: [
                {
                  title: 'Failed Systems',
                  value: health.checks
                    .filter((c) => c.status === 'critical')
                    .map((c) => c.name)
                    .join(', '),
                  short: true,
                },
                {
                  title: 'Wedding Impact',
                  value:
                    health.metadata.criticalWeddings > 0
                      ? `${health.metadata.criticalWeddings} weddings today may be affected`
                      : 'No weddings today',
                  short: true,
                },
                {
                  title: 'Response Required',
                  value: 'Immediate action required',
                  short: true,
                },
              ],
            },
          ],
        }),
      });
    }

    // Call additional alert functions if needed
    console.error('CRITICAL HEALTH CHECK FAILURE:', health);
  } catch (error) {
    console.error('Failed to send critical alerts:', error);
  }
}

// Main health check function
async function runComprehensiveHealthCheck(): Promise<HealthReport> {
  console.log('Starting comprehensive health check...');

  // Run all health checks in parallel
  const [databaseCheck, apiCheck, thirdPartyCheck, securityCheck, weddingData] =
    await Promise.all([
      checkDatabase(),
      checkAPIEndpoints(),
      checkThirdPartyServices(),
      checkSecurity(),
      checkWeddingCriticalPath(),
    ]);

  const checks = [databaseCheck, apiCheck, thirdPartyCheck, securityCheck];
  const overall = determineOverallHealth(checks);
  const totalResponseTime = checks.reduce(
    (sum, check) => sum + check.responseTime,
    0,
  );

  return {
    overall,
    timestamp: new Date().toISOString(),
    checks,
    metadata: {
      ...weddingData,
      totalResponseTime,
    },
  };
}

// API Route Handler
export async function GET(request: Request) {
  try {
    // Verify cron authentication
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run comprehensive health check
    const healthReport = await runComprehensiveHealthCheck();

    // Store the result in database
    const supabase = await createClient();
    await supabase.from('monitoring_events').insert({
      event_type: 'health_check',
      severity:
        healthReport.overall === 'critical'
          ? 'error'
          : healthReport.overall === 'warning'
            ? 'warning'
            : 'info',
      message: `Automated health check completed - Status: ${healthReport.overall}`,
      metadata: healthReport,
    });

    // Send alerts if critical
    if (healthReport.overall === 'critical') {
      await sendCriticalAlerts(healthReport);
    }

    console.log(`Health check completed: ${healthReport.overall}`, {
      weddingsToday: healthReport.metadata.weddingsToday,
      criticalSystems: healthReport.checks.filter(
        (c) => c.status === 'critical',
      ).length,
    });

    return NextResponse.json(healthReport, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);

    const errorReport: HealthReport = {
      overall: 'critical',
      timestamp: new Date().toISOString(),
      checks: [
        {
          name: 'Health Check System',
          status: 'critical',
          responseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      metadata: {
        weddingsToday: 0,
        weddingsNext24h: 0,
        criticalWeddings: 0,
        totalResponseTime: 0,
      },
    };

    return NextResponse.json(errorReport, { status: 500 });
  }
}

// Manual health check endpoint
export async function POST(request: Request) {
  try {
    // Basic authentication check for manual health checks
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 },
      );
    }

    const healthReport = await runComprehensiveHealthCheck();

    return NextResponse.json({
      ...healthReport,
      note: 'Manual health check - results not stored',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Manual health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export const runtime = 'edge';
export const maxDuration = 30;
