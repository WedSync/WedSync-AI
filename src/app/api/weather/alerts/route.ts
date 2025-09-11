/**
 * Weather Alerts API Routes
 * Handles weather alert notifications and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WeatherNotification } from '@/types/weather';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const weddingId = searchParams.get('weddingId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!weddingId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wedding ID is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    let query = supabase
      .from('weather_notifications')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('timestamp', { ascending: false });

    if (unreadOnly) {
      query = query.eq('acknowledged', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: notifications,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Weather alerts API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weather alerts',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'acknowledge':
        const { notificationId, userId } = params;

        if (!notificationId || !userId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Notification ID and user ID are required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          );
        }

        const { error: ackError } = await supabase
          .from('weather_notifications')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: userId,
          })
          .eq('id', notificationId);

        if (ackError) {
          throw ackError;
        }

        return NextResponse.json({
          success: true,
          message: 'Notification acknowledged',
          timestamp: new Date().toISOString(),
        });

      case 'create':
        const notification: Omit<WeatherNotification, 'id'> = {
          weddingId: params.weddingId,
          type: params.type,
          severity: params.severity,
          title: params.title,
          message: params.message,
          weatherData: params.weatherData || {},
          timestamp: new Date().toISOString(),
          recipient: params.recipient,
          channel: params.channel,
          acknowledged: false,
        };

        const { data: newNotification, error: createError } = await supabase
          .from('weather_notifications')
          .insert(notification)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return NextResponse.json({
          success: true,
          data: newNotification,
          timestamp: new Date().toISOString(),
        });

      case 'markAllRead':
        const { weddingId } = params;

        if (!weddingId) {
          return NextResponse.json(
            {
              success: false,
              error: 'Wedding ID is required',
              timestamp: new Date().toISOString(),
            },
            { status: 400 },
          );
        }

        const { error: markAllError } = await supabase
          .from('weather_notifications')
          .update({
            acknowledged: true,
            acknowledged_at: new Date().toISOString(),
          })
          .eq('wedding_id', weddingId)
          .eq('acknowledged', false);

        if (markAllError) {
          throw markAllError;
        }

        return NextResponse.json({
          success: true,
          message: 'All notifications marked as read',
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid action',
            timestamp: new Date().toISOString(),
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('Weather alerts POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
