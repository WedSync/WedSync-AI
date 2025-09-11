'use client';

import { createClient } from '@/lib/supabase/client';
import { ChatNotification, ChatMessage } from '@/types/chat';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class ChatNotificationService {
  private supabase = createClient();
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private userId?: string;

  constructor() {
    this.initializeUser();
    this.initializeServiceWorker();
  }

  private async initializeUser() {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    this.userId = user?.id;
  }

  // =====================================================
  // SERVICE WORKER & PUSH SUBSCRIPTION
  // =====================================================

  private async initializeServiceWorker() {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(
        '/sw-chat.js',
        {
          scope: '/chat',
        },
      );

      console.log('Chat service worker registered:', this.registration.scope);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      );

      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('Existing push subscription found');
        await this.updateSubscriptionOnServer();
      }
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);

    if (permission === 'granted') {
      await this.subscribeToPush();
    }

    return permission;
  }

  private async subscribeToPush(): Promise<boolean> {
    if (!this.registration || !this.userId) {
      console.error('Service worker not registered or user not authenticated');
      return false;
    }

    try {
      // VAPID public key - would be environment variable in production
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';

      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      this.subscription = subscription;
      await this.updateSubscriptionOnServer();

      console.log('Push subscription successful');
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  private async updateSubscriptionOnServer(): Promise<void> {
    if (!this.subscription || !this.userId) return;

    try {
      // Store subscription in database
      await this.supabase.from('user_push_subscriptions').upsert({
        user_id: this.userId,
        subscription: this.subscription,
        endpoint: this.subscription.endpoint,
        is_active: true,
        device_type: this.getDeviceType(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update subscription on server:', error);
    }
  }

  // =====================================================
  // NOTIFICATION HANDLING
  // =====================================================

  async createChatNotification(
    message: ChatMessage,
    roomName: string,
    participants?: string[],
  ): Promise<void> {
    if (!this.userId) return;

    try {
      const senderName = await this.getSenderName(message.sender_id);

      const notification: Partial<ChatNotification> = {
        user_id: this.userId,
        room_id: message.room_id,
        message_id: message.id,
        notification_type: message.mentions?.includes(this.userId)
          ? 'mention'
          : 'message',
        title: message.mentions?.includes(this.userId)
          ? `${senderName} mentioned you in ${roomName}`
          : roomName,
        body: this.sanitizeMessageContent(message.content || ''),
        action_url: `/chat?room=${message.room_id}&message=${message.id}`,
        priority: message.mentions?.includes(this.userId) ? 'high' : 'normal',
      };

      // Store notification in database
      const { data: storedNotification } = await this.supabase
        .from('chat_notifications')
        .insert(notification)
        .select()
        .single();

      // Send push notification if enabled
      await this.sendPushNotification({
        title: notification.title!,
        body: notification.body!,
        icon: '/icons/chat-notification.png',
        badge: '/icons/badge.png',
        tag: `chat-${message.room_id}`,
        data: {
          roomId: message.room_id,
          messageId: message.id,
          notificationId: storedNotification?.id,
          url: notification.action_url,
        },
        actions: [
          {
            action: 'reply',
            title: 'Reply',
            icon: '/icons/reply.png',
          },
          {
            action: 'view',
            title: 'View Chat',
            icon: '/icons/view.png',
          },
        ],
      });
    } catch (error) {
      console.error('Failed to create chat notification:', error);
    }
  }

  private async sendPushNotification(
    payload: PushNotificationPayload,
  ): Promise<void> {
    // Check user preferences first
    const preferences = await this.getUserNotificationPreferences();
    if (!preferences.push_enabled) return;

    try {
      // Send to service worker for local display
      if (this.registration?.active) {
        this.registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload,
        });
      }

      // Send via server to other devices
      await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          payload,
        }),
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  private async getUserNotificationPreferences() {
    try {
      const { data } = await this.supabase
        .from('chat_room_participants')
        .select('push_enabled, notification_preference')
        .eq('user_id', this.userId!)
        .single();

      return {
        push_enabled: data?.push_enabled ?? true,
        notification_preference: data?.notification_preference ?? 'all',
      };
    } catch {
      return { push_enabled: true, notification_preference: 'all' };
    }
  }

  // =====================================================
  // NOTIFICATION INTERACTIONS
  // =====================================================

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data;

    switch (type) {
      case 'NOTIFICATION_CLICKED':
        this.handleNotificationClick(data);
        break;
      case 'NOTIFICATION_ACTION':
        this.handleNotificationAction(data);
        break;
      case 'NOTIFICATION_CLOSED':
        this.handleNotificationClosed(data);
        break;
    }
  }

  private async handleNotificationClick(data: any) {
    try {
      // Mark notification as read
      if (data.notificationId) {
        await this.markNotificationAsRead(data.notificationId);
      }

      // Navigate to chat
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  }

  private async handleNotificationAction(data: any) {
    const { action, notificationData } = data;

    try {
      switch (action) {
        case 'reply':
          // Open quick reply modal or navigate to chat
          window.open(
            `/chat?room=${notificationData.roomId}&reply=true`,
            '_blank',
          );
          break;
        case 'view':
          // Navigate to full chat view
          window.open(`/chat?room=${notificationData.roomId}`, '_blank');
          break;
      }

      // Mark as interacted
      if (notificationData.notificationId) {
        await this.markNotificationAsRead(notificationData.notificationId);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  private async handleNotificationClosed(data: any) {
    // Optional: Track dismissal analytics
    console.log('Notification dismissed:', data);
  }

  // =====================================================
  // NOTIFICATION MANAGEMENT
  // =====================================================

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await this.supabase
        .from('chat_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', this.userId!);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async markAllNotificationsAsRead(roomId?: string): Promise<void> {
    try {
      let query = this.supabase
        .from('chat_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId!)
        .eq('is_read', false);

      if (roomId) {
        query = query.eq('room_id', roomId);
      }

      await query;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }

  async getUnreadNotifications(): Promise<ChatNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('chat_notifications')
        .select('*')
        .eq('user_id', this.userId!)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch unread notifications:', error);
      return [];
    }
  }

  async getNotificationCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('chat_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.userId!)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Failed to get notification count:', error);
      return 0;
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private async getSenderName(senderId: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      if (data?.first_name && data?.last_name) {
        return `${data.first_name} ${data.last_name}`;
      }
      return 'Unknown User';
    } catch {
      return 'Unknown User';
    }
  }

  private sanitizeMessageContent(content: string): string {
    // Remove HTML tags and limit length
    const sanitized = content.replace(/<[^>]*>/g, '').trim();
    return sanitized.length > 100
      ? sanitized.substring(0, 97) + '...'
      : sanitized;
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|tablet/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

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

  // =====================================================
  // PUBLIC METHODS
  // =====================================================

  async enableNotifications(): Promise<boolean> {
    const permission = await this.requestPermission();
    return permission === 'granted';
  }

  async disableNotifications(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;

      // Update server
      await this.supabase
        .from('user_push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', this.userId!);
    }
  }

  isNotificationSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
  }

  getNotificationPermission(): NotificationPermission {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied';
  }
}

// Singleton instance
const chatNotificationService = new ChatNotificationService();

export default chatNotificationService;
