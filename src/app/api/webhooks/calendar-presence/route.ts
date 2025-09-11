import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { withSecureValidation } from '@/lib/validation/middleware';
import { validateOAuthToken } from '@/lib/auth/oauth-validator';
import { encryptIntegrationData } from '@/lib/security/encryption';
import {
  calendarSync,
  verifyCalendarWebhookSignature,
  calendarWebhookSchema,
} from '@/lib/integrations/presence/calendar-sync';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import { rateLimit } from '@/lib/security/rate-limiting';

// Rate limiting: 100 calendar events per hour per user
const calendarRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  keyGenerator: (req: NextRequest) => {
    const authHeader = req.headers.get('authorization');
    return authHeader || req.ip || 'anonymous';
  },
  message: 'Too many calendar webhook requests, please try again later',
});

/**
 * POST /api/webhooks/calendar-presence
 * Handle calendar presence webhooks from Google Calendar and Outlook
 */
export const POST = withSecureValidation(
  calendarWebhookSchema,
  async (
    request: NextRequest,
    validatedData: z.infer<typeof calendarWebhookSchema>,
  ) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await calendarRateLimit(request);
      if (rateLimitResult) {
        return rateLimitResult;
      }

      // OAuth token validation for calendar integration
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authorization header required' },
          { status: 401 },
        );
      }

      const token = await validateOAuthToken(authHeader);
      if (!token) {
        return NextResponse.json(
          { error: 'Invalid calendar integration token' },
          { status: 401 },
        );
      }

      // Webhook signature verification
      const isValidSignature = verifyCalendarWebhookSignature(
        validatedData,
        process.env.CALENDAR_WEBHOOK_SECRET!,
      );

      if (!isValidSignature) {
        await logIntegrationError(
          'unknown',
          'invalid_webhook_signature',
          new Error('Calendar webhook signature verification failed'),
        );

        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 403 },
        );
      }

      // Extract user ID from token
      const userId = token.userId;
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID not found in token' },
          { status: 400 },
        );
      }

      // Process the calendar event
      const calendarEvent = {
        id: validatedData.eventId,
        summary: validatedData.summary,
        startTime: new Date(validatedData.startTime),
        endTime: new Date(validatedData.endTime),
        location: validatedData.location,
        attendees: validatedData.attendees || [],
        eventType: 'meeting' as const,
        isAllDay: false,
      };

      // Process calendar event for presence updates
      await calendarSync.processCalendarEvent(calendarEvent, userId);

      // Log successful webhook processing
      await logIntegrationActivity(userId, 'calendar_webhook_processed', {
        eventId: validatedData.eventId,
        eventType: validatedData.eventType,
        summary: validatedData.summary,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Calendar presence webhook processed successfully',
          eventId: validatedData.eventId,
          processed: true,
        },
        { status: 200 },
      );
    } catch (error) {
      console.error('Calendar presence webhook processing failed:', error);

      await logIntegrationError(
        'unknown',
        'calendar_webhook_processing_failed',
        error,
      );

      return NextResponse.json(
        {
          error: 'Webhook processing failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * GET /api/webhooks/calendar-presence
 * Handle calendar webhook verification (for Google Calendar)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');
    const mode = searchParams.get('hub.mode');

    // Google Calendar webhook verification
    if (mode === 'subscribe' && challenge && verifyToken) {
      const expectedToken = process.env.CALENDAR_WEBHOOK_VERIFY_TOKEN;

      if (verifyToken === expectedToken) {
        console.log('Calendar webhook verification successful');

        return NextResponse.json(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      } else {
        console.error('Calendar webhook verification failed: invalid token');
        return NextResponse.json('Forbidden', { status: 403 });
      }
    }

    // For health checks or general info
    return NextResponse.json(
      {
        service: 'Calendar Presence Webhook',
        status: 'active',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Calendar webhook GET request failed:', error);

    return NextResponse.json(
      {
        error: 'Webhook verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/webhooks/calendar-presence
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    },
  );
}

// Webhook validation helper for Google Calendar notifications
export async function validateGoogleCalendarWebhook(
  request: NextRequest,
): Promise<boolean> {
  try {
    const channelId = request.headers.get('x-goog-channel-id');
    const channelToken = request.headers.get('x-goog-channel-token');
    const resourceId = request.headers.get('x-goog-resource-id');
    const resourceState = request.headers.get('x-goog-resource-state');

    // Basic validation for Google Calendar webhook headers
    if (!channelId || !resourceId || !resourceState) {
      console.error('Missing required Google Calendar webhook headers');
      return false;
    }

    // Validate channel token if provided
    if (
      channelToken &&
      channelToken !== process.env.CALENDAR_WEBHOOK_VERIFY_TOKEN
    ) {
      console.error('Invalid Google Calendar webhook token');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Google Calendar webhook validation failed:', error);
    return false;
  }
}

// Webhook validation helper for Outlook Calendar notifications
export async function validateOutlookCalendarWebhook(
  request: NextRequest,
): Promise<boolean> {
  try {
    const validationToken = request.headers.get('validationToken');

    // Handle Outlook webhook validation
    if (validationToken) {
      // This is a validation request from Microsoft Graph
      return true;
    }

    // For regular webhook notifications, validate client state
    const clientState = request.headers.get('clientState');
    const expectedState = process.env.OUTLOOK_WEBHOOK_CLIENT_STATE;

    if (clientState && expectedState && clientState !== expectedState) {
      console.error('Invalid Outlook webhook client state');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Outlook Calendar webhook validation failed:', error);
    return false;
  }
}
