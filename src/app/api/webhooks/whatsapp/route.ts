import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppService, WhatsAppService } from '@/lib/whatsapp/service';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Webhook verification for WhatsApp Business API
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('WhatsApp webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('Failed to verify WhatsApp webhook');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify webhook signature
    if (signature) {
      const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!;
      const isValid = WhatsAppService.verifyWebhookSignature(
        body,
        signature,
        verifyToken,
      );

      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 },
        );
      }
    }

    const webhookData = JSON.parse(body);

    // Log webhook for debugging
    console.log(
      'WhatsApp webhook received:',
      JSON.stringify(webhookData, null, 2),
    );

    const whatsAppService = createWhatsAppService();
    const result = await whatsAppService.processWebhook(webhookData);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      console.error('Webhook processing error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
