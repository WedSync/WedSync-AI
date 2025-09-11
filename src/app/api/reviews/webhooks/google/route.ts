/**
 * Google Business Profile Webhook Handler
 * WS-047: Review Collection System - Google Business Webhooks
 *
 * Handles Google Business Profile webhook notifications for review updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { webhookManager } from '@/lib/webhooks/webhook-manager';
import { verifyWebhookSignature } from '@/lib/security/webhook-validation';
import { webhookRateLimiter } from '@/lib/security/webhook-validation';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    // Google webhook verification
    if (
      mode === 'subscribe' &&
      token === process.env.GOOGLE_WEBHOOK_VERIFY_TOKEN
    ) {
      console.log('Google webhook subscription verified');
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse('Forbidden', { status: 403 });
  } catch (error) {
    console.error('Google webhook verification error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Rate limiting
    const rateLimitResult = webhookRateLimiter.isAllowed(clientIP);
    if (!rateLimitResult.allowed) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000,
          ).toString(),
        },
      });
    }

    // Get request body
    const body = await request.text();
    const signature = request.headers.get('x-goog-signature');
    const timestamp =
      request.headers.get('x-goog-timestamp') || Date.now().toString();

    if (!signature) {
      console.warn('Google webhook received without signature');
      return new NextResponse('Missing signature', { status: 400 });
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(
      signature,
      timestamp,
      body,
      process.env.GOOGLE_WEBHOOK_SECRET!,
    );

    if (!isValid) {
      console.warn('Google webhook signature verification failed');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      console.error('Failed to parse Google webhook payload:', error);
      return new NextResponse('Invalid JSON payload', { status: 400 });
    }

    // Extract event information
    const eventId = webhookData.name || crypto.randomUUID();
    const eventType = webhookData.eventType || 'notification';

    // Create webhook event
    const webhookEvent = {
      id: eventId,
      source: 'google_business',
      event: eventType,
      timestamp: new Date().toISOString(),
      data: webhookData,
      signature,
      supplierId: extractSupplierIdFromPayload(webhookData),
      resourceId: extractResourceIdFromPayload(webhookData),
    };

    // Process webhook with retry logic
    await webhookManager.processWebhook('google_business', webhookEvent);

    // Log successful processing
    console.log(`Google Business webhook processed successfully: ${eventId}`);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Google webhook processing error:', error);

    // Return appropriate error response
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return new NextResponse('Rate limit exceeded', { status: 429 });
    }

    return new NextResponse('Webhook processing failed', { status: 500 });
  }
}

/**
 * Extract supplier ID from Google webhook payload
 */
function extractSupplierIdFromPayload(payload: any): string | undefined {
  // Google webhooks might include custom metadata or we derive from location
  return (
    payload.supplier_id ||
    payload.metadata?.supplier_id ||
    payload.location?.metadata?.supplier_id
  );
}

/**
 * Extract resource ID (location ID) from Google webhook payload
 */
function extractResourceIdFromPayload(payload: any): string | undefined {
  return payload.location?.name || payload.resourceName || payload.name;
}
