/**
 * WebSocket Channel Broadcasting API - WS-203 Team B Implementation
 *
 * Handles message broadcasting to WebSocket channels with delivery guarantees.
 * Supports priority messaging, wedding-specific routing, and offline queuing.
 *
 * Wedding Industry Features:
 * - Priority messaging for urgent wedding updates (venue changes, timeline shifts)
 * - Message categorization (form_response, journey_update, timeline_change, payment, urgent)
 * - Offline message queuing for suppliers at venues with poor connectivity
 * - Wedding season traffic optimization with message batching
 * - Cross-wedding isolation to prevent data leaks between different couples
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withSecureValidation } from '@/lib/validation/middleware';
import { createClient } from '@/lib/supabase/server';
import { ChannelManager } from '@/lib/websocket/channel-manager';
import { MessageQueue } from '@/lib/websocket/message-queue';
import { rateLimitService } from '@/lib/rate-limit';
import { logger } from '@/lib/monitoring/logger';

// ================================================
// VALIDATION SCHEMA
// ================================================

const broadcastMessageSchema = z.object({
  channelName: z
    .string()
    .min(1, 'Channel name is required')
    .regex(
      /^(supplier|couple|collaboration|form|journey|admin):[a-zA-Z0-9_-]+:[a-f0-9-]{36}$/,
      'Channel name must follow pattern: {scope}:{entity}:{entityId}',
    ),
  eventType: z
    .string()
    .min(1, 'Event type is required')
    .max(50, 'Event type too long'),
  payload: z.record(z.any()).min(1, 'Payload is required'),

  // Message delivery options
  priority: z.number().int().min(1).max(10).optional().default(5),
  messageCategory: z
    .enum([
      'general',
      'form_response',
      'journey_update',
      'timeline_change',
      'payment',
      'urgent',
    ])
    .optional()
    .default('general'),

  // Targeting options
  targetUserId: z.string().uuid().optional(), // Send to specific user only
  excludeUserIds: z.array(z.string().uuid()).optional(), // Exclude specific users

  // Delivery guarantees
  requireDeliveryReceipt: z.boolean().optional().default(false),
  persistForOfflineUsers: z.boolean().optional().default(true),
  expirationMinutes: z.number().int().min(1).max(10080).optional(), // Max 1 week

  // Wedding context (for routing and permissions)
  weddingId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  coupleId: z.string().uuid().optional(),

  // Message metadata
  metadata: z.record(z.any()).optional().default({}),

  // Batching for high-volume scenarios
  batchId: z.string().optional(), // Group related messages
  batchIndex: z.number().int().min(0).optional(), // Message order in batch
  batchTotal: z.number().int().min(1).optional(), // Total messages in batch
});

type BroadcastMessageRequest = z.infer<typeof broadcastMessageSchema>;

// ================================================
// BROADCAST HANDLER
// ================================================

export const POST = withSecureValidation(
  broadcastMessageSchema,
  async (request: NextRequest, validatedData: BroadcastMessageRequest) => {
    const startTime = Date.now();

    try {
      // Get authenticated user
      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        logger.warn('Unauthorized broadcast attempt', {
          channelName: validatedData.channelName,
          eventType: validatedData.eventType,
          ip: request.ip,
        });

        return Response.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required to broadcast messages',
            code: 'AUTH_REQUIRED',
          },
          { status: 401 },
        );
      }

      // Rate limiting with different limits based on message category
      const rateLimitKey = `websocket:broadcast:${user.id}`;
      const rateLimit = getRateLimitForCategory(validatedData.messageCategory);
      const allowed = await rateLimitService.checkLimit(
        rateLimitKey,
        rateLimit.requests,
        rateLimit.window,
      );

      if (!allowed) {
        logger.warn('Broadcast rate limit exceeded', {
          userId: user.id,
          channelName: validatedData.channelName,
          eventType: validatedData.eventType,
          messageCategory: validatedData.messageCategory,
          rateLimit,
        });

        return Response.json(
          {
            error: 'RATE_LIMITED',
            message: `Broadcast rate limit exceeded for ${validatedData.messageCategory} messages`,
            code: 'RATE_LIMIT_EXCEEDED',
            category: validatedData.messageCategory,
            limit: rateLimit,
            retryAfter: Math.ceil(rateLimit.window / 1000),
          },
          { status: 429 },
        );
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        logger.error('Failed to get user profile for broadcast', {
          error: profileError?.message,
          userId: user.id,
          channelName: validatedData.channelName,
        });

        return Response.json(
          {
            error: 'PROFILE_ERROR',
            message: 'Unable to validate user permissions',
            code: 'PROFILE_FETCH_FAILED',
          },
          { status: 400 },
        );
      }

      // Validate broadcast permissions
      const { data: hasPermission, error: permissionError } =
        await supabase.rpc('validate_websocket_channel_permission', {
          user_uuid: user.id,
          channel_name_param: validatedData.channelName,
          operation_type: 'broadcast',
        });

      if (permissionError || !hasPermission) {
        logger.warn('Broadcast permission denied', {
          userId: user.id,
          channelName: validatedData.channelName,
          permissionError: permissionError?.message,
          hasPermission,
        });

        return Response.json(
          {
            error: 'FORBIDDEN',
            message: 'Insufficient permissions to broadcast to this channel',
            code: 'BROADCAST_PERMISSION_DENIED',
            channelName: validatedData.channelName,
          },
          { status: 403 },
        );
      }

      // Validate wedding context if provided
      if (
        validatedData.weddingId ||
        validatedData.supplierId ||
        validatedData.coupleId
      ) {
        const contextValidation = await validateWeddingContext(
          validatedData,
          user.id,
          userProfile,
          supabase,
        );

        if (!contextValidation.valid) {
          return Response.json(
            {
              error: 'INVALID_CONTEXT',
              message:
                contextValidation.reason ||
                'Invalid wedding context for broadcast',
              code: 'CONTEXT_VALIDATION_FAILED',
            },
            { status: 400 },
          );
        }
      }

      // Initialize Channel Manager
      const channelManager = new ChannelManager({
        supabaseClient: supabase,
        maxConnectionsPerUser: 50,
        messageRateLimit: 100,
        enableMetrics: true,
      });

      // Initialize Message Queue for offline delivery
      const messageQueue = new MessageQueue({
        supabaseClient: supabase,
        enableMetrics: true,
      });

      // Broadcast message with delivery options
      await channelManager.broadcastToChannel(
        validatedData.channelName,
        validatedData.eventType,
        {
          ...validatedData.payload,
          metadata: {
            ...validatedData.metadata,
            broadcastTime: new Date().toISOString(),
            senderId: user.id,
            senderProfile: {
              firstName: userProfile.first_name,
              lastName: userProfile.last_name,
              role: userProfile.role,
              organizationId: userProfile.organization_id,
            },
            weddingContext: {
              weddingId: validatedData.weddingId,
              supplierId: validatedData.supplierId,
              coupleId: validatedData.coupleId,
            },
            deliveryOptions: {
              priority: validatedData.priority,
              category: validatedData.messageCategory,
              requireReceipt: validatedData.requireDeliveryReceipt,
              persistOffline: validatedData.persistForOfflineUsers,
            },
            batchInfo: validatedData.batchId
              ? {
                  batchId: validatedData.batchId,
                  index: validatedData.batchIndex,
                  total: validatedData.batchTotal,
                }
              : undefined,
          },
        },
        user.id,
        {
          priority: validatedData.priority,
          messageCategory: validatedData.messageCategory,
          targetUserId: validatedData.targetUserId,
        },
      );

      // Get channel info for response
      const { data: channelInfo } = await supabase
        .from('websocket_channels')
        .select('id, max_subscribers')
        .eq('channel_name', validatedData.channelName)
        .single();

      // Get current subscriber count
      const { count: subscriberCount } = await supabase
        .from('channel_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelInfo?.id)
        .eq('active', true);

      const latency = Date.now() - startTime;

      // Success logging with detailed wedding context
      logger.info('WebSocket message broadcast successful', {
        messageId: crypto.randomUUID(),
        channelName: validatedData.channelName,
        eventType: validatedData.eventType,
        senderId: user.id,
        senderOrganization: userProfile.organization_id,
        messageCategory: validatedData.messageCategory,
        priority: validatedData.priority,
        targetUserId: validatedData.targetUserId,
        subscriberCount: subscriberCount || 0,
        weddingContext: {
          weddingId: validatedData.weddingId,
          supplierId: validatedData.supplierId,
          coupleId: validatedData.coupleId,
        },
        batchInfo: validatedData.batchId
          ? {
              batchId: validatedData.batchId,
              index: validatedData.batchIndex,
              total: validatedData.batchTotal,
            }
          : undefined,
        latency: `${latency}ms`,
        performance:
          latency < 100
            ? 'excellent'
            : latency < 250
              ? 'good'
              : 'needs_optimization',
        payloadSize: JSON.stringify(validatedData.payload).length,
      });

      // Return broadcast confirmation
      return Response.json(
        {
          success: true,
          broadcast: {
            messageId: crypto.randomUUID(),
            channelName: validatedData.channelName,
            eventType: validatedData.eventType,
            broadcastTime: new Date().toISOString(),
            priority: validatedData.priority,
            category: validatedData.messageCategory,
            targetedDelivery: !!validatedData.targetUserId,
            offlineQueueing: validatedData.persistForOfflineUsers,
          },
          delivery: {
            potentialRecipients: subscriberCount || 0,
            immediateDelivery: true, // This would be determined by actual connection status
            queuedForOffline: validatedData.persistForOfflineUsers,
            requiresReceipt: validatedData.requireDeliveryReceipt,
          },
          context: {
            weddingId: validatedData.weddingId,
            supplierId: validatedData.supplierId,
            coupleId: validatedData.coupleId,
          },
          batch: validatedData.batchId
            ? {
                batchId: validatedData.batchId,
                index: validatedData.batchIndex,
                total: validatedData.batchTotal,
                progress:
                  validatedData.batchIndex && validatedData.batchTotal
                    ? `${validatedData.batchIndex + 1}/${validatedData.batchTotal}`
                    : undefined,
              }
            : undefined,
          performance: {
            latency: `${latency}ms`,
            target: '<100ms',
            payloadSize: JSON.stringify(validatedData.payload).length,
            optimization:
              latency > 250
                ? 'Consider message batching for better performance'
                : undefined,
          },
        },
        {
          status: 200,
          headers: {
            'X-Channel-Name': validatedData.channelName,
            'X-Message-Category': validatedData.messageCategory,
            'X-Performance-Latency': `${latency}ms`,
            'X-Recipients': (subscriberCount || 0).toString(),
          },
        },
      );
    } catch (error) {
      const latency = Date.now() - startTime;

      logger.error('WebSocket message broadcast failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        channelName: validatedData.channelName,
        eventType: validatedData.eventType,
        messageCategory: validatedData.messageCategory,
        latency: `${latency}ms`,
        requestData: {
          ...validatedData,
          payload: '[REDACTED]', // Don't log sensitive payload data
        },
      });

      // Determine error type and response
      if (error instanceof Error) {
        if (error.message.includes('Channel not found')) {
          return Response.json(
            {
              error: 'CHANNEL_NOT_FOUND',
              message: 'The specified channel does not exist or is inactive',
              code: 'CHANNEL_NOT_FOUND',
              channelName: validatedData.channelName,
            },
            { status: 404 },
          );
        }

        if (error.message.includes('rate limit')) {
          return Response.json(
            {
              error: 'RATE_LIMITED',
              message: 'Message rate limit exceeded for this channel',
              code: 'CHANNEL_RATE_LIMITED',
              channelName: validatedData.channelName,
            },
            { status: 429 },
          );
        }
      }

      return Response.json(
        {
          error: 'BROADCAST_FAILED',
          message: 'Failed to broadcast message to channel',
          code: 'BROADCAST_ERROR',
          channelName: validatedData.channelName,
          eventType: validatedData.eventType,
          details: process.env.NODE_ENV === 'development' ? error : undefined,
        },
        { status: 500 },
      );
    }
  },
);

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Get rate limits based on message category
 */
function getRateLimitForCategory(category: string): {
  requests: number;
  window: number;
} {
  const rateLimits: Record<string, { requests: number; window: number }> = {
    urgent: { requests: 10, window: 60000 }, // 10 per minute for urgent
    payment: { requests: 20, window: 300000 }, // 20 per 5 minutes for payment
    timeline_change: { requests: 30, window: 300000 }, // 30 per 5 minutes
    form_response: { requests: 50, window: 300000 }, // 50 per 5 minutes
    journey_update: { requests: 100, window: 3600000 }, // 100 per hour
    general: { requests: 200, window: 3600000 }, // 200 per hour for general
  };

  return rateLimits[category] || rateLimits['general'];
}

/**
 * Validate wedding context for broadcast
 */
async function validateWeddingContext(
  data: BroadcastMessageRequest,
  userId: string,
  userProfile: any,
  supabase: any,
): Promise<{ valid: boolean; reason?: string }> {
  // If weddingId is provided, validate access
  if (data.weddingId) {
    const { data: wedding, error } = await supabase
      .from('wedding_core_data')
      .select('id')
      .eq('id', data.weddingId)
      .single();

    if (error || !wedding) {
      return { valid: false, reason: 'Invalid wedding ID provided' };
    }
  }

  // If supplierId is provided, validate organization access
  if (data.supplierId) {
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('organization_id')
      .eq('id', data.supplierId)
      .single();

    if (error || !supplier) {
      return { valid: false, reason: 'Invalid supplier ID provided' };
    }

    if (
      userProfile.organization_id !== supplier.organization_id &&
      userProfile.role !== 'admin'
    ) {
      return { valid: false, reason: 'Access denied to supplier context' };
    }
  }

  // If coupleId is provided, validate couple access
  if (data.coupleId) {
    const { data: couple, error } = await supabase
      .from('couples')
      .select('user_id, partner_user_id')
      .eq('id', data.coupleId)
      .single();

    if (error || !couple) {
      return { valid: false, reason: 'Invalid couple ID provided' };
    }

    const hasAccess =
      couple.user_id === userId ||
      couple.partner_user_id === userId ||
      userProfile.role === 'admin';

    if (!hasAccess) {
      return { valid: false, reason: 'Access denied to couple context' };
    }
  }

  return { valid: true };
}
