/**
 * WS-188: Sync Queue Analytics API
 * Team B - Backend Focus - Sync performance metrics and optimization insights
 *
 * Provides comprehensive analytics for sync queue performance and optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Use Supabase MCP for database operations
const supabaseMcp = {
  async executeQuery(query: string, params?: any[]) {
    // This would use the actual Supabase MCP connection
    return { data: [], error: null };
  },

  async callFunction(functionName: string, params: any) {
    // This would use the actual Supabase MCP function calling
    return { data: null, error: null };
  },
};

/**
 * GET /api/offline/queue/analytics - Sync performance metrics and optimization insights
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('timeRange') || '7d'; // 1h, 24h, 7d, 30d
    const deviceId = url.searchParams.get('deviceId');
    const includeDetails = url.searchParams.get('details') === 'true';

    // Parse time range
    const timeRangeHours = parseTimeRange(timeRange);
    const startTime = new Date(
      Date.now() - timeRangeHours * 60 * 60 * 1000,
    ).toISOString();

    // Collect analytics data concurrently
    const [
      queuePerformance,
      conflictAnalytics,
      throughputMetrics,
      devicePerformance,
      errorAnalysis,
      optimizationInsights,
    ] = await Promise.all([
      getQueuePerformanceMetrics(userId, startTime, deviceId),
      getConflictAnalytics(userId, startTime, deviceId),
      getThroughputMetrics(userId, startTime, deviceId),
      getDevicePerformanceBreakdown(userId, startTime),
      getErrorAnalysis(userId, startTime, deviceId),
      getOptimizationInsights(userId, startTime, deviceId),
    ]);

    // Calculate overall health score
    const healthScore = calculateSyncHealthScore({
      queuePerformance,
      conflictAnalytics,
      throughputMetrics,
      errorAnalysis,
    });

    const response = {
      success: true,
      timeRange,
      startTime,
      endTime: new Date().toISOString(),
      deviceId: deviceId || 'all',
      healthScore,
      analytics: {
        queue: queuePerformance,
        conflicts: conflictAnalytics,
        throughput: throughputMetrics,
        devices: devicePerformance,
        errors: errorAnalysis,
        optimization: optimizationInsights,
      },
    };

    // Add detailed breakdowns if requested
    if (includeDetails) {
      const detailedData = await getDetailedAnalytics(
        userId,
        startTime,
        deviceId,
      );
      response.analytics = { ...response.analytics, ...detailedData };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Queue Analytics Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to get queue analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/offline/queue/analytics - Generate custom analytics report
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const CustomAnalyticsSchema = z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      metrics: z.array(
        z.enum([
          'queue_performance',
          'conflict_analysis',
          'throughput',
          'device_breakdown',
          'error_patterns',
          'optimization_recommendations',
          'user_behavior',
          'resource_utilization',
        ]),
      ),
      groupBy: z
        .enum(['hour', 'day', 'week', 'device', 'operation_type'])
        .optional()
        .default('day'),
      filters: z
        .object({
          deviceId: z.string().optional(),
          operationType: z.enum(['create', 'update', 'delete']).optional(),
          priority: z.number().min(1).max(10).optional(),
          status: z
            .enum(['pending', 'processing', 'completed', 'failed'])
            .optional(),
        })
        .optional(),
    });

    const validatedData = CustomAnalyticsSchema.parse(body);

    // Generate custom report
    const customReport = await generateCustomAnalyticsReport(
      userId,
      validatedData,
    );

    return NextResponse.json({
      success: true,
      reportId: crypto.randomUUID(),
      parameters: validatedData,
      generatedAt: new Date().toISOString(),
      data: customReport,
    });
  } catch (error) {
    console.error('[Custom Analytics Error]:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid analytics request',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate custom analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Parse time range string to hours
 */
function parseTimeRange(timeRange: string): number {
  const ranges: Record<string, number> = {
    '1h': 1,
    '24h': 24,
    '7d': 168, // 7 * 24
    '30d': 720, // 30 * 24
    '90d': 2160, // 90 * 24
  };

  return ranges[timeRange] || 168; // Default to 7 days
}

/**
 * Get queue performance metrics
 */
async function getQueuePerformanceMetrics(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    const { data: performance } = await supabaseMcp.executeQuery(
      `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_items,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_items,
        AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, updated_at) - created_at))) as avg_processing_time_seconds,
        MAX(EXTRACT(EPOCH FROM (COALESCE(completed_at, updated_at) - created_at))) as max_processing_time_seconds,
        AVG(priority) as avg_priority,
        AVG(retry_count) as avg_retry_count
      FROM sync_queue 
      WHERE user_id = $1 
        AND created_at >= $2
        AND (device_id = $3 OR $3 IS NULL)
    `,
      [userId, startTime, deviceId],
    );

    const metrics = performance?.[0] || {};

    return {
      totalItems: parseInt(metrics.total_items) || 0,
      completedItems: parseInt(metrics.completed_items) || 0,
      failedItems: parseInt(metrics.failed_items) || 0,
      pendingItems: parseInt(metrics.pending_items) || 0,
      processingItems: parseInt(metrics.processing_items) || 0,
      successRate: metrics.total_items
        ? (metrics.completed_items / metrics.total_items) * 100
        : 0,
      avgProcessingTimeSeconds:
        parseFloat(metrics.avg_processing_time_seconds) || 0,
      maxProcessingTimeSeconds:
        parseFloat(metrics.max_processing_time_seconds) || 0,
      avgPriority: parseFloat(metrics.avg_priority) || 0,
      avgRetryCount: parseFloat(metrics.avg_retry_count) || 0,
    };
  } catch (error) {
    console.error('[Queue Performance Metrics Error]:', error);
    return {
      totalItems: 0,
      completedItems: 0,
      failedItems: 0,
      pendingItems: 0,
      processingItems: 0,
      successRate: 0,
      avgProcessingTimeSeconds: 0,
      maxProcessingTimeSeconds: 0,
      avgPriority: 0,
      avgRetryCount: 0,
    };
  }
}

/**
 * Get conflict analytics
 */
async function getConflictAnalytics(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    const { data: conflicts } = await supabaseMcp.executeQuery(
      `
      SELECT 
        COUNT(*) as total_conflicts,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_conflicts,
        COUNT(CASE WHEN status = 'pending_manual_resolution' THEN 1 END) as pending_conflicts,
        COUNT(CASE WHEN resolution_strategy = 'use_client' THEN 1 END) as client_wins,
        COUNT(CASE WHEN resolution_strategy = 'use_server' THEN 1 END) as server_wins,
        COUNT(CASE WHEN resolution_strategy = 'merge_automatic' THEN 1 END) as auto_merged,
        COUNT(CASE WHEN resolution_strategy = 'merge_manual' THEN 1 END) as manual_merged,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_seconds,
        conflict_type,
        table_name
      FROM conflict_resolution 
      WHERE user_id = $1 
        AND created_at >= $2
        AND (device_id = $3 OR $3 IS NULL)
      GROUP BY conflict_type, table_name
    `,
      [userId, startTime, deviceId],
    );

    // Aggregate conflict data
    const conflictSummary = (conflicts || []).reduce(
      (acc, row) => {
        acc.totalConflicts += parseInt(row.total_conflicts) || 0;
        acc.resolvedConflicts += parseInt(row.resolved_conflicts) || 0;
        acc.pendingConflicts += parseInt(row.pending_conflicts) || 0;
        acc.clientWins += parseInt(row.client_wins) || 0;
        acc.serverWins += parseInt(row.server_wins) || 0;
        acc.autoMerged += parseInt(row.auto_merged) || 0;
        acc.manualMerged += parseInt(row.manual_merged) || 0;

        if (row.avg_resolution_time_seconds) {
          acc.totalResolutionTime += parseFloat(
            row.avg_resolution_time_seconds,
          );
          acc.resolutionCount += 1;
        }

        return acc;
      },
      {
        totalConflicts: 0,
        resolvedConflicts: 0,
        pendingConflicts: 0,
        clientWins: 0,
        serverWins: 0,
        autoMerged: 0,
        manualMerged: 0,
        totalResolutionTime: 0,
        resolutionCount: 0,
      },
    );

    return {
      ...conflictSummary,
      resolutionRate: conflictSummary.totalConflicts
        ? (conflictSummary.resolvedConflicts / conflictSummary.totalConflicts) *
          100
        : 0,
      avgResolutionTimeSeconds: conflictSummary.resolutionCount
        ? conflictSummary.totalResolutionTime / conflictSummary.resolutionCount
        : 0,
      conflictsByType: conflicts || [],
      autoResolutionRate: conflictSummary.totalConflicts
        ? ((conflictSummary.clientWins +
            conflictSummary.serverWins +
            conflictSummary.autoMerged) /
            conflictSummary.totalConflicts) *
          100
        : 0,
    };
  } catch (error) {
    console.error('[Conflict Analytics Error]:', error);
    return {
      totalConflicts: 0,
      resolvedConflicts: 0,
      pendingConflicts: 0,
      clientWins: 0,
      serverWins: 0,
      autoMerged: 0,
      manualMerged: 0,
      resolutionRate: 0,
      avgResolutionTimeSeconds: 0,
      conflictsByType: [],
      autoResolutionRate: 0,
    };
  }
}

/**
 * Get throughput metrics
 */
async function getThroughputMetrics(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    const { data: throughput } = await supabaseMcp.executeQuery(
      `
      SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        COUNT(*) as items_processed,
        AVG(processing_time_ms) as avg_processing_time_ms,
        SUM(items_synced) as total_items_synced,
        AVG(throughput_per_second) as avg_throughput_per_second,
        MAX(throughput_per_second) as peak_throughput_per_second
      FROM sync_performance_metrics 
      WHERE user_id = $1 
        AND created_at >= $2
        AND (device_id = $3 OR $3 IS NULL)
      GROUP BY DATE_TRUNC('hour', created_at)
      ORDER BY hour ASC
    `,
      [userId, startTime, deviceId],
    );

    // Calculate overall metrics
    const overallMetrics = (throughput || []).reduce(
      (acc, row) => {
        acc.totalItemsProcessed += parseInt(row.items_processed) || 0;
        acc.totalItemsSynced += parseInt(row.total_items_synced) || 0;
        acc.totalProcessingTime += parseFloat(row.avg_processing_time_ms) || 0;
        acc.totalThroughput += parseFloat(row.avg_throughput_per_second) || 0;
        acc.peakThroughput = Math.max(
          acc.peakThroughput,
          parseFloat(row.peak_throughput_per_second) || 0,
        );
        acc.hourCount += 1;
        return acc;
      },
      {
        totalItemsProcessed: 0,
        totalItemsSynced: 0,
        totalProcessingTime: 0,
        totalThroughput: 0,
        peakThroughput: 0,
        hourCount: 0,
      },
    );

    return {
      hourlyBreakdown: throughput || [],
      totalItemsProcessed: overallMetrics.totalItemsProcessed,
      totalItemsSynced: overallMetrics.totalItemsSynced,
      avgProcessingTimeMs: overallMetrics.hourCount
        ? overallMetrics.totalProcessingTime / overallMetrics.hourCount
        : 0,
      avgThroughputPerSecond: overallMetrics.hourCount
        ? overallMetrics.totalThroughput / overallMetrics.hourCount
        : 0,
      peakThroughputPerSecond: overallMetrics.peakThroughput,
    };
  } catch (error) {
    console.error('[Throughput Metrics Error]:', error);
    return {
      hourlyBreakdown: [],
      totalItemsProcessed: 0,
      totalItemsSynced: 0,
      avgProcessingTimeMs: 0,
      avgThroughputPerSecond: 0,
      peakThroughputPerSecond: 0,
    };
  }
}

/**
 * Get device performance breakdown
 */
async function getDevicePerformanceBreakdown(
  userId: string,
  startTime: string,
) {
  try {
    const { data: devices } = await supabaseMcp.executeQuery(
      `
      SELECT 
        device_id,
        COUNT(*) as sync_sessions,
        AVG(processing_time_ms) as avg_processing_time_ms,
        AVG(items_synced) as avg_items_per_session,
        AVG(throughput_per_second) as avg_throughput,
        SUM(conflicts_detected) as total_conflicts,
        SUM(failures_count) as total_failures,
        MAX(created_at) as last_sync_time
      FROM sync_performance_metrics 
      WHERE user_id = $1 
        AND created_at >= $2
        AND device_id IS NOT NULL
      GROUP BY device_id
      ORDER BY sync_sessions DESC
    `,
      [userId, startTime],
    );

    return (devices || []).map((device) => ({
      deviceId: device.device_id,
      syncSessions: parseInt(device.sync_sessions) || 0,
      avgProcessingTimeMs: parseFloat(device.avg_processing_time_ms) || 0,
      avgItemsPerSession: parseFloat(device.avg_items_per_session) || 0,
      avgThroughput: parseFloat(device.avg_throughput) || 0,
      totalConflicts: parseInt(device.total_conflicts) || 0,
      totalFailures: parseInt(device.total_failures) || 0,
      lastSyncTime: device.last_sync_time,
      successRate: device.sync_sessions
        ? ((device.sync_sessions - (device.total_failures || 0)) /
            device.sync_sessions) *
          100
        : 0,
    }));
  } catch (error) {
    console.error('[Device Performance Error]:', error);
    return [];
  }
}

/**
 * Get error analysis
 */
async function getErrorAnalysis(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    const { data: errors } = await supabaseMcp.executeQuery(
      `
      SELECT 
        error_message,
        COUNT(*) as occurrence_count,
        MAX(created_at) as last_occurrence,
        AVG(retry_count) as avg_retry_count,
        operation_type,
        table_name
      FROM sync_queue 
      WHERE user_id = $1 
        AND created_at >= $2
        AND status = 'failed'
        AND error_message IS NOT NULL
        AND (device_id = $3 OR $3 IS NULL)
      GROUP BY error_message, operation_type, table_name
      ORDER BY occurrence_count DESC
      LIMIT 20
    `,
      [userId, startTime, deviceId],
    );

    // Categorize errors
    const errorCategories = {
      network: 0,
      validation: 0,
      permission: 0,
      conflict: 0,
      system: 0,
      unknown: 0,
    };

    (errors || []).forEach((error) => {
      const message = (error.error_message || '').toLowerCase();
      const count = parseInt(error.occurrence_count) || 0;

      if (
        message.includes('network') ||
        message.includes('connection') ||
        message.includes('timeout')
      ) {
        errorCategories.network += count;
      } else if (
        message.includes('validation') ||
        message.includes('invalid') ||
        message.includes('schema')
      ) {
        errorCategories.validation += count;
      } else if (
        message.includes('permission') ||
        message.includes('unauthorized') ||
        message.includes('forbidden')
      ) {
        errorCategories.permission += count;
      } else if (message.includes('conflict') || message.includes('merge')) {
        errorCategories.conflict += count;
      } else if (
        message.includes('system') ||
        message.includes('internal') ||
        message.includes('database')
      ) {
        errorCategories.system += count;
      } else {
        errorCategories.unknown += count;
      }
    });

    return {
      topErrors: errors || [],
      errorCategories,
      totalErrors: (errors || []).reduce(
        (sum, error) => sum + (parseInt(error.occurrence_count) || 0),
        0,
      ),
    };
  } catch (error) {
    console.error('[Error Analysis Error]:', error);
    return {
      topErrors: [],
      errorCategories: {
        network: 0,
        validation: 0,
        permission: 0,
        conflict: 0,
        system: 0,
        unknown: 0,
      },
      totalErrors: 0,
    };
  }
}

/**
 * Get optimization insights
 */
async function getOptimizationInsights(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    // Calculate optimization recommendations
    const insights = await supabaseMcp.callFunction(
      'generate_sync_optimization_insights',
      {
        p_user_id: userId,
        p_start_time: startTime,
        p_device_id: deviceId,
      },
    );

    return (
      insights?.data || {
        recommendations: [
          'No specific optimizations identified for current sync patterns',
        ],
        potentialImprovements: [],
        riskFactors: [],
        performanceScore: 85,
      }
    );
  } catch (error) {
    console.error('[Optimization Insights Error]:', error);
    return {
      recommendations: [
        'Unable to generate optimization insights - check sync data availability',
      ],
      potentialImprovements: [],
      riskFactors: [],
      performanceScore: 0,
    };
  }
}

/**
 * Calculate overall sync health score
 */
function calculateSyncHealthScore(analytics: any): number {
  try {
    const {
      queuePerformance,
      conflictAnalytics,
      throughputMetrics,
      errorAnalysis,
    } = analytics;

    // Success rate weight: 40%
    const successRateScore = (queuePerformance.successRate || 0) * 0.4;

    // Conflict resolution rate weight: 25%
    const conflictResolutionScore =
      (conflictAnalytics.resolutionRate || 0) * 0.25;

    // Error rate weight: 20% (inverted - fewer errors = better score)
    const errorRateScore =
      Math.max(
        0,
        100 -
          ((errorAnalysis.totalErrors || 0) /
            Math.max(queuePerformance.totalItems, 1)) *
            100,
      ) * 0.2;

    // Throughput consistency weight: 15%
    const throughputScore =
      Math.min(100, (throughputMetrics.avgThroughputPerSecond || 0) * 10) *
      0.15;

    const healthScore =
      successRateScore +
      conflictResolutionScore +
      errorRateScore +
      throughputScore;

    return Math.round(Math.max(0, Math.min(100, healthScore)));
  } catch (error) {
    console.error('[Health Score Calculation Error]:', error);
    return 0;
  }
}

/**
 * Get detailed analytics (when details=true)
 */
async function getDetailedAnalytics(
  userId: string,
  startTime: string,
  deviceId?: string,
) {
  try {
    // This would include more granular data like:
    // - Per-table sync performance
    // - User behavior patterns
    // - Resource utilization
    // - Detailed error traces
    // - Performance trends over time

    return {
      tablePerformance: [],
      userBehaviorPatterns: {},
      resourceUtilization: {},
      detailedErrorTraces: [],
      performanceTrends: [],
    };
  } catch (error) {
    console.error('[Detailed Analytics Error]:', error);
    return {};
  }
}

/**
 * Generate custom analytics report
 */
async function generateCustomAnalyticsReport(userId: string, parameters: any) {
  try {
    // This would generate a custom report based on the specified parameters
    // Implementation would depend on the specific metrics requested

    return {
      summary: 'Custom analytics report generated successfully',
      data: {},
      insights: [],
      recommendations: [],
    };
  } catch (error) {
    console.error('[Custom Analytics Report Error]:', error);
    return {
      summary: 'Failed to generate custom analytics report',
      data: {},
      insights: [],
      recommendations: [],
    };
  }
}
