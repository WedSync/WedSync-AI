/**
 * WS-159: Task Status Update Webhook Endpoint
 * Secure webhook endpoint for receiving task status updates from external systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { taskNotificationService } from '@/lib/notifications/task-notifications';
import { TaskStatusRealtimeManager } from '@/lib/realtime/task-status-realtime';
import { verifyWebhookSignature } from '@/lib/security/webhook-validation';
import { getSecureConfig } from '@/lib/config/environment';
import { headers } from 'next/headers';

interface TaskUpdateWebhookPayload {
  task_id: string;
  wedding_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  previous_status?: string;
  completion_percentage?: number;
  photo_evidence_url?: string;
  notes?: string;
  completed_by?: string;
  completed_at?: string;
  helper_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent' | 'emergency';
  category?: string;
  deadline?: string;
  source: 'calendar' | 'mobile_app' | 'third_party' | 'manual';
  metadata?: Record<string, any>;
}

interface WebhookResponse {
  success: boolean;
  message: string;
  task_id?: string;
  delivery_time_ms?: number;
  notifications_sent?: number;
  error?: string;
  details?: any;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookResponse>> {
  const startTime = Date.now();

  try {
    // 1. Security validation - MANDATORY for all webhooks
    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');
    const sourceSystem = request.headers.get('x-source-system');

    if (!signature || !timestamp) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required webhook signature or timestamp headers',
        },
        { status: 400 },
      );
    }

    // Verify timestamp is recent (within 5 minutes)
    const timestampMs = parseInt(timestamp);
    const now = Date.now();
    if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          message: 'Request timestamp too old or invalid',
        },
        { status: 400 },
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    const config = getSecureConfig();

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(
      signature,
      timestamp,
      rawBody,
      config.TASK_WEBHOOK_SECRET,
    );

    if (!isValidSignature) {
      console.error('Webhook signature verification failed', {
        signature,
        timestamp,
        sourceSystem,
        bodyLength: rawBody.length,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Invalid webhook signature',
        },
        { status: 401 },
      );
    }

    // 2. Parse and validate payload
    let payload: TaskUpdateWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid JSON payload',
        },
        { status: 400 },
      );
    }

    // Validate required fields
    const validationErrors = validateTaskUpdatePayload(payload);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Payload validation failed',
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // 3. Rate limiting check (prevent abuse)
    const rateLimitResult = await checkRateLimit(request, payload.wedding_id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Rate limit exceeded',
          details: {
            limit: rateLimitResult.limit,
            reset_time: rateLimitResult.resetTime,
          },
        },
        { status: 429 },
      );
    }

    // 4. Process the task status update
    const processingResult = await processTaskStatusUpdate(
      payload,
      sourceSystem,
    );

    if (!processingResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to process task update',
          task_id: payload.task_id,
          error: processingResult.error,
        },
        { status: 500 },
      );
    }

    // 5. Send real-time updates and notifications
    const broadcastResult = await broadcastTaskUpdate(payload);
    const notificationResult = await sendTaskUpdateNotifications(payload);

    const deliveryTime = Date.now() - startTime;

    // 6. Log successful webhook processing
    await logWebhookProcessing({
      task_id: payload.task_id,
      wedding_id: payload.wedding_id,
      source: payload.source,
      status: payload.status,
      delivery_time_ms: deliveryTime,
      notifications_sent: notificationResult.notificationsSent,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Task status update processed successfully',
        task_id: payload.task_id,
        delivery_time_ms: deliveryTime,
        notifications_sent: notificationResult.notificationsSent,
      },
      { status: 200 },
    );
  } catch (error) {
    const deliveryTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('Task update webhook processing error:', error);

    // Log failed webhook processing
    await logWebhookProcessing({
      task_id: 'unknown',
      wedding_id: 'unknown',
      source: 'webhook',
      status: 'error',
      delivery_time_ms: deliveryTime,
      notifications_sent: 0,
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error processing webhook',
        error:
          process.env.NODE_ENV === 'development'
            ? errorMessage
            : 'Internal error',
        delivery_time_ms: deliveryTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint for webhook monitoring
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'health':
        return NextResponse.json({
          status: 'healthy',
          service: 'task-update-webhook',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        });

      case 'stats':
        const stats = await getWebhookStats();
        return NextResponse.json(stats);

      default:
        return NextResponse.json({
          endpoint: 'task-update-webhook',
          methods: ['POST'],
          security: 'HMAC-SHA256 signature required',
          rate_limit: '100 requests per minute per wedding',
          required_headers: [
            'x-webhook-signature',
            'x-webhook-timestamp',
            'x-source-system',
          ],
          supported_sources: [
            'calendar',
            'mobile_app',
            'third_party',
            'manual',
          ],
        });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}

/**
 * Validate task update webhook payload
 */
function validateTaskUpdatePayload(payload: any): string[] {
  const errors: string[] = [];

  if (!payload.task_id) {
    errors.push('task_id is required');
  }

  if (!payload.wedding_id) {
    errors.push('wedding_id is required');
  }

  if (!payload.status) {
    errors.push('status is required');
  }

  if (
    payload.status &&
    !['pending', 'in_progress', 'completed', 'overdue', 'cancelled'].includes(
      payload.status,
    )
  ) {
    errors.push(
      'status must be one of: pending, in_progress, completed, overdue, cancelled',
    );
  }

  if (!payload.source) {
    errors.push('source is required');
  }

  if (
    payload.source &&
    !['calendar', 'mobile_app', 'third_party', 'manual'].includes(
      payload.source,
    )
  ) {
    errors.push(
      'source must be one of: calendar, mobile_app, third_party, manual',
    );
  }

  if (
    payload.completion_percentage &&
    (payload.completion_percentage < 0 || payload.completion_percentage > 100)
  ) {
    errors.push('completion_percentage must be between 0 and 100');
  }

  if (
    payload.priority &&
    !['low', 'normal', 'high', 'urgent', 'emergency'].includes(payload.priority)
  ) {
    errors.push(
      'priority must be one of: low, normal, high, urgent, emergency',
    );
  }

  return errors;
}

/**
 * Process task status update in database
 */
async function processTaskStatusUpdate(
  payload: TaskUpdateWebhookPayload,
  sourceSystem?: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    // This would typically update the database
    // For now, we'll simulate the database update
    console.log('Processing task status update:', {
      task_id: payload.task_id,
      wedding_id: payload.wedding_id,
      status: payload.status,
      source: payload.source,
      sourceSystem,
    });

    // TODO: Implement actual database update
    // await updateTaskStatus(payload)

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Database update failed',
    };
  }
}

/**
 * Broadcast task update via real-time system
 */
async function broadcastTaskUpdate(
  payload: TaskUpdateWebhookPayload,
): Promise<{ success: boolean; delivery_time_ms: number }> {
  try {
    const realtimeManager = new TaskStatusRealtimeManager(
      payload.wedding_id,
      'webhook_system',
    );
    await realtimeManager.connect();

    const result = await realtimeManager.broadcastTaskStatusChange({
      task_id: payload.task_id,
      wedding_id: payload.wedding_id,
      status: payload.status,
      previous_status: payload.previous_status,
      completion_percentage: payload.completion_percentage,
      photo_evidence_url: payload.photo_evidence_url,
      notes: payload.notes,
      completed_by: payload.completed_by,
      completed_at: payload.completed_at,
      helper_id: payload.helper_id,
      priority: payload.priority || 'normal',
      category: payload.category || 'general',
      deadline: payload.deadline,
      metadata: payload.metadata,
    });

    realtimeManager.disconnect();

    return {
      success: result.success,
      delivery_time_ms: result.delivery_time_ms,
    };
  } catch (error) {
    console.error('Failed to broadcast task update:', error);
    return { success: false, delivery_time_ms: 0 };
  }
}

/**
 * Send notifications for task status update
 */
async function sendTaskUpdateNotifications(
  payload: TaskUpdateWebhookPayload,
): Promise<{ success: boolean; notificationsSent: number }> {
  try {
    await taskNotificationService.sendTaskStatusChangeNotification({
      task_id: payload.task_id,
      wedding_id: payload.wedding_id,
      status: payload.status,
      previous_status: payload.previous_status,
      completion_percentage: payload.completion_percentage,
      photo_evidence_url: payload.photo_evidence_url,
      notes: payload.notes,
      completed_by: payload.completed_by,
      completed_at: payload.completed_at,
      helper_id: payload.helper_id,
      priority: payload.priority || 'normal',
      category: payload.category || 'general',
      deadline: payload.deadline,
      updated_by: 'webhook_system',
      timestamp: new Date().toISOString(),
      metadata: payload.metadata,
    });

    return { success: true, notificationsSent: 1 };
  } catch (error) {
    console.error('Failed to send task update notifications:', error);
    return { success: false, notificationsSent: 0 };
  }
}

/**
 * Check rate limiting
 */
async function checkRateLimit(
  request: NextRequest,
  weddingId: string,
): Promise<{ allowed: boolean; limit: number; resetTime?: string }> {
  // Simple in-memory rate limiting for demonstration
  // In production, use Redis or similar
  const rateLimitKey = `task_webhook_${weddingId}`;
  const limit = 100; // 100 requests per minute per wedding
  const windowMs = 60 * 1000; // 1 minute

  // TODO: Implement proper rate limiting with Redis
  // For now, always allow
  return {
    allowed: true,
    limit,
    resetTime: new Date(Date.now() + windowMs).toISOString(),
  };
}

/**
 * Log webhook processing for monitoring
 */
async function logWebhookProcessing(logData: any): Promise<void> {
  try {
    // In production, this would write to a logging service or database
    console.log('Webhook processing log:', logData);

    // TODO: Implement proper logging to database or service
    // await insertWebhookLog(logData)
  } catch (error) {
    console.error('Failed to log webhook processing:', error);
  }
}

/**
 * Get webhook statistics for monitoring
 */
async function getWebhookStats(): Promise<any> {
  // TODO: Implement actual statistics gathering
  return {
    total_requests_24h: 0,
    successful_requests_24h: 0,
    failed_requests_24h: 0,
    average_processing_time_ms: 0,
    rate_limit_hits_24h: 0,
    last_request: null,
  };
}
