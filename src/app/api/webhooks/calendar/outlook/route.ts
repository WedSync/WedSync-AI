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

interface OutlookWebhookNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData: {
    id: string;
    '@odata.type': string;
    '@odata.id': string;
  };
  clientState?: string;
  tenantId: string;
}

interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: {
      street: string;
      city: string;
      state: string;
      countryOrRegion: string;
      postalCode: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response:
        | 'none'
        | 'organizer'
        | 'tentativelyAccepted'
        | 'accepted'
        | 'declined';
      time: string;
    };
  }>;
  organizer: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  createdDateTime: string;
  lastModifiedDateTime: string;
  isCancelled: boolean;
}

function validateOutlookWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
}

async function getSubscriptionOwner(
  subscriptionId: string,
): Promise<{ userId: string; organizationId: string } | null> {
  try {
    // In a real implementation, you'd query your subscription table
    // SELECT user_id, organization_id FROM outlook_subscriptions WHERE subscription_id = ?

    // Mock implementation
    return {
      userId: 'user-123',
      organizationId: 'org-456',
    };
  } catch (error) {
    console.error('Failed to lookup subscription owner:', error);
    return null;
  }
}

async function fetchOutlookEventDetails(
  eventId: string,
  accessToken: string,
): Promise<OutlookCalendarEvent | null> {
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        // Event was deleted
        return null;
      }
      throw new Error(`Microsoft Graph API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch Outlook event details:', error);
    throw error;
  }
}

async function processOutlookNotification(
  notification: OutlookWebhookNotification,
  userId: string,
  organizationId: string,
): Promise<void> {
  const conflictService = new ConflictDetectionService(userId, organizationId);
  const notificationService = new NotificationService(userId, organizationId);

  await conflictService.initialize();
  await notificationService.initialize();

  try {
    // Get credentials
    const credentials = await integrationDataManager.getCredentials(
      userId,
      organizationId,
      'microsoft-graph',
    );

    if (!credentials || !credentials.accessToken) {
      throw new IntegrationError(
        'No valid credentials found for Microsoft Graph',
        'MISSING_CREDENTIALS',
        ErrorCategory.AUTHENTICATION,
      );
    }

    // Extract event ID from resource path
    const eventId = notification.resourceData.id;

    if (notification.changeType === 'deleted') {
      // Handle event deletion
      const existingEvents = await integrationDataManager.getEventsByProvider(
        userId,
        organizationId,
        'microsoft-graph',
      );

      const existingEvent = existingEvents.find(
        (e) => e.externalId === eventId,
      );
      if (existingEvent && existingEvent.id) {
        await integrationDataManager.deleteEvent(existingEvent.id);

        await notificationService.sendNotification({
          templateId: 'event_cancelled',
          recipients: [{ id: userId, type: 'user', value: userId }],
          variables: {
            eventTitle: existingEvent.title,
            eventDate: existingEvent.startTime.toLocaleDateString(),
            eventTime: existingEvent.startTime.toLocaleTimeString(),
          },
          priority: 'normal',
        });
      }
    } else {
      // Fetch event details for created/updated events
      const eventDetails = await fetchOutlookEventDetails(
        eventId,
        credentials.accessToken,
      );

      if (eventDetails && !eventDetails.isCancelled) {
        // Convert to our IntegrationEvent format
        const integrationEvent: IntegrationEvent = {
          userId,
          organizationId,
          provider: 'microsoft-graph',
          externalId: eventDetails.id,
          title: eventDetails.subject,
          description: eventDetails.body.content,
          startTime: new Date(eventDetails.start.dateTime),
          endTime: new Date(eventDetails.end.dateTime),
          location: eventDetails.location?.displayName,
          attendees: eventDetails.attendees?.map((a) => a.emailAddress.address),
          syncStatus: 'synced',
          lastSyncAt: new Date(),
        };

        // Store or update the event
        await integrationDataManager.createOrUpdateEvent(integrationEvent);

        // Trigger conflict detection
        await conflictService.checkConflictsForEvent(integrationEvent);

        // Send notification for new high-priority events
        if (
          notification.changeType === 'created' &&
          eventDetails.subject.toLowerCase().includes('urgent')
        ) {
          await notificationService.sendNotification({
            templateId: 'event_created',
            recipients: [{ id: userId, type: 'user', value: userId }],
            variables: {
              eventTitle: eventDetails.subject,
              eventDate: integrationEvent.startTime.toLocaleDateString(),
              eventTime: integrationEvent.startTime.toLocaleTimeString(),
              location: integrationEvent.location || 'No location specified',
            },
            priority: 'normal',
          });
        }
      }
    }

    await integrationDataManager.logAudit(
      userId,
      organizationId,
      'OUTLOOK_WEBHOOK_PROCESSED',
      notification.subscriptionId,
      'webhook',
      {
        changeType: notification.changeType,
        eventId,
        resource: notification.resource,
      },
    );
  } catch (error) {
    console.error(
      `Failed to process Outlook notification for event ${notification.resourceData.id}:`,
      error,
    );

    await integrationDataManager.logAudit(
      userId,
      organizationId,
      'OUTLOOK_WEBHOOK_PROCESSING_FAILED',
      notification.subscriptionId,
      'webhook',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        changeType: notification.changeType,
        eventId: notification.resourceData.id,
      },
    );
  } finally {
    await conflictService.destroy();
    await notificationService.destroy();
  }
}

export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const signature = headersList.get('x-ms-signature');
    const clientState = headersList.get('clientstate');

    let payload: { value: OutlookWebhookNotification[] };

    try {
      payload = await request.json();
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // Validate webhook secret if configured
    const webhookSecret = process.env.OUTLOOK_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const rawPayload = JSON.stringify(payload);
      const isValid = validateOutlookWebhookSignature(
        rawPayload,
        signature,
        webhookSecret,
      );
      if (!isValid) {
        console.error('Invalid Outlook webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }
    }

    // Validate client state if configured
    const expectedClientState = process.env.OUTLOOK_CLIENT_STATE;
    if (expectedClientState && clientState !== expectedClientState) {
      console.error(
        `Invalid client state: expected ${expectedClientState}, got ${clientState}`,
      );
      return NextResponse.json(
        { error: 'Invalid client state' },
        { status: 401 },
      );
    }

    if (!payload.value || !Array.isArray(payload.value)) {
      return NextResponse.json(
        { error: 'Invalid webhook payload structure' },
        { status: 400 },
      );
    }

    console.info(
      `Outlook webhook received with ${payload.value.length} notifications`,
    );

    // Process each notification
    const results = await Promise.allSettled(
      payload.value.map(async (notification) => {
        // Find which user owns this subscription
        const ownerInfo = await getSubscriptionOwner(
          notification.subscriptionId,
        );

        if (!ownerInfo) {
          console.error(
            `No owner found for subscription: ${notification.subscriptionId}`,
          );
          return { error: 'Subscription owner not found' };
        }

        const { userId, organizationId } = ownerInfo;
        await processOutlookNotification(notification, userId, organizationId);

        return { success: true, subscriptionId: notification.subscriptionId };
      }),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.info(
      `Outlook webhook processing complete: ${successful} successful, ${failed} failed`,
    );

    return NextResponse.json({
      message: 'Webhook processed',
      processed: successful,
      failed: failed,
      total: payload.value.length,
    });
  } catch (error) {
    console.error('Outlook webhook processing failed:', error);

    // Return 200 to prevent Microsoft from retrying
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
  const validationToken = searchParams.get('validationToken');

  if (validationToken) {
    // Microsoft Graph webhook subscription validation
    console.info('Outlook webhook validation token received');
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({
    message: 'Microsoft Outlook webhook endpoint is active',
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
        'Content-Type, Authorization, x-ms-signature, clientstate',
    },
  });
}
