import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { MicrosoftGraphClient } from '@/lib/integrations/microsoft-graph-client';
import * as crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (() => {
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
    })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (() => {
      throw new Error(
        'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY',
      );
    })(),
);

const graphClient = new MicrosoftGraphClient({
  clientId:
    process.env.MICROSOFT_CLIENT_ID ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_CLIENT_ID');
    })(),
  clientSecret:
    process.env.MICROSOFT_CLIENT_SECRET ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_CLIENT_SECRET');
    })(),
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  redirectUri:
    process.env.MICROSOFT_REDIRECT_URI ||
    (() => {
      throw new Error('Missing environment variable: MICROSOFT_REDIRECT_URI');
    })(),
  scopes: [
    'https://graph.microsoft.com/calendars.readwrite',
    'https://graph.microsoft.com/user.read',
  ],
});

interface WebhookNotification {
  subscriptionId: string;
  clientState: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    id: string;
    '@odata.etag': string;
  };
  subscriptionExpirationDateTime: string;
  tenantId: string;
}

const webhookNotificationSchema = z.object({
  value: z.array(
    z.object({
      subscriptionId: z.string(),
      clientState: z.string(),
      changeType: z.enum(['created', 'updated', 'deleted']),
      resource: z.string(),
      resourceData: z.object({
        '@odata.type': z.string(),
        '@odata.id': z.string(),
        id: z.string(),
        '@odata.etag': z.string().optional(),
      }),
      subscriptionExpirationDateTime: z.string(),
      tenantId: z.string().optional(),
    }),
  ),
});

/**
 * POST /api/calendar/outlook/webhook
 * Handle Microsoft Graph webhook notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Check for validation token (initial subscription setup)
    const searchParams = request.nextUrl.searchParams;
    const validationToken = searchParams.get('validationToken');

    if (validationToken) {
      // Return validation token as plain text for Microsoft
      return new Response(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Rate limiting for webhook endpoint (100 requests per minute)
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateKey = `webhook_${clientIp}`;

    const { data: rateLimitData } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('key', rateKey)
      .gte('created_at', new Date(Date.now() - 60 * 1000).toISOString())
      .single();

    if (rateLimitData && rateLimitData.count >= 100) {
      console.warn(`Webhook rate limit exceeded for IP: ${clientIp}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    // Parse and validate webhook payload
    const body = await request.json();
    const validationResult = webhookNotificationSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Invalid webhook payload:', validationResult.error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const notifications = validationResult.data.value;

    // Process each notification
    for (const notification of notifications) {
      try {
        await processWebhookNotification(notification);
      } catch (error) {
        console.error('Failed to process webhook notification:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          subscriptionId: notification.subscriptionId,
          changeType: notification.changeType,
        });
      }
    }

    // Update rate limiting
    await supabase.from('rate_limits').upsert({
      key: rateKey,
      count: (rateLimitData?.count || 0) + 1,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      status: 'processed',
      processedCount: notifications.length,
    });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/calendar/outlook/webhook?validationToken=...
 * Handle webhook validation requests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const validationToken = searchParams.get('validationToken');

  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/**
 * Process individual webhook notification
 */
async function processWebhookNotification(
  notification: WebhookNotification,
): Promise<void> {
  // Validate subscription and get user info
  const subscription = await validateSubscription(
    notification.subscriptionId,
    notification.clientState,
  );
  if (!subscription) {
    console.error('Invalid subscription or client state:', {
      subscriptionId: notification.subscriptionId,
      clientState: notification.clientState,
    });
    return;
  }

  try {
    // Process based on change type
    switch (notification.changeType) {
      case 'created':
        await handleEventCreated(notification, subscription);
        break;
      case 'updated':
        await handleEventUpdated(notification, subscription);
        break;
      case 'deleted':
        await handleEventDeleted(notification, subscription);
        break;
    }

    // Update last sync time
    await updateLastSyncTime(subscription.user_id);

    // Log successful processing
    await logWebhookActivity(subscription.user_id, 'notification_processed', {
      subscriptionId: notification.subscriptionId,
      changeType: notification.changeType,
      eventId: notification.resourceData.id,
    });
  } catch (error) {
    console.error('Error processing notification:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      subscriptionId: notification.subscriptionId,
      changeType: notification.changeType,
      userId: subscription.user_id,
    });

    // Log error
    await logWebhookActivity(subscription.user_id, 'notification_error', {
      subscriptionId: notification.subscriptionId,
      changeType: notification.changeType,
      eventId: notification.resourceData.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Handle event created notification
 */
async function handleEventCreated(
  notification: WebhookNotification,
  subscription: any,
): Promise<void> {
  const eventId = notification.resourceData.id;

  // Get the full event details from Microsoft Graph
  const events = await graphClient.getEvents(subscription.user_id, 'primary', {
    filter: `id eq '${eventId}'`,
    top: 1,
  });

  if (events.length === 0) {
    console.warn('Event not found or not accessible:', eventId);
    return;
  }

  const event = events[0];

  // Check if this is a wedding-related event
  if (isWeddingRelated(event)) {
    const weddingMapping = mapEventToWedding(event);

    // Store in our system
    await supabase.from('synced_calendar_events').upsert({
      user_id: subscription.user_id,
      integration_type: 'microsoft-outlook',
      external_event_id: event.id,
      event_data: event,
      wedding_context: weddingMapping,
      event_type: weddingMapping.eventType,
      event_date: weddingMapping.eventDate,
      is_wedding_day: weddingMapping.isWeddingDay,
      priority: weddingMapping.priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Trigger automation if configured
    await triggerEventAutomation(
      'created',
      subscription.user_id,
      event,
      weddingMapping,
    );
  }
}

/**
 * Handle event updated notification
 */
async function handleEventUpdated(
  notification: WebhookNotification,
  subscription: any,
): Promise<void> {
  const eventId = notification.resourceData.id;

  // Get the updated event details
  const events = await graphClient.getEvents(subscription.user_id, 'primary', {
    filter: `id eq '${eventId}'`,
    top: 1,
  });

  if (events.length === 0) {
    // Event might have been deleted or access revoked
    await handleEventDeleted(notification, subscription);
    return;
  }

  const event = events[0];

  if (isWeddingRelated(event)) {
    const weddingMapping = mapEventToWedding(event);

    // Update in our system
    await supabase
      .from('synced_calendar_events')
      .update({
        event_data: event,
        wedding_context: weddingMapping,
        event_type: weddingMapping.eventType,
        event_date: weddingMapping.eventDate,
        is_wedding_day: weddingMapping.isWeddingDay,
        priority: weddingMapping.priority,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', subscription.user_id)
      .eq('external_event_id', eventId);

    // Trigger automation
    await triggerEventAutomation(
      'updated',
      subscription.user_id,
      event,
      weddingMapping,
    );
  }
}

/**
 * Handle event deleted notification
 */
async function handleEventDeleted(
  notification: WebhookNotification,
  subscription: any,
): Promise<void> {
  const eventId = notification.resourceData.id;

  // Remove from our system
  await supabase
    .from('synced_calendar_events')
    .delete()
    .eq('user_id', subscription.user_id)
    .eq('external_event_id', eventId);

  // Log deletion
  await logWebhookActivity(subscription.user_id, 'event_deleted', {
    eventId: eventId,
  });
}

/**
 * Validate webhook subscription
 */
async function validateSubscription(
  subscriptionId: string,
  clientState: string,
): Promise<any> {
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .eq('client_state', clientState)
    .eq('integration_type', 'microsoft-outlook')
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if event is wedding-related
 */
function isWeddingRelated(event: any): boolean {
  const text = (
    event.subject +
    ' ' +
    (event.body?.content || '')
  ).toLowerCase();
  const weddingKeywords = [
    'wedding',
    'bride',
    'groom',
    'ceremony',
    'reception',
    'engagement',
    'bridal',
    'venue',
    'catering',
    'florist',
    'photographer',
    'videographer',
    'consultation',
    'meeting',
    'shoot',
    'album',
    'delivery',
  ];

  return weddingKeywords.some((keyword) => text.includes(keyword));
}

/**
 * Map event to wedding context
 */
function mapEventToWedding(event: any): any {
  const subject = event.subject.toLowerCase();

  let eventType = 'consultation';
  if (subject.includes('engagement')) eventType = 'engagement';
  else if (subject.includes('ceremony')) eventType = 'ceremony';
  else if (subject.includes('reception')) eventType = 'reception';
  else if (subject.includes('delivery') || subject.includes('album'))
    eventType = 'delivery';
  else if (subject.includes('follow') || subject.includes('review'))
    eventType = 'followup';

  return {
    eventType,
    clientNames: extractClientNames(event),
    vendorType: 'photographer',
    eventDate: event.start.dateTime,
    priority: determinePriority(event),
    isWeddingDay: eventType === 'ceremony' || eventType === 'reception',
  };
}

/**
 * Extract client names from event
 */
function extractClientNames(event: any): string[] {
  const names =
    event.attendees
      ?.map((attendee: any) => attendee.emailAddress?.name)
      .filter((name: string) => name && name !== '') || [];

  // Also try to extract from subject
  const words = event.subject.split(/\s+/);
  const possibleNames = words.filter(
    (word: string) =>
      /^[A-Z][a-z]+$/.test(word) &&
      !['Wedding', 'Consultation', 'Meeting', 'With'].includes(word),
  );

  return [...new Set([...names, ...possibleNames.slice(0, 2)])];
}

/**
 * Determine event priority
 */
function determinePriority(event: any): 'high' | 'medium' | 'low' {
  const text = (
    event.subject +
    ' ' +
    (event.body?.content || '')
  ).toLowerCase();

  if (
    text.includes('ceremony') ||
    text.includes('reception') ||
    text.includes('wedding day')
  ) {
    return 'high';
  }

  const daysUntilEvent = Math.ceil(
    (new Date(event.start.dateTime).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysUntilEvent <= 7) return 'high';
  if (daysUntilEvent <= 30) return 'medium';
  return 'low';
}

/**
 * Trigger event automation
 */
async function triggerEventAutomation(
  action: 'created' | 'updated' | 'deleted',
  userId: string,
  event: any,
  weddingMapping: any,
): Promise<void> {
  // Check for automation rules
  const { data: rules } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('trigger_type', `calendar_${action}`)
    .eq('is_active', true);

  for (const rule of rules || []) {
    try {
      // Execute automation rule
      console.log('Automation rule triggered:', {
        ruleId: rule.id,
        eventType: weddingMapping.eventType,
        isWeddingDay: weddingMapping.isWeddingDay,
        eventDate: weddingMapping.eventDate,
      });

      // TODO: Integrate with WedSync automation engine
      // This would trigger various actions like:
      // - Send follow-up emails
      // - Create tasks
      // - Notify team members
      // - Update client status
    } catch (error) {
      console.error('Automation rule execution failed:', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Update last sync time
 */
async function updateLastSyncTime(userId: string): Promise<void> {
  await supabase
    .from('integration_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('integration_type', 'microsoft-outlook');
}

/**
 * Log webhook activity
 */
async function logWebhookActivity(
  userId: string,
  activity: string,
  data: any,
): Promise<void> {
  await supabase.from('integration_sync_logs').insert({
    user_id: userId,
    integration_type: 'microsoft-outlook',
    activity,
    activity_data: data,
    status: activity.includes('error') ? 'error' : 'success',
    created_at: new Date().toISOString(),
  });
}
