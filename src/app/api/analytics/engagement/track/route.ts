import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { engagementScoringService } from '@/lib/analytics/engagement-scoring';
import { z } from 'zod';
import { ratelimit } from '@/lib/rate-limiter';

const trackEventSchema = z.object({
  client_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  event_type: z.enum([
    'email_open',
    'email_click',
    'form_view',
    'form_submit',
    'portal_login',
    'portal_view',
    'document_download',
    'message_sent',
    'call_scheduled',
    'meeting_attended',
    'payment_made',
  ]),
  event_data: z.record(z.any()).optional(),
  session_id: z.string().optional(),
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
});

const batchTrackSchema = z.object({
  events: z.array(trackEventSchema).max(50), // Limit batch size
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.ip || 'unknown';

    // Rate limiting - 100 requests per minute per IP
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit,
          reset: new Date(reset * 1000),
          remaining,
        },
        { status: 429 },
      );
    }

    const supabase = await createClient();

    // For tracking events, we allow both authenticated and unauthenticated requests
    // (for things like email opens, which can't authenticate)
    let user = null;
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch {
      // Continue without auth for tracking events
    }

    // Check if this is a batch request
    if (body.events && Array.isArray(body.events)) {
      const params = batchTrackSchema.parse(body);

      // Process batch events
      const results = [];
      const errors = [];

      for (const eventData of params.events) {
        try {
          await engagementScoringService.trackEvent({
            ...eventData,
            ip_address: eventData.ip_address || ip,
            user_agent:
              eventData.user_agent ||
              request.headers.get('user-agent') ||
              undefined,
          });
          results.push({ success: true, event_type: eventData.event_type });
        } catch (error) {
          errors.push({
            error: error instanceof Error ? error.message : 'Unknown error',
            event_type: eventData.event_type,
          });
        }
      }

      return NextResponse.json({
        success: errors.length === 0,
        processed: results.length,
        errors: errors.length,
        details: { results, errors },
        timestamp: new Date().toISOString(),
      });
    }

    // Single event tracking
    const params = trackEventSchema.parse(body);

    await engagementScoringService.trackEvent({
      ...params,
      ip_address: params.ip_address || ip,
      user_agent:
        params.user_agent || request.headers.get('user-agent') || undefined,
    });

    // Return minimal response for performance
    return NextResponse.json({
      success: true,
      event_type: params.event_type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Engagement tracking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid event data', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to track engagement event' },
      { status: 500 },
    );
  }
}

// GET endpoint for tracking pixels/beacons (e.g., email opens)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract tracking parameters
    const clientId = searchParams.get('client_id');
    const supplierId = searchParams.get('supplier_id');
    const eventType = searchParams.get('event_type') || 'email_open';
    const eventData = searchParams.get('event_data');

    if (!clientId || !supplierId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 },
      );
    }

    const ip = request.ip || 'unknown';

    // Rate limiting for GET requests too
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      // For tracking pixels, we should return a valid response even if rate limited
      // to avoid breaking email layouts
      return new Response(null, { status: 204 });
    }

    // Validate event type
    const validEventTypes = [
      'email_open',
      'email_click',
      'form_view',
      'form_submit',
      'portal_login',
      'portal_view',
      'document_download',
      'message_sent',
      'call_scheduled',
      'meeting_attended',
      'payment_made',
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: 'Invalid event type' },
        { status: 400 },
      );
    }

    // Track the event
    await engagementScoringService.trackEvent({
      client_id: clientId,
      supplier_id: supplierId,
      event_type: eventType as any,
      event_data: eventData ? JSON.parse(eventData) : {},
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    // For tracking pixels (especially email opens), return a 1x1 transparent gif
    if (eventType === 'email_open') {
      // Base64 encoded 1x1 transparent GIF
      const gif = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
        'base64',
      );

      return new Response(gif, {
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Length': gif.length.toString(),
        },
      });
    }

    // For other GET tracking, return JSON response
    return NextResponse.json({
      success: true,
      event_type: eventType,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET engagement tracking error:', error);

    // For tracking pixels, return a valid response even on error
    if (request.headers.get('accept')?.includes('image/')) {
      return new Response(null, { status: 204 });
    }

    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 },
    );
  }
}
