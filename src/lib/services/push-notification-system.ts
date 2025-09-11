/**
 * WS-155: Push Notification System
 * Delivery status and reminder notifications for mobile messaging
 */

import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';

// Notification types
enum NotificationType {
  MESSAGE_DELIVERED = 'MESSAGE_DELIVERED',
  MESSAGE_READ = 'MESSAGE_READ',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
  RSVP_REMINDER = 'RSVP_REMINDER',
  EVENT_REMINDER = 'EVENT_REMINDER',
  NEW_MESSAGE = 'NEW_MESSAGE',
  GUEST_RESPONSE = 'GUEST_RESPONSE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}

// Notification priority levels
enum NotificationPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 8,
  URGENT = 10,
}

// Push notification payload
interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
}

// Notification action
interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Notification subscription
interface NotificationSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo?: {
    platform: string;
    browser: string;
    version: string;
  };
}

// Notification schedule
interface NotificationSchedule {
  id?: string;
  userId: string;
  type: NotificationType;
  payload: PushNotificationPayload;
  scheduledFor: Date;
  priority: NotificationPriority;
  retryCount?: number;
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export class PushNotificationSystem {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  private vapidPublicKey: string;
  private notificationQueue: NotificationSchedule[] = [];
  private processingQueue = false;

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
    this.initialize();
  }

  /**
   * Initialize push notification system
   */
  private async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker
        this.serviceWorkerRegistration =
          await navigator.serviceWorker.register('/sw.js');

        // Check notification permission
        await this.checkAndRequestPermission();

        // Subscribe to push notifications
        await this.subscribeToPush();

        // Setup message listeners
        this.setupMessageListeners();

        // Process any pending notifications
        this.processNotificationQueue();
      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
      }
    }
  }

  /**
   * Check and request notification permission
   */
  private async checkAndRequestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }

    try {
      // Get existing subscription or create new one
      let subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = this.urlBase64ToUint8Array(
          this.vapidPublicKey,
        );

        subscription =
          await this.serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey,
          });
      }

      this.pushSubscription = subscription;

      // Save subscription to server
      await this.saveSubscription(subscription);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Save push subscription to server
   */
  private async saveSubscription(
    subscription: PushSubscription,
  ): Promise<void> {
    const subscriptionData = subscription.toJSON();

    if (!subscriptionData.keys) {
      throw new Error('Invalid subscription keys');
    }

    const deviceInfo = this.getDeviceInfo();

    try {
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: await this.getCurrentUserId(),
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
          device_info: deviceInfo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        },
      );
    } catch (error) {
      console.error('Failed to save push subscription:', error);
    }
  }

  /**
   * Setup message listeners for push events
   */
  private setupMessageListeners() {
    if (!navigator.serviceWorker) return;

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type) {
        this.handleServiceWorkerMessage(event.data);
      }
    });

    // Listen for notification clicks
    self.addEventListener('notificationclick', (event: any) => {
      event.notification.close();
      this.handleNotificationClick(event);
    });
  }

  /**
   * Handle service worker messages
   */
  private handleServiceWorkerMessage(data: any) {
    switch (data.type) {
      case 'NOTIFICATION_CLICKED':
        this.trackNotificationInteraction(data.notificationId, 'clicked');
        break;

      case 'NOTIFICATION_CLOSED':
        this.trackNotificationInteraction(data.notificationId, 'closed');
        break;

      case 'ACTION_CLICKED':
        this.handleActionClick(data.action, data.notificationId);
        break;

      default:
        console.log('Unknown service worker message:', data);
    }
  }

  /**
   * Send push notification
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    payload: PushNotificationPayload,
    options?: {
      priority?: NotificationPriority;
      schedule?: Date;
      silent?: boolean;
    },
  ): Promise<void> {
    // Check if should be scheduled
    if (options?.schedule && options.schedule > new Date()) {
      await this.scheduleNotification(
        userId,
        type,
        payload,
        options.schedule,
        options.priority,
      );
      return;
    }

    // Get user's push subscriptions
    const subscriptions = await this.getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
      console.warn(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Prepare notification payload
    const notification = this.prepareNotificationPayload(
      type,
      payload,
      options,
    );

    // Send to all user's devices
    const sendPromises = subscriptions.map((sub) =>
      this.sendPushToEndpoint(sub, notification),
    );

    await Promise.allSettled(sendPromises);

    // Track notification
    await this.trackNotification(userId, type, notification);
  }

  /**
   * Prepare notification payload
   */
  private prepareNotificationPayload(
    type: NotificationType,
    payload: PushNotificationPayload,
    options?: any,
  ): PushNotificationPayload {
    const notification: PushNotificationPayload = {
      ...payload,
      tag: payload.tag || type,
      timestamp: Date.now(),
      data: {
        ...payload.data,
        type,
        notificationId: this.generateNotificationId(),
      },
    };

    // Add default vibration pattern
    if (!notification.vibrate && !options?.silent) {
      notification.vibrate = [200, 100, 200];
    }

    // Add default icon
    if (!notification.icon) {
      notification.icon = '/icons/notification-icon.png';
    }

    // Add default badge
    if (!notification.badge) {
      notification.badge = '/icons/badge-icon.png';
    }

    // Add actions based on type
    if (!notification.actions) {
      notification.actions = this.getDefaultActions(type);
    }

    return notification;
  }

  /**
   * Get default actions for notification type
   */
  private getDefaultActions(type: NotificationType): NotificationAction[] {
    switch (type) {
      case NotificationType.NEW_MESSAGE:
        return [
          { action: 'reply', title: 'Reply' },
          { action: 'view', title: 'View' },
        ];

      case NotificationType.RSVP_REMINDER:
        return [
          { action: 'rsvp', title: 'RSVP Now' },
          { action: 'remind_later', title: 'Remind Later' },
        ];

      case NotificationType.GUEST_RESPONSE:
        return [
          { action: 'view_response', title: 'View Response' },
          { action: 'dismiss', title: 'Dismiss' },
        ];

      default:
        return [
          { action: 'open', title: 'Open' },
          { action: 'dismiss', title: 'Dismiss' },
        ];
    }
  }

  /**
   * Send push to specific endpoint
   */
  private async sendPushToEndpoint(
    subscription: NotificationSubscription,
    payload: PushNotificationPayload,
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
      // Remove invalid subscription
      if ((error as any).statusCode === 410) {
        await this.removeSubscription(subscription.endpoint);
      }
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  private async scheduleNotification(
    userId: string,
    type: NotificationType,
    payload: PushNotificationPayload,
    scheduledFor: Date,
    priority: NotificationPriority = NotificationPriority.NORMAL,
  ): Promise<void> {
    const schedule: NotificationSchedule = {
      userId,
      type,
      payload,
      scheduledFor,
      priority,
      status: 'pending',
    };

    // Save to database
    const { data, error } = await supabase
      .from('scheduled_notifications')
      .insert(schedule)
      .select()
      .single();

    if (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }

    // Add to local queue
    this.notificationQueue.push({ ...schedule, id: data.id });

    // Sort queue by scheduled time
    this.notificationQueue.sort(
      (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime(),
    );
  }

  /**
   * Process notification queue
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.processingQueue) return;

    this.processingQueue = true;

    while (this.notificationQueue.length > 0) {
      const now = new Date();
      const next = this.notificationQueue[0];

      if (next.scheduledFor <= now) {
        // Remove from queue
        this.notificationQueue.shift();

        // Send notification
        try {
          await this.sendNotification(next.userId, next.type, next.payload, {
            priority: next.priority,
          });

          // Mark as sent
          if (next.id) {
            await supabase
              .from('scheduled_notifications')
              .update({ status: 'sent' })
              .eq('id', next.id);
          }
        } catch (error) {
          console.error('Failed to send scheduled notification:', error);

          // Retry logic
          if (next.retryCount && next.retryCount < 3) {
            next.retryCount++;
            next.scheduledFor = new Date(Date.now() + 60000); // Retry after 1 minute
            this.notificationQueue.push(next);
          } else if (next.id) {
            // Mark as failed
            await supabase
              .from('scheduled_notifications')
              .update({ status: 'failed' })
              .eq('id', next.id);
          }
        }
      } else {
        // Wait until next notification
        const delay = next.scheduledFor.getTime() - now.getTime();
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(delay, 60000)),
        );
      }
    }

    this.processingQueue = false;
  }

  /**
   * Handle notification click
   */
  private async handleNotificationClick(event: any): Promise<void> {
    const { notification, action } = event;
    const data = notification.data;

    // Default action: open app
    let url = '/';

    switch (data.type) {
      case NotificationType.NEW_MESSAGE:
        url = `/messages/${data.messageId}`;
        break;

      case NotificationType.RSVP_REMINDER:
        url = `/rsvp/${data.weddingId}`;
        break;

      case NotificationType.GUEST_RESPONSE:
        url = `/guests/${data.guestId}`;
        break;
    }

    // Handle specific actions
    if (action) {
      await this.handleActionClick(action, data.notificationId);
    }

    // Open or focus window
    event.waitUntil(clients.openWindow(url));
  }

  /**
   * Handle notification action click
   */
  private async handleActionClick(
    action: string,
    notificationId: string,
  ): Promise<void> {
    // Track action
    await this.trackNotificationInteraction(notificationId, `action_${action}`);

    // Handle specific actions
    switch (action) {
      case 'reply':
        // Open reply interface
        window.dispatchEvent(
          new CustomEvent('notification-reply', {
            detail: { notificationId },
          }),
        );
        break;

      case 'rsvp':
        // Navigate to RSVP page
        window.location.href = '/rsvp';
        break;

      case 'remind_later':
        // Schedule reminder for later
        const laterDate = new Date(Date.now() + 3600000); // 1 hour later
        // Re-schedule notification
        break;
    }
  }

  /**
   * Track notification
   */
  private async trackNotification(
    userId: string,
    type: NotificationType,
    payload: PushNotificationPayload,
  ): Promise<void> {
    try {
      await supabase.from('notification_logs').insert({
        user_id: userId,
        type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track notification:', error);
    }
  }

  /**
   * Track notification interaction
   */
  private async trackNotificationInteraction(
    notificationId: string,
    interaction: string,
  ): Promise<void> {
    try {
      await supabase.from('notification_interactions').insert({
        notification_id: notificationId,
        interaction,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Get user's push subscriptions
   */
  private async getUserSubscriptions(
    userId: string,
  ): Promise<NotificationSubscription[]> {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get user subscriptions:', error);
      return [];
    }

    return data.map((sub) => ({
      userId: sub.user_id,
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      deviceInfo: sub.device_info,
    }));
  }

  /**
   * Remove invalid subscription
   */
  private async removeSubscription(endpoint: string): Promise<void> {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }

  /**
   * Get current user ID
   */
  private async getCurrentUserId(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || '';
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): any {
    return {
      platform: navigator.platform,
      browser: navigator.userAgent,
      version: navigator.appVersion,
      language: navigator.language,
    };
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if push notifications are supported
   */
  static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Get permission status
   */
  static getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request permission
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return await Notification.requestPermission();
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    if (this.pushSubscription) {
      await this.pushSubscription.unsubscribe();
      await this.removeSubscription(this.pushSubscription.endpoint);
      this.pushSubscription = null;
    }
  }
}

export const pushNotificationSystem = new PushNotificationSystem();
