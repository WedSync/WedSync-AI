import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { z } from 'zod';
import { WebhookReceiver } from '@/lib/integrations/websocket/webhook-receiver';
import { rateLimitService } from '@/lib/rate-limit';

const webhookEventSchema = z.object({
  id: z.string(),
  vendor: z.string(),
  eventType: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  signature: z.string().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let webhookReceiver: WebhookReceiver | null = null;

function getWebhookReceiver(): WebhookReceiver {
  if (!webhookReceiver) {
    webhookReceiver = new WebhookReceiver(supabaseUrl, supabaseKey);
  }
  return webhookReceiver;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let requestBody: unknown;
  let vendorName = 'unknown';

  try {
    // Rate limiting: 1000 webhooks per hour per IP
    const clientIp =
      request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await rateLimitService.checkLimit(
      `webhook:${clientIp}`,
      1000, // 1000 requests
      60 * 60 * 1000, // per hour
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // Parse request body
    requestBody = await request.json();
    if (!requestBody || typeof requestBody !== 'object') {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 },
      );
    }

    // Extract vendor name from various possible locations
    vendorName = extractVendorName(request, requestBody);
    if (!vendorName || vendorName === 'unknown') {
      return NextResponse.json(
        { error: 'Vendor identification required' },
        { status: 400 },
      );
    }

    // Validate webhook signature if present
    const signature = extractSignature(request, requestBody);
    if (signature) {
      const isValidSignature = await validateWebhookSignature(
        requestBody,
        signature,
        vendorName,
      );

      if (!isValidSignature) {
        await logWebhookAttempt(
          vendorName,
          requestBody,
          false,
          'Invalid signature',
        );
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 },
        );
      }
    }

    // Validate and parse the webhook event
    const validatedEvent = webhookEventSchema.parse({
      ...requestBody,
      vendor: vendorName,
      signature: signature || undefined,
    });

    // Log incoming webhook
    await logWebhookAttempt(vendorName, validatedEvent, true);

    // Process the webhook through the receiver
    const receiver = getWebhookReceiver();
    await receiver.receiveVendorWebhook(vendorName, validatedEvent);

    const processingTime = Date.now() - startTime;

    // Log successful processing
    await logWebhookProcessing(validatedEvent.id, true, processingTime);

    return NextResponse.json(
      {
        success: true,
        eventId: validatedEvent.id,
        vendor: vendorName,
        processingTime,
      },
      { status: 200 },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(`Webhook processing error for ${vendorName}:`, error);

    // Log failed processing
    if (requestBody && typeof requestBody === 'object' && 'id' in requestBody) {
      await logWebhookProcessing(
        String(requestBody.id),
        false,
        processingTime,
        errorMessage,
      );
    }

    // Return appropriate error response
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid webhook payload',
          details: error.errors,
          vendor: vendorName,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
        vendor: vendorName,
      },
      { status: 500 },
    );
  }
}

function extractVendorName(request: NextRequest, payload: unknown): string {
  // Try to get vendor from URL path
  const pathSegments = request.nextUrl.pathname.split('/');
  const vendorIndex =
    pathSegments.findIndex((segment) => segment === 'webhooks') + 2;
  if (vendorIndex < pathSegments.length) {
    const vendorFromPath = pathSegments[vendorIndex];
    if (vendorFromPath && vendorFromPath !== 'channel-events') {
      return vendorFromPath;
    }
  }

  // Try to get vendor from query parameter
  const vendorFromQuery = request.nextUrl.searchParams.get('vendor');
  if (vendorFromQuery) {
    return vendorFromQuery;
  }

  // Try to get vendor from headers
  const vendorFromHeader =
    request.headers.get('x-vendor-name') ||
    request.headers.get('x-webhook-source');
  if (vendorFromHeader) {
    return vendorFromHeader;
  }

  // Try to get vendor from payload
  if (payload && typeof payload === 'object') {
    const vendorFromPayload =
      (payload as any).vendor ||
      (payload as any).source ||
      (payload as any).provider;
    if (vendorFromPayload) {
      return String(vendorFromPayload);
    }
  }

  // Try to infer vendor from User-Agent
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('Tave')) return 'tave';
  if (userAgent.includes('HoneyBook')) return 'honeybook';
  if (userAgent.includes('StudioCloud')) return 'studiocloud';
  if (userAgent.includes('VenueMaster')) return 'venuemaster';

  return 'unknown';
}

function extractSignature(
  request: NextRequest,
  payload: unknown,
): string | null {
  // Common signature header names
  const signatureHeaders = [
    'x-hub-signature-256',
    'x-hub-signature',
    'x-signature',
    'x-webhook-signature',
    'authorization',
    'x-tave-signature',
    'x-honeybook-signature',
  ];

  for (const headerName of signatureHeaders) {
    const signature = request.headers.get(headerName);
    if (signature) {
      return signature;
    }
  }

  // Try to get signature from payload
  if (payload && typeof payload === 'object' && 'signature' in payload) {
    return String((payload as any).signature);
  }

  return null;
}

async function validateWebhookSignature(
  payload: unknown,
  signature: string,
  vendor: string,
): Promise<boolean> {
  try {
    // Get webhook secret from environment or database
    const webhookSecret = await getWebhookSecret(vendor);
    if (!webhookSecret) {
      console.warn(`No webhook secret found for vendor: ${vendor}`);
      return true; // Allow if no secret configured (for development)
    }

    // Remove common prefixes from signature
    const cleanSignature = signature
      .replace('sha256=', '')
      .replace('sha1=', '')
      .replace('Bearer ', '');

    // Generate expected signature
    const payloadString = JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(payloadString)
      .digest('hex');

    // Timing-safe comparison
    return timingSafeEquals(cleanSignature, expectedSignature);
  } catch (error) {
    console.error(`Signature validation error for ${vendor}:`, error);
    return false;
  }
}

async function getWebhookSecret(vendor: string): Promise<string | null> {
  // This would typically come from environment variables or database
  const envKey = `WEBHOOK_SECRET_${vendor.toUpperCase()}`;
  const secret = process.env[envKey];

  if (secret) {
    return secret;
  }

  // Fallback to generic webhook secret
  return process.env.WEBHOOK_SECRET || null;
}

function timingSafeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

async function logWebhookAttempt(
  vendor: string,
  payload: unknown,
  success: boolean,
  error?: string,
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('webhook_attempts').insert({
      vendor_name: vendor,
      payload: payload,
      success: success,
      error_message: error,
      ip_address: 'hidden', // Privacy consideration
      user_agent: 'hidden', // Privacy consideration
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook attempt:', error);
  }
}

async function logWebhookProcessing(
  eventId: string,
  success: boolean,
  processingTime: number,
  error?: string,
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('webhook_processing_logs').insert({
      event_id: eventId,
      processing_success: success,
      processing_time_ms: processingTime,
      error_message: error,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook processing:', error);
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'webhook-receiver',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
