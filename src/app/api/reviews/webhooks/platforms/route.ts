import { NextRequest, NextResponse } from 'next/server';
import { createSecureRoute, SecurityPresets } from '@/lib/middleware/security';
import { auditLogger } from '@/lib/middleware/audit';
import { PlatformIntegrations } from '@/lib/reviews/platform-integrations';
import { platformWebhookSchema } from '@/lib/validations/review-schemas';
import crypto from 'crypto';

/**
 * POST /api/reviews/webhooks/platforms - Handle platform webhooks
 */
export const POST = createSecureRoute(
  {
    ...SecurityPresets.WEBHOOK,
    validateBody: platformWebhookSchema,
  },
  async (req, context) => {
    const platformIntegrations = new PlatformIntegrations();
    const webhookData = (req as any).validatedData.body;
    const signature = req.headers.get('x-webhook-signature');
    const platform =
      req.headers.get('x-platform-source') || webhookData.platform;

    try {
      // Verify webhook signature for security
      if (platform && signature) {
        const isValidSignature = await verifyWebhookSignature(
          platform,
          JSON.stringify(webhookData),
          signature,
        );

        if (!isValidSignature) {
          await auditLogger.logSecurityEvent(
            'suspicious_activity',
            req.ip,
            req.headers.get('user-agent') || undefined,
            undefined,
            {
              event: 'invalid_webhook_signature',
              platform,
              endpoint: '/api/reviews/webhooks/platforms',
            },
          );

          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 },
          );
        }
      }

      // Process webhook based on platform
      let result;
      switch (platform?.toLowerCase()) {
        case 'google':
          result = await platformIntegrations.processGoogleWebhook(webhookData);
          break;
        case 'facebook':
          result =
            await platformIntegrations.processFacebookWebhook(webhookData);
          break;
        case 'yelp':
          result = await platformIntegrations.processYelpWebhook(webhookData);
          break;
        default:
          return NextResponse.json(
            { error: 'Unsupported platform' },
            { status: 400 },
          );
      }

      // Log successful webhook processing
      await auditLogger.logPlatformEvent(
        'sync_completed',
        platform,
        result.supplierId || 'unknown',
        'system',
        {
          webhook_id: webhookData.id,
          events_processed: result.eventsProcessed || 1,
          reviews_synced: result.reviewsSynced || 0,
        },
      );

      return NextResponse.json({
        status: 'processed',
        platform,
        events_processed: result.eventsProcessed || 1,
        reviews_synced: result.reviewsSynced || 0,
        message: 'Webhook processed successfully',
      });
    } catch (error) {
      console.error('Webhook processing failed:', error);

      // Log failed webhook processing
      await auditLogger.logPlatformEvent(
        'sync_failed',
        platform || 'unknown',
        'unknown',
        'system',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          webhook_data: webhookData,
        },
      );

      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: 500 },
      );
    }
  },
);

/**
 * Verify webhook signature for security
 */
async function verifyWebhookSignature(
  platform: string,
  payload: string,
  signature: string,
): Promise<boolean> {
  try {
    const secret = getWebhookSecret(platform);
    if (!secret) return false;

    // Different platforms use different signature formats
    switch (platform.toLowerCase()) {
      case 'google':
        // Google uses HMAC-SHA256
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload, 'utf8')
          .digest('hex');
        return signature === `sha256=${expectedSignature}`;

      case 'facebook':
        // Facebook uses HMAC-SHA1
        const expectedFbSignature = crypto
          .createHmac('sha1', secret)
          .update(payload, 'utf8')
          .digest('hex');
        return signature === `sha1=${expectedFbSignature}`;

      case 'yelp':
        // Yelp uses HMAC-SHA256
        const expectedYelpSignature = crypto
          .createHmac('sha256', secret)
          .update(payload, 'utf8')
          .digest('base64');
        return signature === expectedYelpSignature;

      default:
        return false;
    }
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Get webhook secret for platform
 */
function getWebhookSecret(platform: string): string | null {
  switch (platform.toLowerCase()) {
    case 'google':
      return process.env.GOOGLE_WEBHOOK_SECRET || null;
    case 'facebook':
      return process.env.FACEBOOK_WEBHOOK_SECRET || null;
    case 'yelp':
      return process.env.YELP_WEBHOOK_SECRET || null;
    default:
      return null;
  }
}
