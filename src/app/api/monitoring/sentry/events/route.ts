/**
 * Sentry Events API Endpoint
 * Secure endpoint for handling Sentry monitoring events with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  sanitizeMonitoringEvent,
  validateEventSecurity,
} from '@/lib/monitoring/data-sanitizer';
import { enhancedSentry } from '@/lib/monitoring/sentry-enhanced';

// Request validation schema
const SentryEventSchema = z.object({
  eventType: z.enum([
    'error',
    'warning',
    'info',
    'performance',
    'user_feedback',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  message: z.string().min(1).max(5000),
  context: z.record(z.any()).optional(),
  user: z
    .object({
      id: z.string().optional(),
      email: z.string().email().optional(),
      organizationId: z.string().optional(),
      weddingId: z.string().optional(),
    })
    .optional(),
  tags: z.record(z.string()).optional(),
  extra: z.record(z.any()).optional(),
  fingerprint: z.array(z.string()).optional(),
  weddingContext: z
    .object({
      weddingId: z.string().optional(),
      vendorId: z.string().optional(),
      eventType: z
        .enum([
          'ceremony_timeline',
          'vendor_coordination',
          'guest_management',
          'payment_processing',
        ])
        .optional(),
      criticalLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    })
    .optional(),
});

type SentryEventRequest = z.infer<typeof SentryEventSchema>;

/**
 * POST /api/monitoring/sentry/events
 * Handle incoming Sentry monitoring events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = SentryEventSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const eventData: SentryEventRequest = validationResult.data;

    // Additional security validation
    const securityCheck = validateEventSecurity({
      message: eventData.message,
      level: eventData.severity === 'critical' ? 'error' : 'info',
      context: eventData.context,
      tags: eventData.tags,
      user: eventData.user,
      extra: eventData.extra,
    });

    if (!securityCheck.isValid) {
      return NextResponse.json(
        {
          error: 'Security validation failed',
          details: securityCheck.errors,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    // Log warnings if any
    if (securityCheck.warnings.length > 0) {
      console.warn('Sentry event security warnings:', securityCheck.warnings);
    }

    // Sanitize event data
    const sanitizedEvent = sanitizeMonitoringEvent({
      message: eventData.message,
      level: eventData.severity === 'critical' ? 'error' : 'info',
      context: eventData.context,
      tags: eventData.tags,
      user: eventData.user,
      extra: eventData.extra,
    });

    // Process the event based on type
    let eventId: string;

    switch (eventData.eventType) {
      case 'error':
        eventId = await handleErrorEvent(eventData, sanitizedEvent);
        break;

      case 'performance':
        eventId = await handlePerformanceEvent(eventData, sanitizedEvent);
        break;

      case 'user_feedback':
        eventId = await handleUserFeedbackEvent(eventData, sanitizedEvent);
        break;

      default:
        eventId = await handleGenericEvent(eventData, sanitizedEvent);
        break;
    }

    // Response with processing details
    const response = {
      status: 'success',
      eventId,
      eventType: eventData.eventType,
      severity: eventData.severity,
      processingTime: Date.now() - startTime,
      sanitized: sanitizedEvent.sanitized,
      timestamp: new Date().toISOString(),
    };

    // Set security headers
    const responseHeaders = new Headers();
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('X-XSS-Protection', '1; mode=block');

    return NextResponse.json(response, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Sentry events API error:', error);

    // Capture this error in Sentry
    if (enhancedSentry && error instanceof Error) {
      enhancedSentry.captureWeddingError(error, {
        eventType: 'ceremony_timeline',
        criticalLevel: 'high',
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * Handle error events
 */
async function handleErrorEvent(
  eventData: SentryEventRequest,
  sanitized: any,
): Promise<string> {
  const error = new Error(eventData.message);
  error.name = 'MonitoringAPIError';

  const eventId = enhancedSentry.captureWeddingError(error, {
    weddingId: eventData.weddingContext?.weddingId,
    vendorId: eventData.weddingContext?.vendorId,
    eventType: eventData.weddingContext?.eventType || 'guest_management',
    criticalLevel:
      eventData.weddingContext?.criticalLevel || eventData.severity || 'medium',
    timestamp: Date.now(),
  });

  console.log('Error event processed:', {
    eventId,
    severity: eventData.severity,
    sanitized: sanitized.sanitized,
  });

  return eventId;
}

/**
 * Handle performance events
 */
async function handlePerformanceEvent(
  eventData: SentryEventRequest,
  sanitized: any,
): Promise<string> {
  const eventId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Log performance metrics
  console.log('Performance event:', {
    eventId,
    message: eventData.message,
    context: sanitized.context,
    weddingMode: process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true',
  });

  return eventId;
}

/**
 * Handle user feedback events
 */
async function handleUserFeedbackEvent(
  eventData: SentryEventRequest,
  sanitized: any,
): Promise<string> {
  const eventId = `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Log user feedback
  console.log('User feedback event:', {
    eventId,
    message: eventData.message,
    user: sanitized.user,
    severity: eventData.severity,
  });

  return eventId;
}

/**
 * Handle generic monitoring events
 */
async function handleGenericEvent(
  eventData: SentryEventRequest,
  sanitized: any,
): Promise<string> {
  const eventId = `generic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  console.log('Generic monitoring event:', {
    eventId,
    type: eventData.eventType,
    message: eventData.message,
    sanitized: sanitized.sanitized,
  });

  return eventId;
}

/**
 * GET /api/monitoring/sentry/events
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'sentry-events',
    timestamp: new Date().toISOString(),
    weddingDayMode: process.env.NEXT_PUBLIC_WEDDING_DAY_MODE === 'true',
  });
}
