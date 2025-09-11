/**
 * WS-152 Dashboard Manual Refresh API
 * Handles manual refresh requests with cache invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schema
const refreshRequestSchema = z.object({
  metrics: z
    .array(
      z.enum([
        'performance',
        'errors',
        'usage',
        'security',
        'cache',
        'database',
        'memory',
        'cpu',
        'all',
      ]),
    )
    .default(['all']),
  clearCache: z.boolean().default(true),
  force: z.boolean().default(false),
});

// CSRF validation (simplified for demo)
function validateCSRFToken(request: NextRequest): boolean {
  const csrfHeader = request.headers.get('x-csrf-token');
  const userAgent = request.headers.get('user-agent');

  // In production, implement proper CSRF validation
  // For now, just check that it's not obviously a bot
  return Boolean(csrfHeader || userAgent?.includes('Mozilla'));
}

// Simulate cache invalidation
async function invalidateCache(
  metrics: string[],
): Promise<{ cleared: string[]; errors: string[] }> {
  const cleared: string[] = [];
  const errors: string[] = [];

  // Simulate cache operations
  await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));

  for (const metric of metrics) {
    try {
      // Simulate individual cache clearing
      if (Math.random() > 0.05) {
        // 95% success rate
        cleared.push(metric);
      } else {
        errors.push(metric);
      }
    } catch (error) {
      errors.push(metric);
    }
  }

  return { cleared, errors };
}

// Refresh specific metrics
async function refreshMetrics(metrics: string[]): Promise<{
  refreshed: string[];
  failed: string[];
  duration: number;
}> {
  const startTime = performance.now();
  const refreshed: string[] = [];
  const failed: string[] = [];

  // Simulate metric refresh operations
  await new Promise((resolve) =>
    setTimeout(resolve, 100 + Math.random() * 200),
  );

  for (const metric of metrics) {
    try {
      // Simulate metric collection
      if (Math.random() > 0.02) {
        // 98% success rate
        refreshed.push(metric);
      } else {
        failed.push(metric);
      }
    } catch (error) {
      failed.push(metric);
    }
  }

  const duration = Math.round(performance.now() - startTime);
  return { refreshed, failed, duration };
}

/**
 * POST /api/monitoring/dashboard/refresh
 * Manual refresh endpoint with cache invalidation
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();

  try {
    // Basic CSRF protection
    if (!validateCSRFToken(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request origin',
        },
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { metrics, clearCache, force } = refreshRequestSchema.parse(body);

    // Handle 'all' metrics
    const metricsToProcess = metrics.includes('all')
      ? [
          'performance',
          'errors',
          'usage',
          'security',
          'cache',
          'database',
          'memory',
          'cpu',
        ]
      : metrics;

    // Perform cache invalidation if requested
    let cacheResult = null;
    if (clearCache) {
      cacheResult = await invalidateCache(metricsToProcess);
    }

    // Refresh metrics
    const refreshResult = await refreshMetrics(metricsToProcess);

    const responseTime = Math.round(performance.now() - startTime);

    // Log the refresh action (in production, use proper logging)
    console.log(
      `Dashboard refresh completed: ${refreshResult.refreshed.length} metrics refreshed in ${responseTime}ms`,
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Dashboard refresh completed successfully',
        data: {
          refresh: {
            requested: metricsToProcess,
            refreshed: refreshResult.refreshed,
            failed: refreshResult.failed,
            duration: refreshResult.duration,
          },
          cache: cacheResult
            ? {
                cleared: cacheResult.cleared,
                errors: cacheResult.errors,
              }
            : null,
          timestamp: new Date().toISOString(),
          nextAutoRefresh: new Date(Date.now() + 30000).toISOString(), // 30 seconds
        },
        meta: {
          requestId: `refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          responseTime,
          force,
          clearCache,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Response-Time': responseTime.toString(),
          'X-Refresh-Status': 'completed',
        },
      },
    );
  } catch (error) {
    console.error('Dashboard refresh error:', error);

    const responseTime = Math.round(performance.now() - startTime);

    // Determine error type
    let statusCode = 500;
    let errorMessage = 'Refresh operation failed';

    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = 'Invalid refresh parameters';
    } else if (error instanceof Error && error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = 'Refresh operation timed out';
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
        meta: {
          responseTime,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Response-Time': responseTime.toString(),
          'X-Refresh-Status': 'failed',
        },
      },
    );
  }
}

/**
 * OPTIONS /api/monitoring/dashboard/refresh
 * CORS preflight handler
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      Allow: 'POST, OPTIONS',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
