/**
 * System Health Check API
 * Comprehensive monitoring endpoint for system stability and performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processManager } from '@/lib/system-stability/process-manager';
import { errorHandler } from '@/lib/system-stability/error-handler';
import { withErrorHandling } from '@/lib/system-stability/error-handler';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    memory: HealthCheckResult;
    database: HealthCheckResult;
    process: HealthCheckResult;
    errors: HealthCheckResult;
    environment: HealthCheckResult;
  };
  metrics: {
    memoryUsage: NodeJS.MemoryUsage;
    errorStats: any;
    systemHealth: any;
  };
}

interface HealthCheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  responseTime?: number;
  details?: any;
}

async function performHealthCheck(
  request: NextRequest,
): Promise<NextResponse<HealthCheck>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Initialize health check results
  const checks = {
    memory: await checkMemory(),
    database: await checkDatabase(),
    process: await checkProcess(),
    errors: await checkErrors(),
    environment: await checkEnvironment(),
  };

  // Determine overall status
  const overallStatus = determineOverallStatus(checks);

  // Gather metrics
  const metrics = {
    memoryUsage: process.memoryUsage(),
    errorStats: errorHandler.getErrorStats(),
    systemHealth: processManager.getSystemHealth(),
  };

  const response: HealthCheck = {
    status: overallStatus,
    timestamp,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks,
    metrics,
  };

  const statusCode =
    overallStatus === 'healthy'
      ? 200
      : overallStatus === 'degraded'
        ? 200
        : 503;

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check': overallStatus,
    },
  });
}

/**
 * Check memory usage and detect potential leaks
 */
async function checkMemory(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssUsedMB = Math.round(memUsage.rss / 1024 / 1024);

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `Memory usage normal: ${heapUsedMB}MB heap, ${rssUsedMB}MB RSS`;

    // Warning thresholds
    if (heapUsedMB > 512) {
      status = 'warn';
      message = `High memory usage: ${heapUsedMB}MB heap`;
    }

    // Critical thresholds
    if (heapUsedMB > 1024 || rssUsedMB > 2048) {
      status = 'fail';
      message = `Critical memory usage: ${heapUsedMB}MB heap, ${rssUsedMB}MB RSS`;
    }

    return {
      status,
      message,
      responseTime: Date.now() - startTime,
      details: {
        heap: { used: heapUsedMB, total: heapTotalMB },
        rss: rssUsedMB,
        external: Math.round(memUsage.external / 1024 / 1024),
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Memory check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // Simple query to test connectivity
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        status: 'fail',
        message: `Database error: ${error.message}`,
        responseTime,
      };
    }

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Database connectivity normal';

    if (responseTime > 1000) {
      status = 'warn';
      message = `Database response slow: ${responseTime}ms`;
    }

    if (responseTime > 5000) {
      status = 'fail';
      message = `Database response critical: ${responseTime}ms`;
    }

    return {
      status,
      message,
      responseTime,
      details: {
        connectionTime: responseTime,
        recordCount: data?.length || 0,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Database check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check process health and resource usage
 */
async function checkProcess(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const systemHealth = processManager.getSystemHealth();
    const uptime = process.uptime();

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `Process healthy, uptime: ${Math.round(uptime)}s`;

    // Check for excessive errors
    if (systemHealth.errorCount > 10) {
      status = 'warn';
      message = `High error count: ${systemHealth.errorCount}`;
    }

    if (systemHealth.errorCount > 50) {
      status = 'fail';
      message = `Critical error count: ${systemHealth.errorCount}`;
    }

    return {
      status,
      message,
      responseTime: Date.now() - startTime,
      details: {
        uptime: Math.round(uptime),
        errorCount: systemHealth.errorCount,
        cleanupHandlers: systemHealth.cleanupHandlers,
        lastError: systemHealth.lastError?.message,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Process check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check error rates and circuit breaker status
 */
async function checkErrors(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const errorStats = errorHandler.getErrorStats();

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = `Error rates normal: ${errorStats.totalErrors} total`;

    // Check for high error rates
    if (errorStats.totalErrors > 100) {
      status = 'warn';
      message = `High error rate: ${errorStats.totalErrors} errors`;
    }

    if (errorStats.totalErrors > 500) {
      status = 'fail';
      message = `Critical error rate: ${errorStats.totalErrors} errors`;
    }

    // Check for open circuit breakers
    const openCircuitBreakers = errorStats.circuitBreakers.filter(
      (cb) => cb.isOpen,
    );
    if (openCircuitBreakers.length > 0) {
      status = 'fail';
      message = `Circuit breakers open: ${openCircuitBreakers.length}`;
    }

    return {
      status,
      message,
      responseTime: Date.now() - startTime,
      details: {
        totalErrors: errorStats.totalErrors,
        errorsByCategory: errorStats.errorsByCategory,
        openCircuitBreakers: openCircuitBreakers.length,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Error check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Check environment and configuration
 */
async function checkEnvironment(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SESSION_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar],
    );

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Environment configuration valid';

    if (missingEnvVars.length > 0) {
      status = 'fail';
      message = `Missing environment variables: ${missingEnvVars.join(', ')}`;
    }

    // Check NODE_ENV
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'development'
    ) {
      status = 'warn';
      message = `Unusual NODE_ENV: ${process.env.NODE_ENV}`;
    }

    return {
      status,
      message,
      responseTime: Date.now() - startTime,
      details: {
        nodeEnv: process.env.NODE_ENV,
        nodeVersion: process.version,
        missingEnvVars: missingEnvVars.length,
      },
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `Environment check failed: ${error.message}`,
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * Determine overall system status
 */
function determineOverallStatus(
  checks: Record<string, HealthCheckResult>,
): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map((check) => check.status);

  if (statuses.includes('fail')) {
    return 'unhealthy';
  }

  if (statuses.includes('warn')) {
    return 'degraded';
  }

  return 'healthy';
}

// Export with error handling
export const GET = withErrorHandling(performHealthCheck);

// Health check endpoint is always available, no authentication required
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
