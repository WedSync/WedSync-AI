import { NextRequest, NextResponse } from 'next/server';
import { productManagementIntegration } from '@/lib/integrations/external-systems/ProductManagementIntegration';

/**
 * POST /api/feature-requests/external-systems/webhooks/github
 * Handle webhooks from GitHub for issue updates
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-hub-signature-256') || '';
    const payload = await request.json();

    // Process GitHub webhook
    const success = await productManagementIntegration.processExternalWebhook(
      'github',
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
      message: 'GitHub webhook processed successfully',
    });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
