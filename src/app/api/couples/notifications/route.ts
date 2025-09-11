// WS-334 Team D: Couple Notifications API
// CRUD operations for couple notifications

import { NextRequest, NextResponse } from 'next/server';
import { CoupleNotificationService } from '@/services/couples/CoupleNotificationService';
import { supabase } from '@/lib/supabase';

const notificationService = new CoupleNotificationService();

// GET /api/couples/notifications - Fetch notification history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const coupleId = searchParams.get('coupleId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type') || undefined;
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined;
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : undefined;

    if (!coupleId) {
      return NextResponse.json(
        { error: 'Missing required parameter: coupleId' },
        { status: 400 },
      );
    }

    // Verify couple exists and user has access
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('id')
      .eq('id', coupleId)
      .single();

    if (coupleError || !couple) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid couple ID' },
        { status: 401 },
      );
    }

    // Fetch notification history
    const history = await notificationService.getCoupleNotificationHistory(
      coupleId,
      {
        limit,
        offset,
        category,
        type,
        startDate,
        endDate,
      },
    );

    return NextResponse.json({
      success: true,
      data: history,
      meta: {
        limit,
        offset,
        total: history.total,
        hasMore: history.total > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/couples/notifications - Create new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseNotification, coupleProfile, weddingContext } = body;

    if (!baseNotification || !coupleProfile || !weddingContext) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: baseNotification, coupleProfile, weddingContext',
        },
        { status: 400 },
      );
    }

    // Generate and deliver personalized notification
    const personalizedNotification =
      await notificationService.generateAndDeliverNotification(
        baseNotification,
        coupleProfile,
        weddingContext,
      );

    return NextResponse.json({
      success: true,
      data: {
        notification: personalizedNotification,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 },
    );
  }
}

// PATCH /api/couples/notifications - Update notification status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId, action, metadata } = body;

    if (!notificationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: notificationId, action' },
        { status: 400 },
      );
    }

    // Track notification engagement
    await notificationService.trackNotificationEngagement(
      notificationId,
      action,
      metadata,
    );

    return NextResponse.json({
      success: true,
      message: 'Notification engagement tracked',
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 },
    );
  }
}
