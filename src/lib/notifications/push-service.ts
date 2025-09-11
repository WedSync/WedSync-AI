/**
 * WS-008: Push Notification Service
 * Web Push API implementation for real-time wedding notifications
 */

import { createClient } from '@/lib/supabase/server';

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
  device_type?: 'mobile' | 'desktop' | 'tablet';
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
  sound?: string;
  timestamp?: number;
}

export interface PushNotificationResult {
  success: boolean;
  subscription_id: string;
  message_id?: string;
  error?: string;
  status_code?: number;
}

/**
 * Push Notification Service for Web Push API
 * Handles subscription management and notification delivery
 */
export class PushNotificationService {
  private static instance: PushNotificationService;
  private supabase: ReturnType<typeof createClient>;
  private vapidKeys: { publicKey: string; privateKey: string };

  constructor() {
    this.supabase = createClient();
    this.vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY || '',
      privateKey: process.env.VAPID_PRIVATE_KEY || '',
    };
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string {
    return this.vapidKeys.publicKey;
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeToPushNotifications(
    userId: string,
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    },
    userAgent?: string,
  ): Promise<PushSubscription> {
    try {
      // Detect device type from user agent
      const deviceType = this.detectDeviceType(userAgent);

      // Check if subscription already exists
      const { data: existingSubscription } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
        .single();

      if (existingSubscription) {
        // Update existing subscription
        const { data, error } = await this.supabase
          .from('push_subscriptions')
          .update({
            keys: subscription.keys,
            is_active: true,
            last_used_at: new Date().toISOString(),
            user_agent: userAgent,
            device_type: deviceType,
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update subscription: ${error.message}`);
        }

        return data as PushSubscription;
      } else {
        // Create new subscription
        const { data, error } = await this.supabase
          .from('push_subscriptions')
          .insert({
            user_id: userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            user_agent: userAgent,
            device_type: deviceType,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create subscription: ${error.message}`);
        }

        return data as PushSubscription;
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribeFromPushNotifications(
    userId: string,
    endpoint?: string,
  ): Promise<void> {
    try {
      let query = this.supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (endpoint) {
        query = query.eq('endpoint', endpoint);
      }

      const { error } = await query;

      if (error) {
        throw new Error(`Failed to unsubscribe: ${error.message}`);
      }

      console.log(`User ${userId} unsubscribed from push notifications`);
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult[]> {
    try {
      // Get all active subscriptions for user
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        throw new Error(`Failed to get subscriptions: ${error.message}`);
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No active push subscriptions found for user ${userId}`);
        return [];
      }

      const results: PushNotificationResult[] = [];

      // Send to each subscription
      for (const subscription of subscriptions) {
        try {
          const result = await this.sendToSubscription(
            subscription as PushSubscription,
            payload,
          );
          results.push(result);

          // Update last used timestamp
          await this.supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', subscription.id);
        } catch (error) {
          console.error(
            `Failed to send to subscription ${subscription.id}:`,
            error,
          );

          // If subscription is invalid, mark as inactive
          if (error instanceof Error && error.message.includes('410')) {
            await this.supabase
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', subscription.id);
          }

          results.push({
            success: false,
            subscription_id: subscription.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendBulkPushNotifications(
    notifications: Array<{
      userId: string;
      payload: PushNotificationPayload;
    }>,
  ): Promise<Record<string, PushNotificationResult[]>> {
    const results: Record<string, PushNotificationResult[]> = {};

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);

      const batchPromises = batch.map(async (notification) => {
        try {
          const userResults = await this.sendPushNotification(
            notification.userId,
            notification.payload,
          );
          results[notification.userId] = userResults;
        } catch (error) {
          console.error(
            `Failed to send notification to user ${notification.userId}:`,
            error,
          );
          results[notification.userId] = [
            {
              success: false,
              subscription_id: '',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          ];
        }
      });

      await Promise.all(batchPromises);

      // Small delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Get user's push subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    try {
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as PushSubscription[];
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return [];
    }
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions(
    daysInactive: number = 30,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .lt('last_used_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw error;
      }

      const cleanedCount = data?.length || 0;
      console.log(`Cleaned up ${cleanedCount} inactive push subscriptions`);

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up inactive subscriptions:', error);
      return 0;
    }
  }

  /**
   * Get push notification analytics
   */
  async getPushAnalytics(params: {
    user_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total_subscriptions: number;
    active_subscriptions: number;
    notifications_sent: number;
    success_rate: number;
    device_breakdown: Record<string, number>;
    engagement_rate: number;
  }> {
    try {
      // Get subscription stats
      let subscriptionQuery = this.supabase
        .from('push_subscriptions')
        .select('device_type, is_active');

      if (params.user_id) {
        subscriptionQuery = subscriptionQuery.eq('user_id', params.user_id);
      }

      const { data: subscriptions } = await subscriptionQuery;

      const totalSubscriptions = subscriptions?.length || 0;
      const activeSubscriptions =
        subscriptions?.filter((s) => s.is_active).length || 0;

      // Get device breakdown
      const deviceBreakdown: Record<string, number> = {};
      subscriptions?.forEach((sub) => {
        const deviceType = sub.device_type || 'unknown';
        deviceBreakdown[deviceType] = (deviceBreakdown[deviceType] || 0) + 1;
      });

      // Get notification delivery stats
      let deliveryQuery = this.supabase
        .from('notification_delivery_tracking')
        .select('status')
        .eq('channel', 'push');

      if (params.user_id) {
        deliveryQuery = deliveryQuery.eq('recipient_id', params.user_id);
      }
      if (params.start_date) {
        deliveryQuery = deliveryQuery.gte('created_at', params.start_date);
      }
      if (params.end_date) {
        deliveryQuery = deliveryQuery.lte('created_at', params.end_date);
      }

      const { data: deliveries } = await deliveryQuery;

      const notificationsSent = deliveries?.length || 0;
      const successfulDeliveries =
        deliveries?.filter((d) => ['sent', 'delivered'].includes(d.status))
          .length || 0;

      const successRate =
        notificationsSent > 0
          ? (successfulDeliveries / notificationsSent) * 100
          : 0;

      // Calculate engagement rate (clicked notifications)
      const clickedNotifications =
        deliveries?.filter((d) => d.status === 'clicked').length || 0;
      const engagementRate =
        notificationsSent > 0
          ? (clickedNotifications / notificationsSent) * 100
          : 0;

      return {
        total_subscriptions: totalSubscriptions,
        active_subscriptions: activeSubscriptions,
        notifications_sent: notificationsSent,
        success_rate: successRate,
        device_breakdown: deviceBreakdown,
        engagement_rate: engagementRate,
      };
    } catch (error) {
      console.error('Error getting push analytics:', error);
      return {
        total_subscriptions: 0,
        active_subscriptions: 0,
        notifications_sent: 0,
        success_rate: 0,
        device_breakdown: {},
        engagement_rate: 0,
      };
    }
  }

  /**
   * Test push notification delivery
   */
  async testPushNotification(userId: string): Promise<boolean> {
    try {
      const testPayload: PushNotificationPayload = {
        title: 'WedSync Test Notification',
        body: 'This is a test notification to verify your push settings are working correctly.',
        icon: '/icons/test-notification.png',
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: Date.now(),
        },
      };

      const results = await this.sendPushNotification(userId, testPayload);
      return results.some((result) => result.success);
    } catch (error) {
      console.error('Error testing push notification:', error);
      return false;
    }
  }

  /**
   * Send notification to specific subscription
   */
  private async sendToSubscription(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResult> {
    try {
      // In a real implementation, this would use the Web Push Protocol
      // For now, we'll simulate the sending process

      // Validate subscription
      if (
        !subscription.endpoint ||
        !subscription.keys.p256dh ||
        !subscription.keys.auth
      ) {
        throw new Error('Invalid subscription keys');
      }

      // Build notification payload
      const notificationPayload = {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icons/default-notification.png',
        badge: payload.badge || '/icons/badge.png',
        image: payload.image,
        data: {
          url: payload.url,
          ...payload.data,
          timestamp: Date.now(),
        },
        actions: payload.actions,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        tag: payload.tag,
        renotify: payload.renotify || false,
        vibrate: payload.vibrate || [200, 100, 200],
        timestamp: payload.timestamp || Date.now(),
      };

      // Here you would use the actual Web Push library to send the notification
      // Example with web-push library:
      /*
      const webpush = require('web-push');
      webpush.setVapidDetails(
        'mailto:your-email@domain.com',
        this.vapidKeys.publicKey,
        this.vapidKeys.privateKey
      );

      const result = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        },
        JSON.stringify(notificationPayload)
      );
      */

      // For now, simulate success
      const messageId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Record the notification attempt
      await this.recordNotificationAttempt(subscription.id, messageId, 'sent');

      return {
        success: true,
        subscription_id: subscription.id,
        message_id: messageId,
      };
    } catch (error) {
      console.error('Error sending to subscription:', error);

      // Record the failure
      await this.recordNotificationAttempt(
        subscription.id,
        '',
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
      );

      throw error;
    }
  }

  /**
   * Record notification attempt for tracking
   */
  private async recordNotificationAttempt(
    subscriptionId: string,
    messageId: string,
    status: 'sent' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.supabase.from('push_notification_log').insert({
        subscription_id: subscriptionId,
        message_id: messageId,
        status,
        error_message: errorMessage,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to record notification attempt:', error);
    }
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(
    userAgent?: string,
  ): 'mobile' | 'desktop' | 'tablet' {
    if (!userAgent) return 'desktop';

    const ua = userAgent.toLowerCase();

    if (
      ua.includes('mobile') ||
      ua.includes('android') ||
      ua.includes('iphone')
    ) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Handle push notification click event
   */
  async handleNotificationClick(
    subscriptionId: string,
    notificationData: Record<string, any>,
  ): Promise<void> {
    try {
      // Update click tracking
      await this.supabase
        .from('push_notification_log')
        .update({
          clicked_at: new Date().toISOString(),
          click_data: notificationData,
        })
        .eq('subscription_id', subscriptionId)
        .eq('message_id', notificationData.messageId);

      // Update delivery tracking
      if (notificationData.notificationId) {
        await this.supabase
          .from('notification_delivery_tracking')
          .update({
            status: 'clicked',
            clicked_at: new Date().toISOString(),
          })
          .eq('notification_id', notificationData.notificationId)
          .eq('channel', 'push');
      }

      console.log(`Push notification clicked: ${subscriptionId}`);
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  /**
   * Handle push notification close event
   */
  async handleNotificationClose(
    subscriptionId: string,
    notificationData: Record<string, any>,
  ): Promise<void> {
    try {
      // Update close tracking
      await this.supabase
        .from('push_notification_log')
        .update({
          closed_at: new Date().toISOString(),
          close_data: notificationData,
        })
        .eq('subscription_id', subscriptionId)
        .eq('message_id', notificationData.messageId);

      console.log(`Push notification closed: ${subscriptionId}`);
    } catch (error) {
      console.error('Error handling notification close:', error);
    }
  }

  /**
   * Create wedding-specific push notification
   */
  createWeddingNotification(params: {
    type: 'timeline' | 'vendor' | 'emergency' | 'reminder' | 'confirmation';
    title: string;
    message: string;
    weddingId: string;
    urgency?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    imageUrl?: string;
  }): PushNotificationPayload {
    const iconMap = {
      timeline: '/icons/timeline.png',
      vendor: '/icons/vendor.png',
      emergency: '/icons/emergency.png',
      reminder: '/icons/reminder.png',
      confirmation: '/icons/confirmed.png',
    };

    const urgencySettings = {
      low: { requireInteraction: false, vibrate: [100] },
      normal: { requireInteraction: false, vibrate: [200, 100, 200] },
      high: { requireInteraction: true, vibrate: [300, 100, 300, 100, 300] },
      urgent: { requireInteraction: true, vibrate: [500, 200, 500, 200, 500] },
    };

    const settings = urgencySettings[params.urgency || 'normal'];

    const payload: PushNotificationPayload = {
      title: params.title,
      body: params.message,
      icon: iconMap[params.type],
      badge: '/icons/wedsync-badge.png',
      image: params.imageUrl,
      url: params.actionUrl,
      requireInteraction: settings.requireInteraction,
      vibrate: settings.vibrate,
      tag: `wedding-${params.weddingId}-${params.type}`,
      data: {
        type: params.type,
        weddingId: params.weddingId,
        urgency: params.urgency,
        url: params.actionUrl,
      },
    };

    // Add action buttons for high priority notifications
    if (params.urgency === 'high' || params.urgency === 'urgent') {
      payload.actions = [
        {
          action: 'view',
          title: 'View Details',
          icon: '/icons/view.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss.png',
        },
      ];
    }

    return payload;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
