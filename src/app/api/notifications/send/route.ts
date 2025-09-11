/**
 * WS-162/163/164: Notification Send API
 * Server-side Firebase notification sending for mobile features
 */

import { NextRequest, NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface SendNotificationRequest {
  userId: string;
  payload: {
    notification: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      requireInteraction?: boolean;
    };
    data?: Record<string, string>;
    android?: any;
    apns?: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationRequest = await request.json();
    const { userId, payload } = body;

    if (!userId || !payload) {
      return NextResponse.json(
        { error: 'Missing userId or payload' },
        { status: 400 },
      );
    }

    // Get user's device tokens from database
    const { data: userTokens, error: tokenError } = await supabase
      .from('user_device_tokens')
      .select('token, platform, active')
      .eq('user_id', userId)
      .eq('active', true);

    if (tokenError) {
      console.error('[NotificationAPI] Error fetching tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch user tokens' },
        { status: 500 },
      );
    }

    if (!userTokens || userTokens.length === 0) {
      return NextResponse.json(
        { error: 'No active device tokens found for user' },
        { status: 404 },
      );
    }

    const messaging = admin.messaging();
    const results: any[] = [];
    const failedTokens: string[] = [];

    // Send notification to all user's devices
    for (const tokenData of userTokens) {
      try {
        const message: admin.messaging.Message = {
          token: tokenData.token,
          notification: {
            title: payload.notification.title,
            body: payload.notification.body,
            imageUrl: payload.notification.icon,
          },
          data: payload.data || {},
          android: {
            priority: 'high',
            notification: {
              icon: payload.notification.icon || 'default_icon',
              color: '#6366F1',
              sound: 'default',
              channelId: 'wedsync_notifications',
              ...payload.android?.notification,
            },
            ...payload.android,
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: payload.notification.title,
                  body: payload.notification.body,
                },
                badge: 1,
                sound: 'default',
                category: payload.data?.type || 'general',
              },
            },
            ...payload.apns,
          },
          webpush: {
            notification: {
              title: payload.notification.title,
              body: payload.notification.body,
              icon: payload.notification.icon || '/icons/icon-192x192.png',
              badge: payload.notification.badge || '/icons/badge-72x72.png',
              tag: payload.notification.tag || 'general',
              requireInteraction:
                payload.notification.requireInteraction || false,
              vibrate: [200, 100, 200],
              actions: [
                {
                  action: payload.data?.action || 'view',
                  title: 'View',
                },
                {
                  action: 'dismiss',
                  title: 'Dismiss',
                },
              ],
            },
            fcmOptions: {
              link: payload.data?.url || '/',
            },
          },
        };

        const result = await messaging.send(message);
        results.push({
          token: tokenData.token,
          platform: tokenData.platform,
          messageId: result,
          success: true,
        });

        console.log(`[NotificationAPI] Sent to ${tokenData.platform}:`, result);
      } catch (error: any) {
        console.error('[NotificationAPI] Send failed:', error);

        // Check if token is invalid
        if (
          error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(tokenData.token);
        }

        results.push({
          token: tokenData.token,
          platform: tokenData.platform,
          success: false,
          error: error.message,
        });
      }
    }

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      await cleanupInvalidTokens(failedTokens);
    }

    // Log notification activity
    await logNotificationActivity(userId, payload, results);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent to ${successCount} devices, ${failureCount} failed`,
      results: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        details: results,
      },
    });
  } catch (error) {
    console.error('[NotificationAPI] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Batch notification sending for multiple users
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, payload } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid userIds array' },
        { status: 400 },
      );
    }

    const batchResults: any[] = [];

    // Send notifications to each user
    for (const userId of userIds) {
      try {
        const sendRequest = new Request(request.url, {
          method: 'POST',
          headers: request.headers,
          body: JSON.stringify({ userId, payload }),
        });

        const response = await POST(sendRequest);
        const result = await response.json();

        batchResults.push({
          userId,
          success: result.success,
          message: result.message,
          results: result.results,
        });
      } catch (error: any) {
        batchResults.push({
          userId,
          success: false,
          error: error.message,
        });
      }
    }

    const totalSuccess = batchResults.filter((r) => r.success).length;
    const totalFailed = batchResults.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Batch notification completed: ${totalSuccess} users successful, ${totalFailed} failed`,
      results: batchResults,
    });
  } catch (error) {
    console.error('[NotificationAPI] Batch notification error:', error);
    return NextResponse.json(
      { error: 'Batch notification failed' },
      { status: 500 },
    );
  }
}

async function cleanupInvalidTokens(tokens: string[]) {
  try {
    const { error } = await supabase
      .from('user_device_tokens')
      .update({ active: false, deactivated_at: new Date().toISOString() })
      .in('token', tokens);

    if (error) {
      console.error('[NotificationAPI] Token cleanup failed:', error);
    } else {
      console.log(
        `[NotificationAPI] Deactivated ${tokens.length} invalid tokens`,
      );
    }
  } catch (error) {
    console.error('[NotificationAPI] Token cleanup error:', error);
  }
}

async function logNotificationActivity(
  userId: string,
  payload: any,
  results: any[],
) {
  try {
    const logEntry = {
      user_id: userId,
      notification_type: payload.data?.type || 'general',
      title: payload.notification.title,
      body: payload.notification.body,
      devices_targeted: results.length,
      devices_successful: results.filter((r) => r.success).length,
      devices_failed: results.filter((r) => !r.success).length,
      payload_data: payload.data || {},
      results_summary: results,
      sent_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('notification_logs')
      .insert([logEntry]);

    if (error) {
      console.error('[NotificationAPI] Logging failed:', error);
    }
  } catch (error) {
    console.error('[NotificationAPI] Logging error:', error);
  }
}
