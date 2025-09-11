/**
 * Real-time Sync Updates API using Server-Sent Events
 * Provides live synchronization updates for cross-device business intelligence
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

interface SyncEvent {
  type:
    | 'metrics-updated'
    | 'device-status'
    | 'sync-conflict'
    | 'alert-received'
    | 'heartbeat';
  data: any;
  timestamp: string;
  deviceId?: string;
  userId?: string;
}

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const syncTypes = searchParams.get('types')?.split(',') || ['all'];

    if (!deviceId) {
      return new Response('Device ID required', { status: 400 });
    }

    const userId = session.user.id;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        sendEvent(controller, {
          type: 'heartbeat',
          data: {
            status: 'connected',
            deviceId,
            subscriptions: syncTypes,
          },
          timestamp: new Date().toISOString(),
        });

        // Set up Supabase realtime subscriptions
        const subscriptions = setupRealtimeSubscriptions(
          supabase,
          userId,
          deviceId,
          syncTypes,
          controller,
        );

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          sendEvent(controller, {
            type: 'heartbeat',
            data: { status: 'alive', deviceId },
            timestamp: new Date().toISOString(),
          });
        }, 30000); // 30 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          subscriptions.forEach((sub) => sub.unsubscribe());
          controller.close();
        });
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Realtime sync error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

function setupRealtimeSubscriptions(
  supabase: any,
  userId: string,
  deviceId: string,
  syncTypes: string[],
  controller: ReadableStreamDefaultController,
) {
  const subscriptions: any[] = [];

  // Subscribe to business metrics updates
  if (syncTypes.includes('all') || syncTypes.includes('metrics')) {
    const metricsSubscription = supabase
      .channel('business-metrics-sync')
      .on('broadcast', { event: 'metrics-updated' }, (payload: any) => {
        // Don't send updates back to the device that initiated the change
        if (
          payload.payload.excludeDevice !== deviceId &&
          payload.payload.userId === userId
        ) {
          sendEvent(controller, {
            type: 'metrics-updated',
            data: {
              version: payload.payload.version,
              timestamp: payload.payload.timestamp,
              sourceDevice: payload.payload.deviceId,
            },
            timestamp: new Date().toISOString(),
            deviceId: payload.payload.deviceId,
          });
        }
      })
      .subscribe();

    subscriptions.push(metricsSubscription);
  }

  // Subscribe to device status changes
  if (syncTypes.includes('all') || syncTypes.includes('devices')) {
    const deviceSubscription = supabase
      .channel('device-sync')
      .on('broadcast', { event: 'device-registered' }, (payload: any) => {
        if (
          payload.payload.userId === userId &&
          payload.payload.deviceId !== deviceId
        ) {
          sendEvent(controller, {
            type: 'device-status',
            data: {
              action: 'registered',
              deviceId: payload.payload.deviceId,
              deviceName: payload.payload.deviceName,
              deviceType: payload.payload.deviceType,
            },
            timestamp: payload.payload.timestamp,
          });
        }
      })
      .subscribe();

    subscriptions.push(deviceSubscription);
  }

  // Subscribe to sync status updates
  if (syncTypes.includes('all') || syncTypes.includes('status')) {
    const statusSubscription = supabase
      .channel('sync-status')
      .on('broadcast', { event: 'status-updated' }, (payload: any) => {
        if (
          payload.payload.userId === userId &&
          payload.payload.deviceId !== deviceId
        ) {
          sendEvent(controller, {
            type: 'device-status',
            data: {
              action: 'status-updated',
              deviceId: payload.payload.deviceId,
              syncType: payload.payload.syncType,
              status: payload.payload.status,
            },
            timestamp: payload.payload.timestamp,
          });
        }
      })
      .subscribe();

    subscriptions.push(statusSubscription);
  }

  // Subscribe to sync conflicts
  if (syncTypes.includes('all') || syncTypes.includes('conflicts')) {
    const conflictSubscription = supabase
      .channel('sync-conflicts')
      .on('broadcast', { event: 'conflict-detected' }, (payload: any) => {
        if (payload.payload.userId === userId) {
          sendEvent(controller, {
            type: 'sync-conflict',
            data: {
              conflictType: payload.payload.conflictType,
              deviceId: payload.payload.deviceId,
              serverVersion: payload.payload.serverVersion,
              clientVersion: payload.payload.clientVersion,
              resolution: payload.payload.resolution,
            },
            timestamp: payload.payload.timestamp,
          });
        }
      })
      .subscribe();

    subscriptions.push(conflictSubscription);
  }

  // Subscribe to executive alerts
  if (syncTypes.includes('all') || syncTypes.includes('alerts')) {
    const alertsSubscription = supabase
      .channel('executive-alerts')
      .on('broadcast', { event: 'alert-received' }, (payload: any) => {
        if (payload.payload.userId === userId) {
          sendEvent(controller, {
            type: 'alert-received',
            data: {
              alertId: payload.payload.alertId,
              priority: payload.payload.priority,
              title: payload.payload.title,
              message: payload.payload.message,
              sourceDevice: payload.payload.sourceDevice,
            },
            timestamp: payload.payload.timestamp,
          });
        }
      })
      .subscribe();

    subscriptions.push(alertsSubscription);
  }

  // Subscribe to database changes for real-time sync
  const dbChangesSubscription = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'business_metrics_sync',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        sendEvent(controller, {
          type: 'metrics-updated',
          data: {
            version: payload.new.version,
            timestamp: payload.new.updated_at,
            sourceDevice: payload.new.device_id,
          },
          timestamp: new Date().toISOString(),
        });
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'device_sync_status',
        filter: `user_id=eq.${userId}`,
      },
      (payload: any) => {
        if (payload.new.device_id !== deviceId) {
          sendEvent(controller, {
            type: 'device-status',
            data: {
              action: 'sync-status-updated',
              deviceId: payload.new.device_id,
              status: payload.new.sync_status,
              lastSync: payload.new.last_sync,
              pendingOperations: payload.new.pending_operations,
            },
            timestamp: new Date().toISOString(),
          });
        }
      },
    )
    .subscribe();

  subscriptions.push(dbChangesSubscription);

  return subscriptions;
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  event: SyncEvent,
): void {
  try {
    const eventData = {
      id: generateEventId(),
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
      deviceId: event.deviceId,
      userId: event.userId,
    };

    const sseData = `data: ${JSON.stringify(eventData)}\n\n`;
    const encoder = new TextEncoder();
    controller.enqueue(encoder.encode(sseData));
  } catch (error) {
    console.error('Error sending SSE event:', error);
  }
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, data, targetDevices, broadcast = false } = body;

    if (!type || !data) {
      return NextResponse.json(
        {
          error: 'Missing required fields: type, data',
        },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const timestamp = new Date().toISOString();

    // Prepare broadcast payload
    const broadcastPayload = {
      userId,
      timestamp,
      type,
      data,
      targetDevices,
      broadcast,
    };

    // Send broadcast based on type
    let channelName = 'general-sync';
    let eventName = 'sync-event';

    switch (type) {
      case 'metrics-updated':
        channelName = 'business-metrics-sync';
        eventName = 'metrics-updated';
        break;
      case 'device-status':
        channelName = 'device-sync';
        eventName = 'device-status';
        break;
      case 'sync-conflict':
        channelName = 'sync-conflicts';
        eventName = 'conflict-detected';
        break;
      case 'alert-received':
        channelName = 'executive-alerts';
        eventName = 'alert-received';
        break;
    }

    // Broadcast the event
    const { error: broadcastError } = await supabase.channel(channelName).send({
      type: 'broadcast',
      event: eventName,
      payload: broadcastPayload,
    });

    if (broadcastError) {
      console.error('Error broadcasting event:', broadcastError);
      return NextResponse.json(
        {
          error: 'Failed to broadcast event',
        },
        { status: 500 },
      );
    }

    // Log the broadcast event
    const { error: logError } = await supabase.from('sync_event_log').insert({
      user_id: userId,
      event_type: type,
      event_data: data,
      channel_name: channelName,
      broadcast_timestamp: timestamp,
      target_devices: targetDevices,
    });

    if (logError) {
      console.error('Error logging broadcast event:', logError);
    }

    return NextResponse.json({
      success: true,
      eventId: generateEventId(),
      timestamp,
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
