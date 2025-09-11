/**
 * Cross-Device Business Metrics Sync API
 * Synchronizes business intelligence metrics between executive devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface SyncMetricsRequest {
  deviceId: string;
  metrics: {
    revenue: any;
    clients: any;
    performance: any;
    alerts: any[];
  };
  timestamp: string;
  lastSync?: string;
  version: number;
}

interface SyncResponse {
  success: boolean;
  data?: any;
  conflict?: boolean;
  serverVersion?: number;
  serverTimestamp?: string;
  error?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<SyncResponse>> {
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

    const body: SyncMetricsRequest = await request.json();
    const { deviceId, metrics, timestamp, lastSync, version } = body;

    // Validate request
    if (!deviceId || !metrics || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: deviceId, metrics, timestamp',
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;

    // Get current server data for conflict detection
    const { data: serverData, error: fetchError } = await supabase
      .from('business_metrics_sync')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching server data:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
        },
        { status: 500 },
      );
    }

    const clientTimestamp = new Date(timestamp);
    const now = new Date();

    // Check for conflicts if server data exists
    if (serverData) {
      const serverTimestamp = new Date(serverData.updated_at);

      // If server data is newer and client has outdated version, return conflict
      if (serverTimestamp > clientTimestamp && serverData.version > version) {
        return NextResponse.json({
          success: false,
          conflict: true,
          serverVersion: serverData.version,
          serverTimestamp: serverData.updated_at,
          data: {
            metrics: serverData.metrics,
            version: serverData.version,
            timestamp: serverData.updated_at,
          },
        });
      }
    }

    // Prepare sync data
    const syncData = {
      user_id: userId,
      device_id: deviceId,
      metrics: metrics,
      version: (serverData?.version || 0) + 1,
      last_sync: lastSync || null,
      updated_at: now.toISOString(),
    };

    // Upsert metrics data
    const { data: upsertData, error: upsertError } = await supabase
      .from('business_metrics_sync')
      .upsert(syncData, { onConflict: 'user_id' })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting metrics:', upsertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to sync metrics',
        },
        { status: 500 },
      );
    }

    // Update device sync status
    const { error: deviceError } = await supabase.from('sync_devices').upsert(
      {
        user_id: userId,
        device_id: deviceId,
        last_sync: now.toISOString(),
        sync_type: 'business-metrics',
        status: 'synced',
      },
      { onConflict: 'user_id,device_id' },
    );

    if (deviceError) {
      console.error('Error updating device status:', deviceError);
    }

    // Broadcast update to other devices via realtime
    const { error: broadcastError } = await supabase
      .channel('business-metrics-sync')
      .send({
        type: 'broadcast',
        event: 'metrics-updated',
        payload: {
          userId,
          deviceId,
          version: upsertData.version,
          timestamp: upsertData.updated_at,
          excludeDevice: deviceId,
        },
      });

    if (broadcastError) {
      console.error('Error broadcasting update:', broadcastError);
    }

    return NextResponse.json({
      success: true,
      data: {
        version: upsertData.version,
        timestamp: upsertData.updated_at,
        synced: true,
      },
    });
  } catch (error) {
    console.error('Business metrics sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SyncResponse>> {
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
    const lastSync = searchParams.get('lastSync');

    const userId = session.user.id;

    // Get latest metrics for user
    const { data: metricsData, error: fetchError } = await supabase
      .from('business_metrics_sync')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching metrics:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
        },
        { status: 500 },
      );
    }

    if (!metricsData) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Check if client data is outdated
    const serverTimestamp = new Date(metricsData.updated_at);
    const clientTimestamp = lastSync ? new Date(lastSync) : new Date(0);

    const needsUpdate = serverTimestamp > clientTimestamp;

    return NextResponse.json({
      success: true,
      data: {
        metrics: metricsData.metrics,
        version: metricsData.version,
        timestamp: metricsData.updated_at,
        needsUpdate,
        lastSync: metricsData.last_sync,
      },
    });
  } catch (error) {
    console.error('Error getting business metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
