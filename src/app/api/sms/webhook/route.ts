import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { smsService } from '@/lib/sms/twilio';

// Verify Twilio webhook signature
function verifyTwilioSignature(
  payload: string,
  signature: string,
  url: string,
): boolean {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.warn('TWILIO_AUTH_TOKEN not configured');
    return true; // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha1', process.env.TWILIO_AUTH_TOKEN)
    .update(url + payload)
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(expectedSignature, 'base64'),
  );
}

// Handle delivery status webhooks
export async function POST(request: NextRequest) {
  try {
    const url = request.url;
    const payload = await request.text();
    const signature = request.headers.get('x-twilio-signature') || '';

    // Verify webhook signature
    if (!verifyTwilioSignature(payload, signature, url)) {
      console.error('Invalid Twilio webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const params = new URLSearchParams(payload);
    const webhookData = Object.fromEntries(params.entries());

    // Handle delivery status updates
    if (webhookData.MessageSid) {
      await smsService.handleWebhook(webhookData);

      // Log delivery issues
      if (['failed', 'undelivered'].includes(webhookData.MessageStatus)) {
        console.warn('SMS delivery issue:', {
          messageId: webhookData.MessageSid,
          to: webhookData.To,
          status: webhookData.MessageStatus,
          errorCode: webhookData.ErrorCode,
          errorMessage: webhookData.ErrorMessage,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SMS webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'sms-webhook',
    timestamp: new Date().toISOString(),
  });
}
