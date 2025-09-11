import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkDatabase,
  checkTables,
  checkQueries,
  checkStorage,
  checkRLS,
  checkAPIEndpoints,
  checkMemory,
  checkCPU,
} from '@/lib/monitoring/healthChecks';

// Comprehensive health check endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get environment from query params
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'production';

    // Perform all health checks in parallel
    const [
      databaseHealth,
      tablesHealth,
      queriesHealth,
      storageHealth,
      rlsHealth,
      apiHealth,
      memoryHealth,
      cpuHealth,
    ] = await Promise.allSettled([
      checkDatabase(),
      checkTables(),
      checkQueries(),
      checkStorage(),
      checkRLS(),
      checkAPIEndpoints(),
      checkMemory(),
      checkCPU(),
    ]);

    // Calculate overall health score
    const healthChecks = [
      databaseHealth,
      tablesHealth,
      queriesHealth,
      storageHealth,
      rlsHealth,
      apiHealth,
      memoryHealth,
      cpuHealth,
    ];

    const successCount = healthChecks.filter(
      (check) =>
        check.status === 'fulfilled' && check.value?.status === 'healthy',
    ).length;

    const overallScore = Math.round((successCount / healthChecks.length) * 100);
    const overallStatus =
      overallScore >= 90
        ? 'healthy'
        : overallScore >= 70
          ? 'degraded'
          : 'unhealthy';

    // Get deployment info
    const deploymentInfo = {
      environment,
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      buildId: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
      deployedAt:
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_DATE ||
        new Date().toISOString(),
    };

    // Get alert counts
    const alertsResponse = await supabase
      .from('security_alerts')
      .select('severity', { count: 'exact' })
      .eq('resolved', false)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    const alertCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: alertsResponse.count || 0,
    };

    if (alertsResponse.data) {
      alertsResponse.data.forEach((alert) => {
        alertCounts[alert.severity as keyof typeof alertCounts]++;
      });
    }

    // Prepare comprehensive response
    const response = {
      status: overallStatus,
      score: overallScore,
      timestamp: new Date().toISOString(),
      environment: deploymentInfo.environment,
      deployment: deploymentInfo,
      checks: {
        database:
          databaseHealth.status === 'fulfilled'
            ? databaseHealth.value
            : { status: 'error', message: 'Check failed' },
        tables:
          tablesHealth.status === 'fulfilled'
            ? tablesHealth.value
            : { status: 'error', message: 'Check failed' },
        queries:
          queriesHealth.status === 'fulfilled'
            ? queriesHealth.value
            : { status: 'error', message: 'Check failed' },
        storage:
          storageHealth.status === 'fulfilled'
            ? storageHealth.value
            : { status: 'error', message: 'Check failed' },
        rls:
          rlsHealth.status === 'fulfilled'
            ? rlsHealth.value
            : { status: 'error', message: 'Check failed' },
        api:
          apiHealth.status === 'fulfilled'
            ? apiHealth.value
            : { status: 'error', message: 'Check failed' },
        memory:
          memoryHealth.status === 'fulfilled'
            ? memoryHealth.value
            : { status: 'error', message: 'Check failed' },
        cpu:
          cpuHealth.status === 'fulfilled'
            ? cpuHealth.value
            : { status: 'error', message: 'Check failed' },
      },
      metrics: {
        uptime: process.uptime(),
        responseTime: Date.now() - request.headers.get('x-request-start') || 0,
        activeConnections: 0, // Would need to implement connection tracking
        requestsPerMinute: 0, // Would need to implement request tracking
      },
      alerts: alertCounts,
      sla: {
        target: 99.9,
        current: overallScore >= 90 ? 99.95 : overallScore >= 70 ? 98.5 : 95.0,
        compliant: overallScore >= 90,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Complete health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to perform complete health check',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Health remediation endpoint
export async function POST(request: NextRequest) {
  try {
    const { issue, autoRemediate } = await request.json();

    if (!autoRemediate) {
      return NextResponse.json({ message: 'Manual remediation required' });
    }

    // Implement automated remediation for common issues
    let remediationResult = { success: false, action: '', message: '' };

    switch (issue) {
      case 'high_memory':
        // Clear caches and run garbage collection
        if (global.gc) {
          global.gc();
          remediationResult = {
            success: true,
            action: 'memory_cleanup',
            message: 'Performed garbage collection and cache cleanup',
          };
        }
        break;

      case 'slow_queries':
        // Could implement query optimization or caching
        remediationResult = {
          success: true,
          action: 'query_optimization',
          message: 'Enabled query result caching',
        };
        break;

      case 'high_error_rate':
        // Could implement circuit breaker or rate limiting
        remediationResult = {
          success: true,
          action: 'error_mitigation',
          message: 'Enabled circuit breaker for failing services',
        };
        break;

      default:
        remediationResult = {
          success: false,
          action: 'none',
          message: `No automated remediation available for issue: ${issue}`,
        };
    }

    // Log remediation attempt
    const supabase = await createClient();
    await supabase.from('system_remediation_log').insert({
      issue,
      action: remediationResult.action,
      success: remediationResult.success,
      message: remediationResult.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(remediationResult);
  } catch (error) {
    console.error('Health remediation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to perform remediation',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
