// WS-229 Admin Quick Actions - Notification Send API
// Multi-channel notification sending endpoint

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminNotificationService } from '@/lib/services/admin-notification-service';
import { Logger } from '@/lib/logging/Logger';
import { z } from 'zod';

const logger = new Logger('AdminNotificationSendAPI');

// Request validation schema
const sendNotificationSchema = z.object({
  adminUserId: z.string().uuid('Invalid admin user ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message too long'),
  priority: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  type: z.enum([
    'action_completed',
    'system_alert',
    'wedding_emergency',
    'integration_failure',
  ]),
  data: z.record(z.any()).optional(),
  weddingId: z.string().uuid().optional(),
  actionStatusId: z.string().uuid().optional(),
  channels: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      push: z.boolean().optional(),
      inApp: z.boolean().optional(),
    })
    .optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

type SendNotificationRequest = z.infer<typeof sendNotificationSchema>;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendNotificationSchema.parse(body);

    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 },
      );
    }

    // Verify target admin user exists
    const { data: targetAdmin } = await supabase
      .from('user_profiles')
      .select('user_id, role, email, phone')
      .eq('user_id', validatedData.adminUserId)
      .single();

    if (!targetAdmin) {
      return NextResponse.json(
        { error: 'Target admin user not found', code: 'ADMIN_NOT_FOUND' },
        { status: 404 },
      );
    }

    if (!['admin', 'super_admin'].includes(targetAdmin.role || '')) {
      return NextResponse.json(
        { error: 'Target user is not an admin', code: 'NOT_ADMIN' },
        { status: 400 },
      );
    }

    // If wedding ID is provided, verify wedding exists
    if (validatedData.weddingId) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('id')
        .eq('id', validatedData.weddingId)
        .single();

      if (!wedding) {
        return NextResponse.json(
          { error: 'Wedding not found', code: 'WEDDING_NOT_FOUND' },
          { status: 404 },
        );
      }
    }

    // If action status ID is provided, verify it exists
    if (validatedData.actionStatusId) {
      const { data: actionStatus } = await supabase
        .from('action_status_updates')
        .select('id')
        .eq('id', validatedData.actionStatusId)
        .single();

      if (!actionStatus) {
        return NextResponse.json(
          { error: 'Action status not found', code: 'ACTION_STATUS_NOT_FOUND' },
          { status: 404 },
        );
      }
    }

    // Prepare notification data
    const notificationData = {
      adminUserId: validatedData.adminUserId,
      title: validatedData.title,
      message: validatedData.message,
      priority: validatedData.priority,
      type: validatedData.type,
      data: validatedData.data,
      weddingId: validatedData.weddingId,
      actionStatusId: validatedData.actionStatusId,
      channels: validatedData.channels,
      scheduledFor: validatedData.scheduledFor
        ? new Date(validatedData.scheduledFor)
        : undefined,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : undefined,
    };

    // Send notification
    const notificationId =
      await adminNotificationService.sendNotification(notificationData);

    const duration = Date.now() - startTime;

    logger.info('Admin notification sent successfully', {
      notificationId,
      sentBy: user.id,
      targetAdmin: validatedData.adminUserId,
      type: validatedData.type,
      priority: validatedData.priority,
      duration,
    });

    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notification sent successfully',
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    logger.error('Failed to send admin notification', error, {
      duration,
      requestBody: await request.json().catch(() => ({})),
    });

    return NextResponse.json(
      {
        error: 'Failed to send notification',
        code: 'SEND_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const targetAdminId = url.searchParams.get('adminUserId') || user.id;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status') || undefined;
    const priority = url.searchParams.get('priority') || undefined;
    const type = url.searchParams.get('type') || undefined;

    // Get notification history
    const notifications = await adminNotificationService.getNotificationHistory(
      targetAdminId,
      { limit, offset, status, priority, type },
    );

    return NextResponse.json({
      success: true,
      notifications,
      pagination: {
        limit,
        offset,
        count: notifications.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get notification history', error);

    return NextResponse.json(
      {
        error: 'Failed to get notifications',
        code: 'GET_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Bulk send notifications to multiple admins
export async function PUT(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { adminUserIds, ...notificationData } = body;

    if (!Array.isArray(adminUserIds) || adminUserIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Admin user IDs array is required',
          code: 'INVALID_ADMIN_IDS',
        },
        { status: 400 },
      );
    }

    // Get authenticated user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 },
      );
    }

    // Check if user has admin privileges
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile?.role || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' },
        { status: 403 },
      );
    }

    // Send notifications to all admins
    const results = [];
    const errors = [];

    for (const adminUserId of adminUserIds) {
      try {
        const validatedData = sendNotificationSchema.parse({
          ...notificationData,
          adminUserId,
        });

        const notificationId =
          await adminNotificationService.sendNotification(validatedData);
        results.push({ adminUserId, notificationId, success: true });
      } catch (error) {
        errors.push({
          adminUserId,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Bulk admin notifications sent', {
      sentBy: user.id,
      targetCount: adminUserIds.length,
      successCount: results.length,
      errorCount: errors.length,
      duration,
    });

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: adminUserIds.length,
        successful: results.length,
        failed: errors.length,
      },
      duration,
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Failed to send bulk admin notifications', error, {
      duration,
    });

    return NextResponse.json(
      {
        error: 'Failed to send bulk notifications',
        code: 'BULK_SEND_FAILED',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
