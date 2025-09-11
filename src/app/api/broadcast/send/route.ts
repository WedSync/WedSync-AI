/**
 * WS-205 Broadcast Send API Endpoint
 * Secure broadcast creation with comprehensive validation and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { BroadcastManager } from '@/lib/broadcast/broadcast-manager';
import {
  validateWeddingAccess,
  canSendWeddingBroadcast,
} from '@/lib/auth/wedding-access';
import {
  checkRateLimit,
  isWeddingDayRestricted,
} from '@/lib/rate-limiting/broadcast-limits';

const sendBroadcastSchema = z.object({
  type: z.enum([
    'maintenance.scheduled',
    'maintenance.started',
    'maintenance.completed',
    'feature.released',
    'security.alert',
    'tier.upgraded',
    'tier.downgraded',
    'payment.required',
    'trial.ending',
    'usage.limit.approaching',
    'form.locked',
    'journey.updated',
    'timeline.changed',
    'supplier.joined',
    'couple.connected',
    'wedding.cancelled',
    'wedding.emergency',
    'coordinator.handoff',
  ]),
  priority: z.enum(['critical', 'high', 'normal', 'low']).default('normal'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  action: z
    .object({
      label: z.string().max(50),
      url: z.string().url(),
    })
    .optional(),
  targeting: z
    .object({
      segments: z.array(z.string()).optional(),
      userIds: z.array(z.string().uuid()).optional(),
      roles: z.array(z.string()).optional(),
      tiers: z.array(z.string()).optional(),
      weddingIds: z.array(z.string().uuid()).optional(),
    })
    .optional(),
  weddingContext: z
    .object({
      weddingId: z.string().uuid(),
      coupleName: z.string(),
      weddingDate: z.string().datetime(),
    })
    .optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and permissions
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (!userProfile || !['admin', 'coordinator'].includes(userProfile.role)) {
      return NextResponse.json(
        {
          error:
            'Insufficient permissions - Only admins and coordinators can send broadcasts',
        },
        { status: 403 },
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const broadcastData = sendBroadcastSchema.parse(body);

    // Check wedding day restrictions (Saturday)
    if (isWeddingDayRestricted(broadcastData.type, broadcastData.priority)) {
      return NextResponse.json(
        {
          error:
            'Non-critical broadcasts are restricted on wedding days (Saturdays)',
          code: 'WEDDING_DAY_RESTRICTED',
        },
        { status: 423 },
      ); // Locked status
    }

    // Rate limiting check with dynamic limits based on type and priority
    const rateLimitCheck = await checkRateLimit(user.id, broadcastData.type, {
      maxPerHour: broadcastData.priority === 'critical' ? 5 : 10,
      maxPerDay: broadcastData.priority === 'critical' ? 20 : 50,
    });

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          resetTime: rateLimitCheck.resetTime,
          remainingHour: rateLimitCheck.remainingHour,
          remainingDay: rateLimitCheck.remainingDay,
        },
        { status: 429 },
      );
    }

    // Wedding context validation
    if (broadcastData.weddingContext) {
      const hasWeddingAccess = await validateWeddingAccess(
        user.id,
        broadcastData.weddingContext.weddingId,
      );

      if (!hasWeddingAccess) {
        return NextResponse.json(
          { error: 'Access denied to specified wedding context' },
          { status: 403 },
        );
      }

      // Check if user can send this type of broadcast to this wedding
      const canSend = await canSendWeddingBroadcast(
        user.id,
        broadcastData.weddingContext.weddingId,
        broadcastData.type,
      );

      if (!canSend) {
        return NextResponse.json(
          {
            error:
              'User role does not have permission to send this broadcast type to wedding',
          },
          { status: 403 },
        );
      }
    }

    // Additional validation for critical broadcasts
    if (broadcastData.priority === 'critical') {
      const criticalTypes = [
        'wedding.emergency',
        'coordinator.handoff',
        'security.alert',
        'wedding.cancelled',
      ];

      if (!criticalTypes.includes(broadcastData.type)) {
        return NextResponse.json(
          {
            error: 'Invalid broadcast type for critical priority',
            allowedCriticalTypes: criticalTypes,
          },
          { status: 400 },
        );
      }

      // Log critical broadcast creation for audit trail
      console.warn('CRITICAL BROADCAST CREATED:', {
        userId: user.id,
        userRole: userProfile.role,
        type: broadcastData.type,
        title: broadcastData.title,
        weddingId: broadcastData.weddingContext?.weddingId,
        timestamp: new Date().toISOString(),
        ipAddress: request.ip || 'unknown',
      });
    }

    // Security validation for scheduled broadcasts
    if (broadcastData.scheduledFor) {
      const scheduledTime = new Date(broadcastData.scheduledFor);
      const now = new Date();
      const maxScheduleAhead = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (scheduledTime.getTime() - now.getTime() > maxScheduleAhead) {
        return NextResponse.json(
          {
            error: 'Cannot schedule broadcasts more than 7 days in advance',
          },
          { status: 400 },
        );
      }

      if (scheduledTime < now) {
        return NextResponse.json(
          {
            error: 'Cannot schedule broadcasts in the past',
          },
          { status: 400 },
        );
      }
    }

    // Initialize broadcast manager
    const broadcastManager = new BroadcastManager(supabase);

    // Create broadcast record
    const { data: broadcast, error: createError } = await supabase
      .from('broadcasts')
      .insert({
        type: broadcastData.type,
        priority: broadcastData.priority,
        title: broadcastData.title,
        message: broadcastData.message,
        action_label: broadcastData.action?.label,
        action_url: broadcastData.action?.url,
        targeting: broadcastData.targeting || {},
        wedding_context: broadcastData.weddingContext || {},
        created_by: user.id,
        scheduled_for: broadcastData.scheduledFor || new Date().toISOString(),
        expires_at: broadcastData.expiresAt,
        status: 'pending',
        metadata: {
          createdBy: userProfile.role,
          ipAddress: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create broadcast:', createError);
      return NextResponse.json(
        {
          error: 'Failed to create broadcast',
          details: createError.message,
        },
        { status: 500 },
      );
    }

    // Determine target users for the broadcast
    const targetedUsers = await broadcastManager.getTargetedUsers(
      broadcastData.targeting || {},
      broadcastData.weddingContext?.weddingId,
    );

    if (targetedUsers.length === 0) {
      console.warn('Broadcast created with no target users:', broadcast.id);
    }

    // Queue broadcast for delivery (if not scheduled for future)
    const now = new Date();
    const scheduledTime = new Date(broadcast.scheduled_for);

    if (scheduledTime <= now) {
      await broadcastManager.queueBroadcast(broadcast.id, targetedUsers);

      // Update broadcast status to sent for immediate broadcasts
      await supabase
        .from('broadcasts')
        .update({ status: 'sent' })
        .eq('id', broadcast.id);
    }

    // Initialize analytics record
    await supabase.from('broadcast_analytics').insert({
      broadcast_id: broadcast.id,
      total_targeted: targetedUsers.length,
      total_delivered: 0,
      total_read: 0,
      total_acknowledged: 0,
      total_action_clicked: 0,
      calculated_at: new Date().toISOString(),
    });

    // Success response with comprehensive details
    return NextResponse.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        type: broadcast.type,
        priority: broadcast.priority,
        title: broadcast.title,
        status: scheduledTime <= now ? 'sent' : 'pending',
      },
      targeting: {
        totalUsers: targetedUsers.length,
        scheduledTime: broadcast.scheduled_for,
        isImmediate: scheduledTime <= now,
      },
      limits: {
        remainingHour: rateLimitCheck.remainingHour,
        remainingDay: rateLimitCheck.remainingDay,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error('Broadcast send error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process broadcast request',
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check broadcast status and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get('id');

    if (!broadcastId) {
      return NextResponse.json(
        { error: 'Broadcast ID required' },
        { status: 400 },
      );
    }

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get broadcast with analytics
    const { data: broadcast, error } = await supabase
      .from('broadcasts')
      .select(
        `
        *,
        analytics:broadcast_analytics(*)
      `,
      )
      .eq('id', broadcastId)
      .single();

    if (error || !broadcast) {
      return NextResponse.json(
        { error: 'Broadcast not found' },
        { status: 404 },
      );
    }

    // Check if user has permission to view this broadcast
    if (broadcast.created_by !== user.id) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (
        !userProfile ||
        !['admin', 'coordinator'].includes(userProfile.role)
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({
      broadcast: {
        id: broadcast.id,
        type: broadcast.type,
        priority: broadcast.priority,
        title: broadcast.title,
        message: broadcast.message,
        status: broadcast.status,
        created_at: broadcast.created_at,
        scheduled_for: broadcast.scheduled_for,
        expires_at: broadcast.expires_at,
        targeting: broadcast.targeting,
        wedding_context: broadcast.wedding_context,
      },
      analytics: broadcast.analytics[0] || {
        total_targeted: 0,
        total_delivered: 0,
        total_read: 0,
        total_acknowledged: 0,
        total_action_clicked: 0,
      },
    });
  } catch (error) {
    console.error('Broadcast status error:', error);
    return NextResponse.json(
      { error: 'Failed to get broadcast status' },
      { status: 500 },
    );
  }
}
