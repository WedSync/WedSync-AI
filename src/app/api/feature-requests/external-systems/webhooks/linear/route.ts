import { NextRequest, NextResponse } from 'next/server';
import { productManagementIntegration } from '@/lib/integrations/external-systems/ProductManagementIntegration';

/**
 * POST /api/feature-requests/external-systems/webhooks/linear
 * Handle webhooks from Linear for issue updates
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('linear-signature') || '';
    const payload = await request.json();

    // Process Linear webhook
    const success = await productManagementIntegration.processExternalWebhook(
      'linear',
      payload,
      signature,
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Linear webhook processed successfully',
    });
  } catch (error) {
    console.error('Linear webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
