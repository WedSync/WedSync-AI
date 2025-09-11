/**
 * Sync Status API for Cross-Device Synchronization
 * Provides real-time sync status and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface SyncStatus {
  deviceId: string;
  lastSync: string | null;
  syncPending: boolean;
  status: 'synced' | 'pending' | 'error' | 'offline';
  lastMetricsSync: string | null;
  lastAlertsSync: string | null;
  pendingOperations: number;
  conflictsCount: number;
  errorMessage?: string;
}

interface SyncStatusResponse {
  success: boolean;
  status?: SyncStatus;
  allDevices?: SyncStatus[];
  summary?: {
    totalDevices: number;
    syncedDevices: number;
    pendingDevices: number;
    errorDevices: number;
    lastGlobalSync: string | null;
  };
  error?: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SyncStatusResponse>> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const includeAll = searchParams.get('includeAll') === 'true';

    const userId = session.user.id;

    if (deviceId && !includeAll) {
      // Get status for specific device
      const status = await getDeviceSyncStatus(supabase, userId, deviceId);

      if (!status) {
        return NextResponse.json(
          {
            success: false,
            error: 'Device not found',
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        status,
      });
    } else {
      // Get status for all devices
      const allDevices = await getAllDevicesSyncStatus(supabase, userId);
      const summary = generateSyncSummary(allDevices);

      return NextResponse.json({
        success: true,
        allDevices,
        summary,
      });
    }
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { deviceId, syncType, status, errorMessage, pendingOperations } =
      body;

    if (!deviceId || !syncType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deviceId, syncType',
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const now = new Date().toISOString();

    // Update device sync status
    const updates: any = {
      updated_at: now,
    };

    if (status) {
      updates.sync_status = status;
    }

    if (errorMessage) {
      updates.last_error = errorMessage;
      updates.error_count = supabase.sql`COALESCE(error_count, 0) + 1`;
    } else if (status === 'synced') {
      updates.last_error = null;
      updates.error_count = 0;
    }

    if (typeof pendingOperations === 'number') {
      updates.pending_operations = pendingOperations;
    }

    // Update specific sync type timestamp
    if (syncType === 'business-metrics') {
      updates.last_metrics_sync = now;
    } else if (syncType === 'alerts') {
      updates.last_alerts_sync = now;
    }

    if (status === 'synced') {
      updates.last_sync = now;
      updates.sync_pending = false;
    } else if (status === 'pending') {
      updates.sync_pending = true;
    }

    const { error: updateError } = await supabase
      .from('device_sync_status')
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          ...updates,
        },
        { onConflict: 'user_id,device_id' },
      );

    if (updateError) {
      console.error('Error updating sync status:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update sync status',
        },
        { status: 500 },
      );
    }

    // Update device last seen
    const { error: deviceUpdateError } = await supabase
      .from('sync_devices')
      .update({ last_seen: now })
      .eq('user_id', userId)
      .eq('device_id', deviceId);

    if (deviceUpdateError) {
      console.error('Error updating device last seen:', deviceUpdateError);
    }

    // Broadcast status update to other devices
    const { error: broadcastError } = await supabase
      .channel('sync-status')
      .send({
        type: 'broadcast',
        event: 'status-updated',
        payload: {
          userId,
          deviceId,
          syncType,
          status,
          timestamp: now,
        },
      });

    if (broadcastError) {
      console.error('Error broadcasting status update:', broadcastError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
async function getDeviceSyncStatus(
  supabase: any,
  userId: string,
  deviceId: string,
): Promise<SyncStatus | null> {
  const { data: statusData, error } = await supabase
    .from('device_sync_status')
    .select(
      `
      *,
      sync_devices!inner(device_id, device_name, sync_enabled, last_seen)
    `,
    )
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .single();

  if (error || !statusData) {
    return null;
  }

  // Calculate status based on various factors
  const now = new Date();
  const lastSeen = statusData.sync_devices.last_seen
    ? new Date(statusData.sync_devices.last_seen)
    : null;
  const timeSinceLastSeen = lastSeen
    ? now.getTime() - lastSeen.getTime()
    : Infinity;

  let calculatedStatus: SyncStatus['status'] = 'synced';

  if (!statusData.sync_devices.sync_enabled) {
    calculatedStatus = 'offline';
  } else if (statusData.last_error) {
    calculatedStatus = 'error';
  } else if (statusData.sync_pending || statusData.pending_operations > 0) {
    calculatedStatus = 'pending';
  } else if (timeSinceLastSeen > 5 * 60 * 1000) {
    // 5 minutes
    calculatedStatus = 'offline';
  }

  return {
    deviceId: statusData.device_id,
    lastSync: statusData.last_sync,
    syncPending: statusData.sync_pending || false,
    status: calculatedStatus,
    lastMetricsSync: statusData.last_metrics_sync,
    lastAlertsSync: statusData.last_alerts_sync,
    pendingOperations: statusData.pending_operations || 0,
    conflictsCount: statusData.conflicts_count || 0,
    errorMessage: statusData.last_error,
  };
}

async function getAllDevicesSyncStatus(
  supabase: any,
  userId: string,
): Promise<SyncStatus[]> {
  const { data: devicesData, error } = await supabase
    .from('sync_devices')
    .select(
      `
      device_id,
      device_name,
      sync_enabled,
      last_seen,
      device_sync_status(*)
    `,
    )
    .eq('user_id', userId)
    .order('last_seen', { ascending: false });

  if (error || !devicesData) {
    return [];
  }

  const now = new Date();

  return devicesData.map((device: any) => {
    const statusData = device.device_sync_status[0] || {};
    const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
    const timeSinceLastSeen = lastSeen
      ? now.getTime() - lastSeen.getTime()
      : Infinity;

    let calculatedStatus: SyncStatus['status'] = 'synced';

    if (!device.sync_enabled) {
      calculatedStatus = 'offline';
    } else if (statusData.last_error) {
      calculatedStatus = 'error';
    } else if (statusData.sync_pending || statusData.pending_operations > 0) {
      calculatedStatus = 'pending';
    } else if (timeSinceLastSeen > 5 * 60 * 1000) {
      // 5 minutes
      calculatedStatus = 'offline';
    }

    return {
      deviceId: device.device_id,
      lastSync: statusData.last_sync,
      syncPending: statusData.sync_pending || false,
      status: calculatedStatus,
      lastMetricsSync: statusData.last_metrics_sync,
      lastAlertsSync: statusData.last_alerts_sync,
      pendingOperations: statusData.pending_operations || 0,
      conflictsCount: statusData.conflicts_count || 0,
      errorMessage: statusData.last_error,
    };
  });
}

function generateSyncSummary(
  devices: SyncStatus[],
): SyncStatusResponse['summary'] {
  const totalDevices = devices.length;
  const syncedDevices = devices.filter((d) => d.status === 'synced').length;
  const pendingDevices = devices.filter((d) => d.status === 'pending').length;
  const errorDevices = devices.filter((d) => d.status === 'error').length;

  // Find latest sync across all devices
  const lastGlobalSync =
    devices
      .map((d) => d.lastSync)
      .filter((sync) => sync !== null)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ||
    null;

  return {
    totalDevices,
    syncedDevices,
    pendingDevices,
    errorDevices,
    lastGlobalSync,
  };
}
