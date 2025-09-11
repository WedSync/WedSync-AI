/**
 * WS-336: Calendar Integration System - Calendar Webhooks
 *
 * POST /api/calendar/webhooks/[provider] - Handle calendar change notifications
 * Supports Google Calendar, Microsoft Outlook, and Apple Calendar webhooks
 *
 * WEDDING CRITICAL: These webhooks maintain bidirectional sync integrity
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { TimelineSyncService } from '@/lib/calendar/timeline-sync-service';
import type { CalendarProvider } from '@/lib/calendar/oauth-service';

interface WebhookPayload {
  provider: CalendarProvider;
  eventType: 'created' | 'updated' | 'deleted';
  eventId: string;
  calendarId: string;
  resourceUri?: string;
  timestamp: string;
  organizationId?: string; // Will be derived from connection
}

interface WebhookValidationResult {
  valid: boolean;
  error?: string;
  payload?: WebhookPayload;
}

// Supported webhook providers
const SUPPORTED_PROVIDERS: CalendarProvider[] = ['google', 'outlook', 'apple'];

// Webhook rate limiting
const webhookRateLimitStore = new Map<
  string,
  { count: number; resetTime: number }
>();

async function checkWebhookRateLimit(provider: string): Promise<boolean> {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // 100 webhooks per provider per minute

  const key = `webhook_rate:${provider}`;
  const existing = webhookRateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    webhookRateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (existing.count >= maxRequests) {
    return false;
  }

  existing.count += 1;
  return true;
}

/**
 * Validate webhook signature for security
 */
async function validateWebhookSignature(
  request: NextRequest,
  provider: CalendarProvider,
  rawBody: string,
): Promise<WebhookValidationResult> {
  try {
    switch (provider) {
      case 'google':
        return validateGoogleWebhook(request, rawBody);
      case 'outlook':
        return validateOutlookWebhook(request, rawBody);
      case 'apple':
        return validateAppleWebhook(request, rawBody);
      default:
        return { valid: false, error: `Unsupported provider: ${provider}` };
    }
  } catch (error) {
    console.error('Webhook validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Google Calendar webhook validation
 */
async function validateGoogleWebhook(
  request: NextRequest,
  rawBody: string,
): Promise<WebhookValidationResult> {
  const channelId = request.headers.get('x-goog-channel-id');
  const channelToken = request.headers.get('x-goog-channel-token');
  const resourceId = request.headers.get('x-goog-resource-id');
  const resourceUri = request.headers.get('x-goog-resource-uri');
  const resourceState = request.headers.get('x-goog-resource-state');
  const messageNumber = request.headers.get('x-goog-message-number');

  if (!channelId || !resourceId || !resourceState) {
    return { valid: false, error: 'Missing required Google webhook headers' };
  }

  // Google webhook signature validation (if configured)
  const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get('x-goog-signature');
    if (!signature) {
      return { valid: false, error: 'Missing Google webhook signature' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      )
    ) {
      return { valid: false, error: 'Invalid Google webhook signature' };
    }
  }

  // Parse Google webhook payload
  const eventType =
    resourceState === 'sync'
      ? 'updated'
      : resourceState === 'exists'
        ? 'updated'
        : 'updated';

  const payload: WebhookPayload = {
    provider: 'google',
    eventType,
    eventId: resourceId,
    calendarId: channelId,
    resourceUri: resourceUri || '',
    timestamp: new Date().toISOString(),
  };

  return { valid: true, payload };
}

/**
 * Microsoft Outlook webhook validation
 */
async function validateOutlookWebhook(
  request: NextRequest,
  rawBody: string,
): Promise<WebhookValidationResult> {
  // Handle Microsoft Graph validation token
  const validationToken = request.headers.get('validationtoken');
  if (validationToken) {
    // This is a subscription validation request
    return {
      valid: true,
      payload: {
        provider: 'outlook',
        eventType: 'updated',
        eventId: 'validation',
        calendarId: 'validation',
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Parse Microsoft Graph webhook payload
  try {
    const body = JSON.parse(rawBody);
    const notifications = body.value;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return {
        valid: false,
        error: 'Invalid Outlook webhook payload structure',
      };
    }

    const notification = notifications[0]; // Process first notification

    const payload: WebhookPayload = {
      provider: 'outlook',
      eventType: notification.changeType || 'updated',
      eventId: notification.resourceData?.id || '',
      calendarId: notification.resource || '',
      timestamp: notification.eventTime || new Date().toISOString(),
    };

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Failed to parse Outlook webhook payload' };
  }
}

/**
 * Apple Calendar webhook validation (if supported)
 */
async function validateAppleWebhook(
  request: NextRequest,
  rawBody: string,
): Promise<WebhookValidationResult> {
  // Apple Calendar typically doesn't support webhooks via CalDAV
  // This would be for future Apple EventKit integration if available
  return { valid: false, error: 'Apple Calendar webhooks not supported' };
}

/**
 * Process calendar webhook notification
 */
async function processCalendarWebhook(
  payload: WebhookPayload,
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Handle validation requests
    if (payload.eventId === 'validation') {
      return { success: true, message: 'Validation request processed' };
    }

    // Find calendar connection for this webhook
    const { data: connection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('provider', payload.provider)
      .eq('status', 'active')
      .eq('sync_enabled', true)
      .maybeSingle();

    if (!connection) {
      console.warn(
        `No active connection found for ${payload.provider} webhook`,
      );
      return { success: true, message: 'No active connection found' };
    }

    payload.organizationId = connection.organization_id;

    // Check if this event is managed by WedSync
    const { data: syncRecord } = await supabase
      .from('timeline_calendar_sync')
      .select('*')
      .eq('calendar_connection_id', connection.id)
      .eq('external_event_id', payload.eventId)
      .maybeSingle();

    if (!syncRecord) {
      // This is a new external event, possibly created outside WedSync
      return await handleExternalEventChange(connection, payload);
    }

    // This is a WedSync-managed event that was modified externally
    return await handleManagedEventChange(connection, syncRecord, payload);
  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle external event changes (events not created by WedSync)
 */
async function handleExternalEventChange(
  connection: any,
  payload: WebhookPayload,
): Promise<{ success: boolean; message?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Log the external event change
  await supabase.rpc('log_calendar_sync_operation', {
    p_organization_id: connection.organization_id,
    p_operation_type: 'external_event_change',
    p_operation_status: 'success',
    p_calendar_connection_id: connection.id,
    p_events_processed: 1,
  });

  // Could trigger import of external events if bidirectional sync is enabled
  // For now, just log it
  console.log(`External ${payload.eventType} event detected:`, {
    provider: payload.provider,
    eventId: payload.eventId,
    organizationId: connection.organization_id,
  });

  return {
    success: true,
    message: `External event change logged for ${payload.provider}`,
  };
}

/**
 * Handle changes to WedSync-managed events
 */
async function handleManagedEventChange(
  connection: any,
  syncRecord: any,
  payload: WebhookPayload,
): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Check sync direction - if export-only, ignore external changes
    if (connection.sync_direction === 'export_only') {
      return {
        success: true,
        message: 'External changes ignored for export-only connection',
      };
    }

    // Mark sync record as having a conflict (external modification detected)
    await supabase
      .from('timeline_calendar_sync')
      .update({
        sync_status: 'conflict',
        conflict_reason: `External ${payload.eventType} detected`,
        remote_last_modified: payload.timestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', syncRecord.id);

    // Log the conflict
    await supabase.rpc('log_calendar_sync_operation', {
      p_organization_id: connection.organization_id,
      p_operation_type: 'conflict_detected',
      p_operation_status: 'warning',
      p_calendar_connection_id: connection.id,
      p_timeline_sync_id: syncRecord.id,
      p_error_message: `External ${payload.eventType} on managed event`,
    });

    // Trigger conflict resolution workflow (could be async)
    await triggerConflictResolution(syncRecord, payload);

    return {
      success: true,
      message: `Conflict detected and resolution initiated`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Trigger conflict resolution workflow
 */
async function triggerConflictResolution(
  syncRecord: any,
  payload: WebhookPayload,
): Promise<void> {
  // In a full implementation, this would:
  // 1. Fetch the current event data from the calendar
  // 2. Compare with WedSync timeline data
  // 3. Apply conflict resolution rules
  // 4. Notify users if manual resolution is needed

  console.log('Conflict resolution triggered:', {
    syncRecordId: syncRecord.id,
    eventType: payload.eventType,
    eventId: payload.eventId,
  });

  // TODO: Implement conflict resolution logic
}

/**
 * Main webhook handler
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } },
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const provider = params.provider as CalendarProvider;

    // Provider validation
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Unsupported provider' },
        { status: 400 },
      );
    }

    // Rate limiting
    if (!(await checkWebhookRateLimit(provider))) {
      console.warn(`Webhook rate limit exceeded for ${provider}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Read raw body for signature validation
    const rawBody = await request.text();

    // Validate webhook signature and parse payload
    const validation = await validateWebhookSignature(
      request,
      provider,
      rawBody,
    );

    if (!validation.valid) {
      console.error(
        `Webhook validation failed for ${provider}:`,
        validation.error,
      );
      return NextResponse.json(
        { error: 'Webhook validation failed' },
        { status: 401 },
      );
    }

    // Handle Microsoft Graph validation token response
    if (provider === 'outlook') {
      const validationToken = request.headers.get('validationtoken');
      if (validationToken) {
        return new NextResponse(validationToken, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // Process the webhook
    const result = await processCalendarWebhook(validation.payload!);

    if (!result.success) {
      console.error(`Webhook processing failed for ${provider}:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Log successful webhook processing
    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed successfully:`, {
      provider,
      eventType: validation.payload?.eventType,
      processingTime: `${processingTime}ms`,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      provider,
      processingTime,
    });
  } catch (error) {
    console.error('Webhook endpoint error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to process webhook',
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint for webhook health check
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } },
): Promise<NextResponse> {
  const provider = params.provider as CalendarProvider;

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return NextResponse.json(
      { error: 'Unsupported provider' },
      { status: 400 },
    );
  }

  // Check webhook configuration
  const webhookSecret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhooks/${provider}`;

  return NextResponse.json({
    provider,
    webhookUrl,
    configured: !!webhookSecret,
    supportedEvents: ['created', 'updated', 'deleted'],
    status: 'ready',
  });
}
