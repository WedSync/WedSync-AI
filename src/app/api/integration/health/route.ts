/**
 * Integration Health API Endpoint
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 *
 * Provides REST API access to integration health monitoring data
 * GET /api/integration/health - Get current health status
 * POST /api/integration/health/check - Trigger manual health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { IntegrationHealthMonitor } from '@/lib/monitoring/integration-health-monitor';

const healthMonitor = new IntegrationHealthMonitor();

/**
 * GET /api/integration/health
 * Returns current integration health status and dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/monitoring permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'developer'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get dashboard data
    const dashboardData = await healthMonitor.getDashboardData();

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health monitoring API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/integration/health/check
 * Triggers a manual health check of all integration services
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/monitoring permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || !['admin', 'developer'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Perform health check
    const healthResults = await healthMonitor.performHealthCheck();

    // Check for alerts
    await healthMonitor.checkAlerts();

    return NextResponse.json({
      success: true,
      data: {
        healthResults,
        timestamp: new Date().toISOString(),
        summary: {
          totalServices: healthResults.length,
          healthyServices: healthResults.filter((r) => r.status === 'healthy')
            .length,
          degradedServices: healthResults.filter((r) => r.status === 'degraded')
            .length,
          unhealthyServices: healthResults.filter(
            (r) => r.status === 'unhealthy',
          ).length,
          overallStatus: calculateOverallStatus(healthResults),
        },
      },
    });
  } catch (error) {
    console.error('Health check API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

function calculateOverallStatus(
  healthResults: any[],
): 'healthy' | 'degraded' | 'unhealthy' {
  const unhealthyCount = healthResults.filter(
    (r) => r.status === 'unhealthy',
  ).length;
  const degradedCount = healthResults.filter(
    (r) => r.status === 'degraded',
  ).length;

  if (unhealthyCount > 0) return 'unhealthy';
  if (degradedCount > 0) return 'degraded';
  return 'healthy';
}
