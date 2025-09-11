// WS-334 Team D: Real-time Notification Stream API
// Server-Sent Events endpoint for couples to receive notifications in real-time

import { NextRequest, NextResponse } from 'next/server';
import { CoupleNotificationService } from '@/services/couples/CoupleNotificationService';
import { supabase } from '@/lib/supabase';

const notificationService = new CoupleNotificationService();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coupleId = searchParams.get('coupleId');
  const weddingId = searchParams.get('weddingId');

  if (!coupleId || !weddingId) {
    return new NextResponse(
      'Missing required parameters: coupleId and weddingId',
      {
        status: 400,
      },
    );
  }

  try {
    // Verify couple exists and has access
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id, wedding_id')
      .eq('id', coupleId)
      .eq('wedding_id', weddingId)
      .single();

    if (coupleError || !couple) {
      return new NextResponse('Unauthorized: Invalid couple or wedding ID', {
        status: 401,
      });
    }

    // Create Server-Sent Events response
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Add connection to notification service
        notificationService.addNotificationStream(coupleId, connectionId);

        // Send initial connection message
        const encoder = new TextEncoder();
        const initialMessage = {
          type: 'connection',
          message: 'Connected to notification stream',
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`),
        );

        // Send heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = {
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(heartbeat)}\n\n`),
            );
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            clearInterval(heartbeatInterval);
            notificationService.removeNotificationStream(
              coupleId,
              connectionId,
            );
            controller.close();
          }
        }, 30000);

        // Listen for new notifications
        const notificationListener = async (notification: any) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(notification)}\n\n`),
            );
          } catch (error) {
            console.error('Error sending notification:', error);
          }
        };

        // Store cleanup function
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          notificationService.removeNotificationStream(coupleId, connectionId);
        };

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          cleanup();
          controller.close();
        });

        // Store connection reference for cleanup
        (controller as any).cleanup = cleanup;
        (controller as any).connectionId = connectionId;
      },

      cancel() {
        // Cleanup when stream is cancelled
        const connectionId = (this as any).connectionId;
        if (connectionId) {
          notificationService.removeNotificationStream(coupleId, connectionId);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('Error setting up notification stream:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
