import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { featureRequestMonitor } from '@/lib/monitoring/FeatureRequestSystemMonitor';
import { z } from 'zod';

// Validation schema for performance metrics request
const PerformanceMetricsSchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  components: z.array(z.string()).optional(),
  includeWeddingContext: z.boolean().optional().default(true),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

/**
 * GET /api/monitoring/performance-metrics
 * Get performance metrics for WS-237 Feature Request Management System
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required for performance metrics' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      timeRange: searchParams.get('timeRange') || '24h',
      components: searchParams.get('components')?.split(','),
      includeWeddingContext:
        searchParams.get('includeWeddingContext') !== 'false',
      format: searchParams.get('format') || 'json',
    };

    const validatedParams = PerformanceMetricsSchema.parse(queryParams);

    // Get performance metrics
    const healthCheck = await featureRequestMonitor.performHealthCheck();
    const performanceData = {
      timestamp: new Date().toISOString(),
      timeRange: validatedParams.timeRange,
      performance: healthCheck.performance,
      weddingIndustryMetrics: validatedParams.includeWeddingContext
        ? healthCheck.weddingIndustry
        : undefined,
      systemHealth: healthCheck.overall,
      recommendations: healthCheck.recommendations,
    };

    // Filter components if specified
    if (validatedParams.components && validatedParams.components.length > 0) {
      const filteredComponents = Object.keys(performanceData.performance)
        .filter((key) => validatedParams.components!.includes(key))
        .reduce((obj, key) => {
          obj[key] =
            performanceData.performance[
              key as keyof typeof performanceData.performance
            ];
          return obj;
        }, {} as any);

      performanceData.performance = filteredComponents;
    }

    // Return data in requested format
    if (validatedParams.format === 'csv') {
      const csvData = generateCSV(performanceData);

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="performance-metrics-${validatedParams.timeRange}.csv"`,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: performanceData,
      });
    }
  } catch (error) {
    console.error('Performance metrics error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve performance metrics',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/monitoring/performance-metrics
 * Record custom performance metrics
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Authenticate user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get request body
    const body = await request.json();
    const { component, metric, value, context } = body;

    // Validate required fields
    if (!component || !metric || value === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields: component, metric, value',
        },
        { status: 400 },
      );
    }

    // Record custom metric
    const metricRecord = {
      component,
      metric,
      value,
      context: context || {},
      user_id: session.user.id,
      timestamp: new Date().toISOString(),
      wedding_context: context?.weddingContext || null,
    };

    // Store metric (in real implementation, this would go to a time-series database)
    const { error: insertError } = await supabase
      .from('performance_metrics')
      .insert(metricRecord);

    if (insertError) {
      console.error('Failed to store performance metric:', insertError);
      return NextResponse.json(
        {
          error: 'Failed to record performance metric',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Performance metric recorded',
      metricId: `${component}.${metric}.${Date.now()}`,
    });
  } catch (error) {
    console.error('Record performance metric error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record performance metric',
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Generate CSV format from performance data
 */
function generateCSV(data: any): string {
  const rows: string[] = [];

  // CSV headers
  rows.push('Component,Metric,Value,Unit,Status,Timestamp');

  // User Context Enrichment metrics
  if (data.performance.userContextEnrichment) {
    const metrics = data.performance.userContextEnrichment;
    rows.push(
      `User Context,Average Time,${metrics.averageTime},ms,${metrics.averageTime < 100 ? 'OK' : 'SLOW'},${data.timestamp}`,
    );
    rows.push(
      `User Context,P95 Time,${metrics.p95Time},ms,${metrics.p95Time < 100 ? 'OK' : 'SLOW'},${data.timestamp}`,
    );
    rows.push(
      `User Context,Success Rate,${(metrics.successRate * 100).toFixed(2)},%,${metrics.successRate > 0.95 ? 'OK' : 'LOW'},${data.timestamp}`,
    );
    rows.push(
      `User Context,Cache Hit Rate,${(metrics.cacheHitRate * 100).toFixed(2)},%,${metrics.cacheHitRate > 0.8 ? 'OK' : 'LOW'},${data.timestamp}`,
    );
  }

  // Event Processing metrics
  if (data.performance.eventProcessing) {
    const metrics = data.performance.eventProcessing;
    rows.push(
      `Event Processing,Average Time,${metrics.averageTime},ms,${metrics.averageTime < 50 ? 'OK' : 'SLOW'},${data.timestamp}`,
    );
    rows.push(
      `Event Processing,P95 Time,${metrics.p95Time},ms,${metrics.p95Time < 50 ? 'OK' : 'SLOW'},${data.timestamp}`,
    );
    rows.push(
      `Event Processing,Queue Length,${metrics.queueLength},count,${metrics.queueLength < 1000 ? 'OK' : 'HIGH'},${data.timestamp}`,
    );
    rows.push(
      `Event Processing,Throughput,${metrics.throughput},events/sec,${metrics.throughput > 10 ? 'OK' : 'LOW'},${data.timestamp}`,
    );
  }

  // Database metrics
  if (data.performance.database) {
    const metrics = data.performance.database;
    rows.push(
      `Database,Connection Count,${metrics.connectionCount},count,${metrics.connectionCount < 80 ? 'OK' : 'HIGH'},${data.timestamp}`,
    );
    rows.push(
      `Database,Average Query Time,${metrics.averageQueryTime},ms,${metrics.averageQueryTime < 50 ? 'OK' : 'SLOW'},${data.timestamp}`,
    );
    rows.push(
      `Database,Slow Queries,${metrics.slowQueries},count,${metrics.slowQueries < 10 ? 'OK' : 'HIGH'},${data.timestamp}`,
    );
    rows.push(
      `Database,Deadlocks,${metrics.deadlocks},count,${metrics.deadlocks === 0 ? 'OK' : 'ERROR'},${data.timestamp}`,
    );
  }

  // Wedding Industry Context
  if (data.weddingIndustryMetrics) {
    const metrics = data.weddingIndustryMetrics;
    rows.push(
      `Wedding Industry,Active Weddings,${metrics.activeWeddings},count,${metrics.activeWeddings > 0 ? 'ALERT' : 'OK'},${data.timestamp}`,
    );
    rows.push(
      `Wedding Industry,Saturday Protection,${metrics.saturdayProtectionActive ? 1 : 0},boolean,${metrics.saturdayProtectionActive ? 'ACTIVE' : 'INACTIVE'},${data.timestamp}`,
    );
    rows.push(
      `Wedding Industry,Urgent Requests,${metrics.urgentRequests},count,${metrics.urgentRequests > 10 ? 'HIGH' : 'OK'},${data.timestamp}`,
    );
  }

  return rows.join('\n');
}
