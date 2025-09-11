/**
 * WS-168: Email Tracking Webhook Handler
 * Tracks email opens, clicks, and engagement for health interventions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { healthInterventionService } from '@/lib/services/health-intervention-service';
import crypto from 'crypto';

// Verify webhook signature from email provider
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-webhook-signature');
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 401 },
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const { type, data } = payload;

    const supabase = await createClient();

    switch (type) {
      case 'email.opened': {
        const { email_id, recipient_email, opened_at, metadata } = data;

        // Update notification tracking
        if (metadata?.notificationId) {
          await healthInterventionService.updateNotificationTracking(
            metadata.notificationId,
            'opened',
            { openedAt: opened_at },
          );

          // Log event for analytics
          await supabase.from('email_tracking_events').insert({
            email_id,
            event_type: 'opened',
            recipient_email,
            notification_id: metadata.notificationId,
            timestamp: opened_at,
            metadata,
          });
        }
        break;
      }

      case 'email.clicked': {
        const { email_id, recipient_email, clicked_at, url, metadata } = data;

        // Update notification tracking
        if (metadata?.notificationId) {
          await healthInterventionService.updateNotificationTracking(
            metadata.notificationId,
            'clicked',
            { clickedAt: clicked_at, clickedUrl: url },
          );

          // Log event for analytics
          await supabase.from('email_tracking_events').insert({
            email_id,
            event_type: 'clicked',
            recipient_email,
            notification_id: metadata.notificationId,
            url,
            timestamp: clicked_at,
            metadata,
          });

          // If it's a CTA click, track conversion
          if (metadata?.trackingId) {
            await trackConversion(
              metadata.notificationId,
              metadata.trackingId,
              url,
            );
          }
        }
        break;
      }

      case 'email.bounced': {
        const { email_id, recipient_email, bounced_at, bounce_type, metadata } =
          data;

        // Update email notification status
        if (metadata?.notificationId) {
          await supabase
            .from('intervention_notifications')
            .update({
              status: 'bounced',
              bounce_type,
              bounced_at,
              updated_at: new Date().toISOString(),
            })
            .eq('id', metadata.notificationId);

          // Log bounce event
          await supabase.from('email_tracking_events').insert({
            email_id,
            event_type: 'bounced',
            recipient_email,
            notification_id: metadata.notificationId,
            bounce_type,
            timestamp: bounced_at,
            metadata,
          });

          // Handle hard bounces - mark email as invalid
          if (bounce_type === 'hard') {
            await handleHardBounce(recipient_email);
          }
        }
        break;
      }

      case 'email.complained': {
        const { email_id, recipient_email, complained_at, metadata } = data;

        // Handle spam complaint
        await handleSpamComplaint(recipient_email);

        // Log complaint event
        await supabase.from('email_tracking_events').insert({
          email_id,
          event_type: 'complained',
          recipient_email,
          notification_id: metadata?.notificationId,
          timestamp: complained_at,
          metadata,
        });
        break;
      }

      case 'email.unsubscribed': {
        const { recipient_email, unsubscribed_at, metadata } = data;

        // Handle unsubscribe
        await handleUnsubscribe(recipient_email, metadata?.organizationId);

        // Log unsubscribe event
        await supabase.from('email_tracking_events').insert({
          event_type: 'unsubscribed',
          recipient_email,
          notification_id: metadata?.notificationId,
          timestamp: unsubscribed_at,
          metadata,
        });
        break;
      }

      default:
        console.log('Unknown webhook event type:', type);
    }

    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing email tracking webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}

// Track CTA conversions
async function trackConversion(
  notificationId: string,
  trackingId: string,
  url: string,
): Promise<void> {
  const supabase = await createClient();

  try {
    // Record conversion event
    await supabase.from('intervention_conversions').insert({
      notification_id: notificationId,
      tracking_id: trackingId,
      conversion_url: url,
      converted_at: new Date().toISOString(),
    });

    // Update notification with conversion
    await supabase
      .from('intervention_notifications')
      .update({
        converted: true,
        converted_at: new Date().toISOString(),
        conversion_tracking_id: trackingId,
      })
      .eq('id', notificationId);

    // Check if this is a success action (e.g., scheduled call, logged in)
    if (trackingId === 'cta_schedule_call' || trackingId === 'cta_dashboard') {
      await markInterventionSuccess(notificationId);
    }
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
}

// Mark intervention as successful
async function markInterventionSuccess(notificationId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Get notification details
    const { data: notification } = await supabase
      .from('intervention_notifications')
      .select('supplier_id, organization_id, risk_level')
      .eq('id', notificationId)
      .single();

    if (!notification) return;

    // Update intervention metrics
    await supabase.from('intervention_success_metrics').insert({
      notification_id: notificationId,
      supplier_id: notification.supplier_id,
      organization_id: notification.organization_id,
      risk_level: notification.risk_level,
      success_type: 'engagement',
      success_at: new Date().toISOString(),
    });

    // Clear cooldown to allow follow-up if needed
    const cacheKey = `health_intervention:last_intervention:${notification.supplier_id}:${notification.risk_level}`;
    // This would clear from Redis cache
  } catch (error) {
    console.error('Error marking intervention success:', error);
  }
}

// Handle hard email bounces
async function handleHardBounce(email: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Mark email as invalid in user profile
    await supabase
      .from('user_profiles')
      .update({
        email_valid: false,
        email_bounce_type: 'hard',
        email_bounced_at: new Date().toISOString(),
      })
      .eq('email', email);

    // Add to suppression list
    await supabase.from('email_suppression_list').insert({
      email,
      reason: 'hard_bounce',
      suppressed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling hard bounce:', error);
  }
}

// Handle spam complaints
async function handleSpamComplaint(email: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Add to suppression list immediately
    await supabase.from('email_suppression_list').insert({
      email,
      reason: 'spam_complaint',
      suppressed_at: new Date().toISOString(),
    });

    // Update user preferences to disable all emails
    await supabase
      .from('user_preferences')
      .update({
        email_notifications: false,
        marketing_emails: false,
        intervention_emails: false,
      })
      .eq('email', email);
  } catch (error) {
    console.error('Error handling spam complaint:', error);
  }
}

// Handle unsubscribes
async function handleUnsubscribe(
  email: string,
  organizationId?: string,
): Promise<void> {
  const supabase = await createClient();

  try {
    // Update user preferences
    await supabase
      .from('user_preferences')
      .update({
        intervention_emails: false,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    // Log unsubscribe
    await supabase.from('unsubscribe_log').insert({
      email,
      organization_id: organizationId,
      unsubscribe_type: 'intervention_emails',
      unsubscribed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error handling unsubscribe:', error);
  }
}

// GET endpoint for tracking pixel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('n');
    const trackingId = searchParams.get('t');

    if (notificationId) {
      // Log email open via tracking pixel
      await healthInterventionService.updateNotificationTracking(
        notificationId,
        'opened',
        { method: 'pixel', trackingId },
      );
    }

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error serving tracking pixel:', error);
    // Still return pixel even on error
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64',
    );
    return new NextResponse(pixel, {
      status: 200,
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
