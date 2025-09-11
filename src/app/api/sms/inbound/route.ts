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

// Handle inbound SMS messages (STOP/START keywords)
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

    // Handle inbound SMS (opt-in/opt-out)
    await smsService.handleInboundSMS(webhookData);

    // Log inbound messages for compliance
    console.log('Inbound SMS processed:', {
      from: webhookData.From,
      body: webhookData.Body,
      timestamp: new Date().toISOString(),
    });

    // Return TwiML response (empty for now)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      },
    );
  } catch (error) {
    console.error('Inbound SMS webhook error:', error);
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
    service: 'sms-inbound',
    timestamp: new Date().toISOString(),
  });
}
