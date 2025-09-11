/**
 * WS-188: Device-Specific Sync Status API
 * Team B - Backend Focus - Real-time sync status with progress tracking
 *
 * Provides real-time sync status for specific devices with detailed progress tracking
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
 * GET /api/offline/sync/status/[deviceId] - Real-time device sync status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId } = params;
  if (!deviceId) {
    return NextResponse.json(
      { error: 'Device ID is required' },
      { status: 400 },
    );
  }

  try {
    // Get comprehensive device sync status
    const { data: deviceStatus } = await supabaseMcp.callFunction(
      'get_device_sync_status',
      {
        p_user_id: userId,
        p_device_id: deviceId,
      },
    );

    // Get current sync queue for this device
    const { data: queueData } = await supabaseMcp.executeQuery(
      `
      SELECT 
        id,
        operation_type,
        priority,
        status,
        created_at,
        updated_at,
        retry_count,
        last_error,
        data_size_bytes,
        estimated_processing_time_ms
      FROM sync_queue 
      WHERE user_id = $1 AND device_id = $2 
      ORDER BY priority DESC, created_at ASC
      LIMIT 50
    `,
      [userId, deviceId],
    );

    // Get sync performance metrics for this device
    const { data: performanceMetrics } = await supabaseMcp.executeQuery(
      `
      SELECT 
        AVG(processing_time_ms) as avg_processing_time,
        MAX(processing_time_ms) as max_processing_time,
        AVG(items_synced) as avg_items_per_batch,
        COUNT(*) as total_sync_sessions,
        SUM(conflicts_detected) as total_conflicts,
        SUM(failures_count) as total_failures,
        AVG(throughput_per_second) as avg_throughput
      FROM sync_performance_metrics 
      WHERE user_id = $1 
        AND device_id = $2 
        AND created_at >= NOW() - INTERVAL '7 days'
    `,
      [userId, deviceId],
    );

    // Calculate estimated completion time
    const queueItems = queueData || [];
    const avgProcessingTime =
      performanceMetrics?.[0]?.avg_processing_time || 1000;
    const estimatedCompletionMs = queueItems.length * avgProcessingTime;
    const estimatedCompletionTime =
      queueItems.length > 0
        ? new Date(Date.now() + estimatedCompletionMs).toISOString()
        : null;

    // Get conflict details requiring manual resolution
    const { data: pendingConflicts } = await supabaseMcp.executeQuery(
      `
      SELECT 
        cr.id,
        cr.sync_queue_id,
        cr.conflict_type,
        cr.table_name,
        cr.record_id,
        cr.created_at,
        sq.priority,
        cr.resolution_options
      FROM conflict_resolution cr
      JOIN sync_queue sq ON cr.sync_queue_id = sq.id
      WHERE cr.user_id = $1 
        AND cr.device_id = $2 
        AND cr.status = 'pending_manual_resolution'
      ORDER BY sq.priority DESC, cr.created_at ASC
    `,
      [userId, deviceId],
    );

    // Calculate sync health score (0-100)
    const metrics = performanceMetrics?.[0];
    const totalSessions = metrics?.total_sync_sessions || 1;
    const successRate =
      1 - (metrics?.total_failures || 0) / Math.max(totalSessions, 1);
    const conflictRate =
      (metrics?.total_conflicts || 0) / Math.max(totalSessions, 1);
    const healthScore = Math.round(
      successRate * 80 + (1 - Math.min(conflictRate, 1)) * 20,
    );

    const response = {
      success: true,
      deviceId,
      status: deviceStatus || {
        isOnline: true,
        lastSyncTime: null,
        syncInProgress: false,
        connectionQuality: 'unknown',
      },
      queue: {
        totalItems: queueItems.length,
        pendingItems: queueItems.filter((item) => item.status === 'pending')
          .length,
        processingItems: queueItems.filter(
          (item) => item.status === 'processing',
        ).length,
        failedItems: queueItems.filter((item) => item.status === 'failed')
          .length,
        estimatedCompletionTime,
        estimatedCompletionMs,
        items: queueItems,
      },
      conflicts: {
        total: (pendingConflicts || []).length,
        pending: pendingConflicts || [],
        requiresManualResolution: (pendingConflicts || []).filter(
          (c) => c.conflict_type === 'manual',
        ).length,
      },
      performance: {
        healthScore,
        averageProcessingTime: metrics?.avg_processing_time || null,
        maxProcessingTime: metrics?.max_processing_time || null,
        averageItemsPerBatch: metrics?.avg_items_per_batch || null,
        totalSyncSessions: metrics?.total_sync_sessions || 0,
        totalConflicts: metrics?.total_conflicts || 0,
        totalFailures: metrics?.total_failures || 0,
        averageThroughput: metrics?.avg_throughput || null,
        successRate: Math.round(successRate * 100),
        conflictRate: Math.round(conflictRate * 100),
      },
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[Device Sync Status Error] Device ${deviceId}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to get device sync status',
        deviceId,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/offline/sync/status/[deviceId] - Update device sync status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { deviceId: string } },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { deviceId } = params;
  if (!deviceId) {
    return NextResponse.json(
      { error: 'Device ID is required' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    const StatusUpdateSchema = z.object({
      isOnline: z.boolean().optional(),
      connectionQuality: z
        .enum(['offline', 'poor', 'good', 'excellent'])
        .optional(),
      appVersion: z.string().optional(),
      lastActivity: z.string().datetime().optional(),
      deviceInfo: z
        .object({
          platform: z.string(),
          osVersion: z.string().optional(),
          appVersion: z.string().optional(),
        })
        .optional(),
    });

    const validatedData = StatusUpdateSchema.parse(body);

    // Update device status
    const { data: updatedStatus } = await supabaseMcp.callFunction(
      'update_device_sync_status',
      {
        p_user_id: userId,
        p_device_id: deviceId,
        p_is_online: validatedData.isOnline,
        p_connection_quality: validatedData.connectionQuality,
        p_app_version: validatedData.appVersion,
        p_last_activity: validatedData.lastActivity,
        p_device_info: validatedData.deviceInfo,
      },
    );

    return NextResponse.json({
      success: true,
      deviceId,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Device Status Update Error] Device ${deviceId}:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid status update data',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update device status',
        deviceId,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
