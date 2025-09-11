/**
 * WS-202 Supabase Realtime Integration - Unsubscribe API Endpoint
 * Team B - Backend/API Implementation
 *
 * Secure unsubscription endpoint with authentication and cleanup.
 * Gracefully disconnects realtime subscriptions and frees resources.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getRealtimeManager } from '../../../../lib/realtime/RealtimeSubscriptionManager';

// Input validation schema
const unsubscribeRequestSchema = z.object({
  subscriptionIds: z
    .array(z.string().min(1, 'Subscription ID cannot be empty'))
    .min(1, 'At least one subscription ID is required')
    .max(10, 'Maximum 10 subscriptions per request'),

  reason: z
    .enum(['user_request', 'session_end', 'cleanup', 'error_recovery'])
    .optional(),

  metadata: z
    .object({
      source: z.enum(['dashboard', 'mobile', 'api']).optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
});

interface UnsubscribeResponse {
  success: boolean;
  results: Array<{
    subscriptionId: string;
    unsubscribed: boolean;
    error?: string;
    memoryReclaimed?: number;
  }>;
  totalUnsubscribed: number;
  memoryReclaimed: number;
  remainingSubscriptions: number;
}

// Authentication helper
async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid authentication token');
  }

  return { user };
}

// Audit logging
async function logUnsubscriptionActivity(
  userId: string,
  action: 'unsubscribe_request' | 'unsubscribe_success' | 'unsubscribe_failure',
  details: Record<string, unknown>,
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    await supabase.from('realtime_activity_logs').insert({
      user_id: userId,
      event_type: action,
      payload: details,
      ip_address: (details.ipAddress as string) || null,
      user_agent: (details.userAgent as string) || null,
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let userId: string = '';

  try {
    // 1. Authentication
    const { user } = await authenticate(request);
    userId = user.id;

    // Get request metadata for logging
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 2. Input validation
    const body = await request.json();
    const validatedData = unsubscribeRequestSchema.parse(body);

    await logUnsubscriptionActivity(userId, 'unsubscribe_request', {
      subscriptionIds: validatedData.subscriptionIds,
      reason: validatedData.reason,
      ipAddress,
      userAgent,
      metadata: validatedData.metadata,
    });

    // 3. Process unsubscriptions
    const realtimeManager = getRealtimeManager();
    const results = [];
    let totalMemoryReclaimed = 0;
    let successCount = 0;

    for (const subscriptionId of validatedData.subscriptionIds) {
      try {
        // Get subscription details before unsubscribing for memory calculation
        const connectionHealth = await realtimeManager.getConnectionHealth();
        const subscription = connectionHealth.find(
          (h) => h.subscriptionId === subscriptionId,
        );
        const memoryBefore = subscription?.memoryUsage || 0;

        const success = await realtimeManager.unsubscribe(subscriptionId);

        if (success) {
          successCount++;
          totalMemoryReclaimed += memoryBefore;

          results.push({
            subscriptionId,
            unsubscribed: true,
            memoryReclaimed: memoryBefore,
          });
        } else {
          results.push({
            subscriptionId,
            unsubscribed: false,
            error: 'Subscription not found or already unsubscribed',
          });
        }
      } catch (error) {
        results.push({
          subscriptionId,
          unsubscribed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 4. Get remaining subscriptions count
    const finalMetrics = await realtimeManager.getMetrics();

    await logUnsubscriptionActivity(userId, 'unsubscribe_success', {
      subscriptionIds: validatedData.subscriptionIds,
      totalUnsubscribed: successCount,
      memoryReclaimed: totalMemoryReclaimed,
      responseTime: Date.now() - startTime,
    });

    const response: UnsubscribeResponse = {
      success: successCount > 0,
      results,
      totalUnsubscribed: successCount,
      memoryReclaimed: totalMemoryReclaimed,
      remainingSubscriptions: finalMetrics.activeSubscriptions,
    };

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'X-Memory-Reclaimed': `${Math.round(totalMemoryReclaimed / 1024)}KB`,
      },
    });
  } catch (error) {
    console.error('Unsubscribe API error:', error);

    if (userId) {
      await logUnsubscriptionActivity(userId, 'unsubscribe_failure', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: Date.now() - startTime,
      });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes('authorization') ||
        error.message.includes('authentication')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
          },
          { status: 401 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

// GET method for subscription cleanup (admin only)
export async function GET(request: NextRequest) {
  try {
    const { user } = await authenticate(request);

    // Check admin permissions (you'd implement this based on your auth system)
    // For now, we'll allow any authenticated user to trigger cleanup

    const realtimeManager = getRealtimeManager();
    const cleanupResult = await realtimeManager.cleanup();

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      cleanupResult: {
        cleanedSubscriptions: cleanupResult.cleanedSubscriptions,
        activeConnections: cleanupResult.activeConnections,
        memoryReclaimed: `${Math.round(cleanupResult.memoryReclaimed / 1024)}KB`,
        duration: `${cleanupResult.duration}ms`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Cleanup failed',
      },
      { status: 500 },
    );
  }
}
