import { NextRequest, NextResponse } from 'next/server';
import { journeyServiceBridge } from '@/lib/services/journey-service-bridge';
import { headers } from 'next/headers';
import { createHash } from 'crypto';

/**
 * Resend Webhook Handler
 * Processes delivery events from Resend email service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('resend-signature');

    // Verify webhook signature (if configured)
    if (process.env.RESEND_WEBHOOK_SECRET) {
      const expectedSignature = createHash('sha256')
        .update(body + process.env.RESEND_WEBHOOK_SECRET)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid Resend webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }
    }

    const webhookData = JSON.parse(body);
    console.log('Resend webhook received:', webhookData);

    // Process the webhook event
    await journeyServiceBridge.handleServiceWebhook('resend', webhookData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, resend-signature',
    },
  });
}
