import { NextRequest, NextResponse } from 'next/server';
import { productManagementIntegration } from '@/lib/integrations/external-systems/ProductManagementIntegration';

/**
 * POST /api/feature-requests/external-systems/webhooks/jira
 * Handle webhooks from Jira for issue updates
 */
export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get('x-atlassian-webhook-identifier') || '';
    const payload = await request.json();

    // Process Jira webhook
    const success = await productManagementIntegration.processExternalWebhook(
      'jira',
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
      message: 'Jira webhook processed successfully',
    });
  } catch (error) {
    console.error('Jira webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
