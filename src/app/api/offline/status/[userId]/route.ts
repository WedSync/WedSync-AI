/**
 * WS-172: Offline Sync Status API
 * Team B - Round 3 - Batch 21
 *
 * GET /api/offline/status/:userId - Sync status and progress endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Use Supabase MCP for database operations
const supabaseMcp = {
  async executeQuery(query: string, params?: any[]) {
    // This would use the actual Supabase MCP connection
    // For now, implementing the interface
    return { data: [], error: null };
  },

  async callFunction(functionName: string, params: any) {
    // This would use the actual Supabase MCP function calling
    return { data: null, error: null };
  },
};

interface RouteParams {
  params: {
    userId: string;
  };
}

/**
 * GET /api/offline/status/:userId - Get comprehensive sync status for user
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = params;

    // Validate userId format
    const userIdValidation = z.string().uuid().safeParse(userId);
    if (!userIdValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid user ID format',
        },
        { status: 400 },
      );
    }

    // Verify request authentication
    const requestUserId = request.headers.get('x-user-id');
    const adminToken = request.headers.get('x-admin-token');

    // User can only access their own status unless they're admin
    if (requestUserId !== userId && !adminToken) {
      return NextResponse.json(
        {
          error: 'Unauthorized - cannot access other user status',
        },
        { status: 403 },
      );
    }

    // Get comprehensive sync status
    const syncStatus = await getSyncStatus(userId);
    const queueMetrics = await getQueueMetrics(userId);
    const conflictSummary = await getConflictSummary(userId);
    const performanceMetrics = await getPerformanceMetrics(userId);
    const deviceInfo = await getDeviceInfo(userId);

    const response = {
      success: true,
      userId,
      timestamp: new Date().toISOString(),

      // Core sync status
      syncStatus: {
        lastSyncTime: syncStatus.lastSyncTime,
        lastSuccessfulSync: syncStatus.lastSuccessfulSync,
        syncInProgress: syncStatus.syncInProgress,
        currentSessionId: syncStatus.syncSessionId,
        deviceId: syncStatus.deviceId,
        appVersion: syncStatus.appVersion,
      },

      // Queue metrics
      queue: {
        totalItems: queueMetrics.totalItems,
        pendingItems: queueMetrics.pendingItems,
        processingItems: queueMetrics.processingItems,
        failedItems: queueMetrics.failedItems,
        completedItems: queueMetrics.completedItems,
        oldestPendingItem: queueMetrics.oldestPendingTime,
        averageProcessingTime: queueMetrics.avgProcessingTime,
      },

      // Conflict information
      conflicts: {
        active: conflictSummary.activeConflicts,
        resolved: conflictSummary.resolvedConflicts,
        awaitingManualResolution: conflictSummary.manualResolutionPending,
        conflictsByTable: conflictSummary.conflictsByTable,
        resolutionStrategies: conflictSummary.resolutionStrategies,
      },

      // Performance metrics
      performance: {
        averageSyncTime: performanceMetrics.avgSyncTime,
        throughputPerSecond: performanceMetrics.throughputPerSecond,
        successRate: performanceMetrics.successRate,
        errorRate: performanceMetrics.errorRate,
        last24HoursSyncs: performanceMetrics.recentSyncs,
        networkQuality: performanceMetrics.networkQuality,
      },

      // Device information
      devices: deviceInfo,

      // Health indicators
      health: {
        status: calculateHealthStatus(
          queueMetrics,
          conflictSummary,
          performanceMetrics,
        ),
        recommendations: generateHealthRecommendations(
          queueMetrics,
          conflictSummary,
          performanceMetrics,
        ),
        alerts: generateAlerts(
          queueMetrics,
          conflictSummary,
          performanceMetrics,
        ),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Sync Status API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET with query parameters for filtered status
 */
export async function GET_FILTERED(
  request: NextRequest,
  { params }: RouteParams,
) {
  const { userId } = params;
  const { searchParams } = new URL(request.url);

  const includeQueue = searchParams.get('queue') === 'true';
  const includeConflicts = searchParams.get('conflicts') === 'true';
  const includePerformance = searchParams.get('performance') === 'true';
  const includeDevices = searchParams.get('devices') === 'true';
  const timeRange = searchParams.get('timeRange') || '24h';

  // Return filtered response based on query parameters
  const response: any = {
    success: true,
    userId,
    timestamp: new Date().toISOString(),
  };

  if (includeQueue) {
    response.queue = await getQueueMetrics(userId);
  }

  if (includeConflicts) {
    response.conflicts = await getConflictSummary(userId);
  }

  if (includePerformance) {
    response.performance = await getPerformanceMetrics(userId, timeRange);
  }

  if (includeDevices) {
    response.devices = await getDeviceInfo(userId);
  }

  return NextResponse.json(response);
}

/**
 * Get basic sync status from database
 */
async function getSyncStatus(userId: string) {
  try {
    const { data } = await supabaseMcp.callFunction('get_user_sync_status', {
      p_user_id: userId,
    });

    return (
      data || {
        lastSyncTime: null,
        lastSuccessfulSync: null,
        syncInProgress: false,
        syncSessionId: null,
        deviceId: null,
        appVersion: null,
      }
    );
  } catch (error) {
    console.error('[Get Sync Status Error]:', error);
    return {
      lastSyncTime: null,
      lastSuccessfulSync: null,
      syncInProgress: false,
      syncSessionId: null,
      deviceId: null,
      appVersion: null,
    };
  }
}

/**
 * Get queue metrics
 */
async function getQueueMetrics(userId: string) {
  try {
    const { data } = await supabaseMcp.executeQuery(
      `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_items,
        COUNT(CASE WHEN sync_status = 'processing' THEN 1 END) as processing_items,
        COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_items,
        COUNT(CASE WHEN sync_status = 'completed' THEN 1 END) as completed_items,
        MIN(CASE WHEN sync_status = 'pending' THEN created_at END) as oldest_pending,
        AVG(CASE WHEN sync_status = 'completed' 
            THEN EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000 
            END) as avg_processing_time_ms
      FROM offline_sync_queue
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '7 days'
    `,
      [userId],
    );

    const metrics = data?.[0] || {};

    return {
      totalItems: parseInt(metrics.total_items) || 0,
      pendingItems: parseInt(metrics.pending_items) || 0,
      processingItems: parseInt(metrics.processing_items) || 0,
      failedItems: parseInt(metrics.failed_items) || 0,
      completedItems: parseInt(metrics.completed_items) || 0,
      oldestPendingTime: metrics.oldest_pending,
      avgProcessingTime: parseFloat(metrics.avg_processing_time_ms) || 0,
    };
  } catch (error) {
    console.error('[Get Queue Metrics Error]:', error);
    return {
      totalItems: 0,
      pendingItems: 0,
      processingItems: 0,
      failedItems: 0,
      completedItems: 0,
      oldestPendingTime: null,
      avgProcessingTime: 0,
    };
  }
}

/**
 * Get conflict summary
 */
async function getConflictSummary(userId: string) {
  try {
    const { data } = await supabaseMcp.executeQuery(
      `
      SELECT 
        COUNT(*) as total_conflicts,
        COUNT(CASE WHEN resolution_applied = false THEN 1 END) as active_conflicts,
        COUNT(CASE WHEN resolution_applied = true THEN 1 END) as resolved_conflicts,
        COUNT(CASE WHEN resolution_strategy = 'manual' AND resolution_applied = false THEN 1 END) as manual_pending,
        table_name,
        resolution_strategy,
        COUNT(*) as strategy_count
      FROM sync_conflict_log
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY table_name, resolution_strategy
      ORDER BY strategy_count DESC
    `,
      [userId],
    );

    const conflicts = data || [];
    const totalActive = conflicts.filter((c) => !c.resolution_applied).length;
    const totalResolved = conflicts.filter((c) => c.resolution_applied).length;
    const manualPending = conflicts.filter(
      (c) => c.resolution_strategy === 'manual' && !c.resolution_applied,
    ).length;

    // Group by table
    const conflictsByTable = conflicts.reduce((acc: any, conflict: any) => {
      if (!acc[conflict.table_name]) {
        acc[conflict.table_name] = 0;
      }
      acc[conflict.table_name] += parseInt(conflict.strategy_count);
      return acc;
    }, {});

    // Group by resolution strategy
    const resolutionStrategies = conflicts.reduce((acc: any, conflict: any) => {
      if (!acc[conflict.resolution_strategy]) {
        acc[conflict.resolution_strategy] = 0;
      }
      acc[conflict.resolution_strategy] += parseInt(conflict.strategy_count);
      return acc;
    }, {});

    return {
      activeConflicts: totalActive,
      resolvedConflicts: totalResolved,
      manualResolutionPending: manualPending,
      conflictsByTable,
      resolutionStrategies,
    };
  } catch (error) {
    console.error('[Get Conflict Summary Error]:', error);
    return {
      activeConflicts: 0,
      resolvedConflicts: 0,
      manualResolutionPending: 0,
      conflictsByTable: {},
      resolutionStrategies: {},
    };
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(
  userId: string,
  timeRange: string = '24h',
) {
  try {
    const interval = timeRange === '7d' ? '7 days' : '24 hours';

    const { data } = await supabaseMcp.executeQuery(
      `
      SELECT 
        AVG(processing_time_ms) as avg_sync_time,
        AVG(throughput_per_second) as avg_throughput,
        COUNT(*) as total_syncs,
        COUNT(CASE WHEN failures_count = 0 THEN 1 END) as successful_syncs,
        COUNT(CASE WHEN failures_count > 0 THEN 1 END) as failed_syncs,
        MAX(created_at) as last_sync
      FROM sync_performance_metrics
      WHERE user_id = $1
      AND created_at > NOW() - INTERVAL $2
    `,
      [userId, interval],
    );

    const metrics = data?.[0] || {};
    const totalSyncs = parseInt(metrics.total_syncs) || 0;
    const successfulSyncs = parseInt(metrics.successful_syncs) || 0;
    const failedSyncs = parseInt(metrics.failed_syncs) || 0;

    return {
      avgSyncTime: parseFloat(metrics.avg_sync_time) || 0,
      throughputPerSecond: parseFloat(metrics.avg_throughput) || 0,
      successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100,
      errorRate: totalSyncs > 0 ? (failedSyncs / totalSyncs) * 100 : 0,
      recentSyncs: totalSyncs,
      networkQuality: calculateNetworkQuality(
        metrics.avg_sync_time,
        metrics.avg_throughput,
      ),
    };
  } catch (error) {
    console.error('[Get Performance Metrics Error]:', error);
    return {
      avgSyncTime: 0,
      throughputPerSecond: 0,
      successRate: 100,
      errorRate: 0,
      recentSyncs: 0,
      networkQuality: 'unknown',
    };
  }
}

/**
 * Get device information
 */
async function getDeviceInfo(userId: string) {
  try {
    const { data } = await supabaseMcp.executeQuery(
      `
      SELECT DISTINCT
        device_id,
        app_version,
        MAX(updated_at) as last_seen
      FROM offline_sync_status
      WHERE user_id = $1
      AND device_id IS NOT NULL
      GROUP BY device_id, app_version
      ORDER BY last_seen DESC
      LIMIT 10
    `,
      [userId],
    );

    return data || [];
  } catch (error) {
    console.error('[Get Device Info Error]:', error);
    return [];
  }
}

/**
 * Calculate overall health status
 */
function calculateHealthStatus(
  queueMetrics: any,
  conflictSummary: any,
  performanceMetrics: any,
): string {
  // Check for critical issues
  if (
    queueMetrics.failedItems > 10 ||
    conflictSummary.manualResolutionPending > 5
  ) {
    return 'critical';
  }

  // Check for warning conditions
  if (
    queueMetrics.pendingItems > 50 ||
    performanceMetrics.errorRate > 10 ||
    conflictSummary.activeConflicts > 2
  ) {
    return 'warning';
  }

  // Check for degraded performance
  if (
    performanceMetrics.avgSyncTime > 2000 ||
    performanceMetrics.errorRate > 5
  ) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Generate health recommendations
 */
function generateHealthRecommendations(
  queueMetrics: any,
  conflictSummary: any,
  performanceMetrics: any,
): string[] {
  const recommendations = [];

  if (queueMetrics.failedItems > 5) {
    recommendations.push(
      'Review failed sync items and resolve underlying issues',
    );
  }

  if (queueMetrics.pendingItems > 25) {
    recommendations.push(
      'Consider reducing sync frequency or batch size to improve processing',
    );
  }

  if (conflictSummary.manualResolutionPending > 3) {
    recommendations.push(
      'Resolve pending manual conflicts to improve sync efficiency',
    );
  }

  if (performanceMetrics.avgSyncTime > 1500) {
    recommendations.push(
      'Check network connection or reduce sync payload size',
    );
  }

  if (performanceMetrics.errorRate > 8) {
    recommendations.push(
      'Investigate recurring sync errors and implement retry logic',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Sync system is operating normally');
  }

  return recommendations;
}

/**
 * Generate system alerts
 */
function generateAlerts(
  queueMetrics: any,
  conflictSummary: any,
  performanceMetrics: any,
): Array<{ type: string; message: string; severity: string }> {
  const alerts = [];

  if (queueMetrics.failedItems > 15) {
    alerts.push({
      type: 'sync_failures',
      message: `${queueMetrics.failedItems} sync operations have failed`,
      severity: 'high',
    });
  }

  if (conflictSummary.manualResolutionPending > 5) {
    alerts.push({
      type: 'manual_conflicts',
      message: `${conflictSummary.manualResolutionPending} conflicts require manual resolution`,
      severity: 'medium',
    });
  }

  if (performanceMetrics.errorRate > 15) {
    alerts.push({
      type: 'error_rate',
      message: `Error rate is ${performanceMetrics.errorRate.toFixed(1)}% - above threshold`,
      severity: 'high',
    });
  }

  if (queueMetrics.oldestPendingTime) {
    const oldestAge =
      Date.now() - new Date(queueMetrics.oldestPendingTime).getTime();
    if (oldestAge > 24 * 60 * 60 * 1000) {
      // 24 hours
      alerts.push({
        type: 'stale_queue',
        message: 'Some sync items have been pending for over 24 hours',
        severity: 'medium',
      });
    }
  }

  return alerts;
}

/**
 * Calculate network quality based on performance metrics
 */
function calculateNetworkQuality(
  avgSyncTime: number,
  throughput: number,
): string {
  if (!avgSyncTime || !throughput) return 'unknown';

  if (avgSyncTime < 500 && throughput > 10) return 'excellent';
  if (avgSyncTime < 1000 && throughput > 5) return 'good';
  if (avgSyncTime < 2000 && throughput > 2) return 'fair';
  return 'poor';
}
