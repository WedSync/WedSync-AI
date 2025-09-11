import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { integrationDataManager } from '@/lib/database/IntegrationDataManager';
import { ConflictDetectionService } from '@/lib/integrations/ConflictDetectionService';
import { NotificationService } from '@/lib/integrations/NotificationService';
import crypto from 'crypto';
import {
  IntegrationEvent,
  IntegrationError,
  ErrorCategory,
} from '@/types/integrations';

interface GoogleCalendarWebhookPayload {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  token?: string;
  expiration: string;
}

interface GoogleCalendarEventData {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  creator: {
    email: string;
    displayName?: string;
  };
  organizer: {
    email: string;
    displayName?: string;
  };
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

// Webhook security validation
function validateGoogleWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const actualSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(actualSignature),
  );
}

async function getOrganizationFromResourceId(
  resourceId: string,
): Promise<{ userId: string; organizationId: string } | null> {
  // This would typically query your database to find which user/organization
  // owns this calendar resource ID. For now, simulate lookup
  try {
    // In a real implementation, you'd have a table mapping resource IDs to users
    // SELECT user_id, organization_id FROM calendar_subscriptions WHERE resource_id = ?

    // For demonstration, return a mock result
    return {
      userId: 'user-123',
      organizationId: 'org-456',
    };
  } catch (error) {
    console.error('Failed to lookup organization from resource ID:', error);
    return null;
  }
}

async function fetchCalendarEventDetails(
  resourceUri: string,
  accessToken: string,
): Promise<GoogleCalendarEventData[]> {
  try {
    const response = await fetch(resourceUri, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Google Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar event details:', error);
    throw error;
  }
}

async function processCalendarEvents(
  events: GoogleCalendarEventData[],
  userId: string,
  organizationId: string,
): Promise<void> {
  const conflictService = new ConflictDetectionService(userId, organizationId);
  const notificationService = new NotificationService(userId, organizationId);

  await conflictService.initialize();
  await notificationService.initialize();

  for (const event of events) {
    try {
      // Convert Google Calendar event to our IntegrationEvent format
      const integrationEvent: IntegrationEvent = {
        userId,
        organizationId,
        provider: 'google-calendar',
        externalId: event.id,
        title: event.summary,
        description: event.description,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location,
        attendees: event.attendees?.map((a) => a.email),
        syncStatus: event.status === 'cancelled' ? 'failed' : 'synced',
        syncError: event.status === 'cancelled' ? 'Event cancelled' : undefined,
        lastSyncAt: new Date(),
      };

      // Store or update the event
      if (event.status === 'cancelled') {
        // Handle event deletion
        const existingEvents = await integrationDataManager.getEventsByProvider(
          userId,
          organizationId,
          'google-calendar',
        );

        const existingEvent = existingEvents.find(
          (e) => e.externalId === event.id,
        );
        if (existingEvent && existingEvent.id) {
          await integrationDataManager.deleteEvent(existingEvent.id);

          await notificationService.sendNotification({
            templateId: 'event_cancelled',
            recipients: [{ id: userId, type: 'user', value: userId }],
            variables: {
              eventTitle: event.summary,
              eventDate: integrationEvent.startTime.toLocaleDateString(),
              eventTime: integrationEvent.startTime.toLocaleTimeString(),
            },
            priority: 'high',
          });
        }
      } else {
        // Create or update event
        const eventId =
          await integrationDataManager.createOrUpdateEvent(integrationEvent);

        // Trigger conflict detection for new/updated events
        await conflictService.checkConflictsForEvent(integrationEvent);
      }
    } catch (error) {
      console.error(`Failed to process event ${event.id}:`, error);

      await integrationDataManager.logAudit(
        userId,
        organizationId,
        'WEBHOOK_EVENT_PROCESSING_FAILED',
        event.id,
        'calendar_event',
        {
          eventId: event.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }

  await conflictService.destroy();
  await notificationService.destroy();
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-google-webhook-signature') || '';
    const resourceId = headersList.get('x-goog-resource-id');
    const resourceUri = headersList.get('x-goog-resource-uri');
    const resourceState = headersList.get('x-goog-resource-state'); // sync, exists, not_exists
    const channelId = headersList.get('x-goog-channel-id');
    const channelToken = headersList.get('x-goog-channel-token');
    const messageNumber = headersList.get('x-goog-message-number');

    const rawPayload = await request.text();

    // Log webhook receipt
    console.info('Google Calendar webhook received:', {
      resourceId,
      resourceState,
      channelId,
      messageNumber,
      hasPayload: !!rawPayload,
    });

    // Validate webhook secret (if configured)
    const webhookSecret = process.env.GOOGLE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = validateGoogleWebhookSignature(
        rawPayload,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        console.error('Invalid Google webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }
    }

    // Ignore sync messages (initial subscription confirmation)
    if (resourceState === 'sync') {
      return NextResponse.json({ message: 'Sync acknowledged' });
    }

    if (!resourceId || !resourceUri) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 },
      );
    }

    // Find which user/organization this webhook belongs to
    const ownerInfo = await getOrganizationFromResourceId(resourceId);
    if (!ownerInfo) {
      console.error(`No organization found for resource ID: ${resourceId}`);
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 },
      );
    }

    const { userId, organizationId } = ownerInfo;

    // Get stored credentials to fetch event details
    const credentials = await integrationDataManager.getCredentials(
      userId,
      organizationId,
      'google-calendar',
    );

    if (!credentials || !credentials.accessToken) {
      throw new IntegrationError(
        'No valid credentials found for Google Calendar',
        'MISSING_CREDENTIALS',
        ErrorCategory.AUTHENTICATION,
      );
    }

    // Fetch current calendar events to see what changed
    const events = await fetchCalendarEventDetails(
      resourceUri,
      credentials.accessToken,
    );

    // Process the events
    await processCalendarEvents(events, userId, organizationId);

    // Log successful webhook processing
    await integrationDataManager.logAudit(
      userId,
      organizationId,
      'GOOGLE_WEBHOOK_PROCESSED',
      channelId || resourceId,
      'webhook',
      {
        resourceId,
        resourceState,
        eventsProcessed: events.length,
        messageNumber,
      },
    );

    return NextResponse.json({
      message: 'Webhook processed successfully',
      eventsProcessed: events.length,
    });
  } catch (error) {
    console.error('Google Calendar webhook processing failed:', error);

    // Return 200 to prevent Google from retrying
    // Log error for investigation
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 },
    );
  }
}

// Handle GET requests for webhook verification/health checks
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('hub.challenge');

  if (challenge) {
    // Webhook verification challenge
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    message: 'Google Calendar webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, x-google-webhook-signature',
    },
  });
}
