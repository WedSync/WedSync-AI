/**
 * WS-148 Round 2: Performance Metrics API Endpoint
 *
 * GET /api/encryption/performance-metrics
 *
 * Monitoring dashboard for encryption performance validation
 * Security Level: P0 - CRITICAL
 */

import { NextRequest, NextResponse } from 'next/server';
import { advancedEncryptionMiddleware } from '@/lib/security/advanced-encryption-middleware';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Request validation schema
const PerformanceMetricsRequestSchema = z.object({
  time_range: z
    .enum(['1h', '6h', '24h', '7d', '30d'])
    .optional()
    .default('24h'),
  operation_types: z.array(z.string()).optional(),
  include_benchmarks: z.boolean().optional().default(true),
  include_cache_metrics: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  const supabase = createClientComponentClient();

  try {
    // Authenticate user - Admin access only for performance metrics
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const requestParams = {
      time_range: searchParams.get('time_range') || '24h',
      operation_types: searchParams.get('operation_types')?.split(','),
      include_benchmarks: searchParams.get('include_benchmarks') !== 'false',
      include_cache_metrics:
        searchParams.get('include_cache_metrics') !== 'false',
    };

    const validatedRequest =
      PerformanceMetricsRequestSchema.parse(requestParams);

    // Calculate time range
    const timeRangeMap: Record<string, string> = {
      '1h': '1 hour',
      '6h': '6 hours',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };

    const timeInterval = timeRangeMap[validatedRequest.time_range];

    // Get encryption performance metrics from database
    let metricsQuery = supabase
      .from('encryption.performance_metrics_v2')
      .select('*')
      .gte('created_at', `now() - interval '${timeInterval}'`)
      .order('created_at', { ascending: false });

    if (
      validatedRequest.operation_types &&
      validatedRequest.operation_types.length > 0
    ) {
      metricsQuery = metricsQuery.in(
        'operation_type',
        validatedRequest.operation_types,
      );
    }

    const { data: performanceData, error: metricsError } = await metricsQuery;

    if (metricsError) {
      throw new Error(
        `Failed to fetch performance metrics: ${metricsError.message}`,
      );
    }

    // Get performance dashboard view
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('encryption.performance_dashboard')
      .select('*')
      .order('hour_bucket', { ascending: false })
      .limit(24); // Last 24 hours of aggregated data

    if (dashboardError) {
      console.warn('Dashboard data fetch failed:', dashboardError);
    }

    // Get cache metrics if requested
    let cacheMetrics = null;
    if (validatedRequest.include_cache_metrics) {
      const { data: cacheData, error: cacheError } = await supabase
        .from('encryption.cache_performance_dashboard')
        .select('*')
        .order('hour_bucket', { ascending: false })
        .limit(24);

      if (!cacheError) {
        cacheMetrics = cacheData;
      }
    }

    // Get WS-148 benchmark validation if requested
    let benchmarkValidation = null;
    if (validatedRequest.include_benchmarks) {
      const { data: validationResult, error: benchmarkError } =
        await supabase.rpc('encryption.validate_performance_benchmarks');

      if (!benchmarkError) {
        benchmarkValidation = validationResult;
      }
    }

    // Get in-memory performance metrics from middleware
    const middlewareMetrics =
      advancedEncryptionMiddleware.getPerformanceMetrics();

    // Process and aggregate metrics
    const aggregatedMetrics = processPerformanceData(performanceData || []);

    // Calculate performance trends
    const performanceTrends = calculatePerformanceTrends(dashboardData || []);

    // WS-148 specific performance validation
    const ws148Validation = {
      bulk_encryption_compliance: checkBulkEncryptionCompliance(
        performanceData || [],
      ),
      dashboard_load_compliance: checkDashboardLoadCompliance(
        performanceData || [],
      ),
      mobile_progressive_compliance: checkMobileProgressiveCompliance(
        performanceData || [],
      ),
      search_response_compliance: checkSearchResponseCompliance(
        performanceData || [],
      ),
      cache_efficiency: calculateCacheEfficiency(cacheMetrics || []),
    };

    return NextResponse.json({
      success: true,
      time_range: validatedRequest.time_range,
      timestamp: new Date().toISOString(),

      // Aggregated metrics
      aggregated_metrics: aggregatedMetrics,

      // Performance trends over time
      performance_trends: performanceTrends,

      // Real-time middleware metrics
      middleware_metrics: middlewareMetrics,

      // Cache performance
      cache_metrics: cacheMetrics,

      // WS-148 benchmark validation
      benchmark_validation: benchmarkValidation,

      // WS-148 specific compliance
      ws148_compliance: ws148Validation,

      // Raw data for detailed analysis (limited)
      raw_data: {
        recent_operations: (performanceData || []).slice(0, 100),
        total_operations: performanceData?.length || 0,
      },
    });
  } catch (error) {
    console.error('Performance metrics retrieval failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Performance metrics retrieval failed',
        message:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : 'Unknown error'
            : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Helper function to process performance data
function processPerformanceData(data: any[]): any {
  const operations = new Map<string, any[]>();

  // Group by operation type
  data.forEach((metric) => {
    if (!operations.has(metric.operation_type)) {
      operations.set(metric.operation_type, []);
    }
    operations.get(metric.operation_type)!.push(metric);
  });

  const result: any = {};

  operations.forEach((metrics, operationType) => {
    const processingTimes = metrics
      .map((m) => m.processing_time_ms)
      .filter((t) => t != null);
    const successRates = metrics
      .map((m) => m.success_rate)
      .filter((r) => r != null);
    const fieldCounts = metrics
      .map((m) => m.field_count)
      .filter((c) => c != null);

    result[operationType] = {
      total_operations: metrics.length,
      avg_processing_time_ms:
        processingTimes.length > 0
          ? Math.round(
              processingTimes.reduce((a, b) => a + b, 0) /
                processingTimes.length,
            )
          : 0,
      max_processing_time_ms:
        processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
      min_processing_time_ms:
        processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
      p95_processing_time_ms:
        processingTimes.length > 0
          ? calculatePercentile(processingTimes, 95)
          : 0,
      avg_success_rate:
        successRates.length > 0
          ? successRates.reduce((a, b) => a + b, 0) / successRates.length
          : 1,
      avg_field_count:
        fieldCounts.length > 0
          ? Math.round(
              fieldCounts.reduce((a, b) => a + b, 0) / fieldCounts.length,
            )
          : 0,
      latest_operation: metrics[0]?.created_at,
    };
  });

  return result;
}

// Helper function to calculate performance trends
function calculatePerformanceTrends(dashboardData: any[]): any {
  if (dashboardData.length === 0) return {};

  const trends: any = {};
  const operations = new Set(dashboardData.map((d) => d.operation_type));

  operations.forEach((operationType) => {
    const operationData = dashboardData
      .filter((d) => d.operation_type === operationType)
      .sort(
        (a, b) =>
          new Date(a.hour_bucket).getTime() - new Date(b.hour_bucket).getTime(),
      );

    if (operationData.length >= 2) {
      const recent = operationData.slice(-6); // Last 6 hours
      const previous = operationData.slice(-12, -6); // Previous 6 hours

      const recentAvg =
        recent.reduce((sum, d) => sum + d.avg_time_ms, 0) / recent.length;
      const previousAvg =
        previous.length > 0
          ? previous.reduce((sum, d) => sum + d.avg_time_ms, 0) /
            previous.length
          : recentAvg;

      trends[operationType] = {
        current_avg_ms: Math.round(recentAvg),
        previous_avg_ms: Math.round(previousAvg),
        trend_direction:
          recentAvg > previousAvg
            ? 'increasing'
            : recentAvg < previousAvg
              ? 'decreasing'
              : 'stable',
        trend_percentage:
          previousAvg > 0
            ? Math.round(((recentAvg - previousAvg) / previousAvg) * 100)
            : 0,
      };
    }
  });

  return trends;
}

// Helper function to calculate percentiles
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = values.sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);

  if (Math.floor(index) === index) {
    return sorted[index];
  } else {
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    return Math.round(lower + (upper - lower) * (index - Math.floor(index)));
  }
}

// WS-148 compliance check functions
function checkBulkEncryptionCompliance(data: any[]): any {
  const bulkOps = data.filter(
    (d) => d.operation_type === 'batch_encryption' && d.field_count >= 500,
  );

  if (bulkOps.length === 0) {
    return { status: 'no_data', compliant: null };
  }

  const compliantOps = bulkOps.filter((op) => op.processing_time_ms < 30000);
  return {
    status: 'tested',
    compliant: compliantOps.length / bulkOps.length > 0.9, // 90% must be compliant
    compliance_rate: Math.round((compliantOps.length / bulkOps.length) * 100),
    avg_time_ms: Math.round(
      bulkOps.reduce((sum, op) => sum + op.processing_time_ms, 0) /
        bulkOps.length,
    ),
    target_time_ms: 30000,
    tested_operations: bulkOps.length,
  };
}

function checkDashboardLoadCompliance(data: any[]): any {
  const dashboardOps = data.filter(
    (d) => d.operation_type === 'dashboard_decrypt' && d.field_count >= 50,
  );

  if (dashboardOps.length === 0) {
    return { status: 'no_data', compliant: null };
  }

  const compliantOps = dashboardOps.filter(
    (op) => op.processing_time_ms < 2000,
  );
  return {
    status: 'tested',
    compliant: compliantOps.length / dashboardOps.length > 0.95, // 95% must be compliant
    compliance_rate: Math.round(
      (compliantOps.length / dashboardOps.length) * 100,
    ),
    avg_time_ms: Math.round(
      dashboardOps.reduce((sum, op) => sum + op.processing_time_ms, 0) /
        dashboardOps.length,
    ),
    target_time_ms: 2000,
    tested_operations: dashboardOps.length,
  };
}

function checkMobileProgressiveCompliance(data: any[]): any {
  const mobileOps = data.filter(
    (d) => d.operation_type === 'progressive_decrypt_high_priority',
  );

  if (mobileOps.length === 0) {
    return { status: 'no_data', compliant: null };
  }

  const compliantOps = mobileOps.filter((op) => op.processing_time_ms < 3000);
  return {
    status: 'tested',
    compliant: compliantOps.length / mobileOps.length > 0.9, // 90% must be compliant
    compliance_rate: Math.round((compliantOps.length / mobileOps.length) * 100),
    avg_time_ms: Math.round(
      mobileOps.reduce((sum, op) => sum + op.processing_time_ms, 0) /
        mobileOps.length,
    ),
    target_time_ms: 3000,
    tested_operations: mobileOps.length,
  };
}

function checkSearchResponseCompliance(data: any[]): any {
  const searchOps = data.filter((d) => d.operation_type.includes('search'));

  if (searchOps.length === 0) {
    return { status: 'no_data', compliant: null };
  }

  const compliantOps = searchOps.filter((op) => op.processing_time_ms < 1000);
  return {
    status: 'tested',
    compliant: compliantOps.length / searchOps.length > 0.95, // 95% must be compliant
    compliance_rate: Math.round((compliantOps.length / searchOps.length) * 100),
    avg_time_ms: Math.round(
      searchOps.reduce((sum, op) => sum + op.processing_time_ms, 0) /
        searchOps.length,
    ),
    target_time_ms: 1000,
    tested_operations: searchOps.length,
  };
}

function calculateCacheEfficiency(cacheData: any[]): any {
  if (cacheData.length === 0) {
    return { status: 'no_data', efficient: null };
  }

  const totalRequests = cacheData.reduce((sum, d) => sum + d.total_requests, 0);
  const totalHits = cacheData.reduce((sum, d) => sum + d.cache_hits, 0);

  const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;

  return {
    status: 'measured',
    efficient: hitRate > 0.8, // 80% hit rate target
    hit_rate_percent: Math.round(hitRate * 100),
    target_hit_rate_percent: 80,
    total_requests: totalRequests,
    total_hits: totalHits,
  };
}
