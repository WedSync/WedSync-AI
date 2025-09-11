import { getMessaging, Message, BatchResponse } from 'firebase-admin/messaging';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

export class PushNotificationProvider implements NotificationChannelProvider {
  private messaging: any;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (getApps().length === 0) {
      if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !process.env.FIREBASE_PRIVATE_KEY
      ) {
        throw new Error(
          'Firebase credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY',
        );
      }

      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    this.messaging = getMessaging();
  }

  async send(
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Validate FCM token format
      if (!this.isValidFCMToken(notification.recipientId)) {
        return {
          success: false,
          channel: 'push',
          providerId: 'fcm',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid FCM token format',
          latency: Date.now() - startTime,
        };
      }

      // Generate push payload based on notification type
      const payload = this.generatePushPayload(notification);

      // Construct FCM message
      const message: Message = {
        token: notification.recipientId,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.icon,
        },
        data: {
          ...payload.data,
          notificationId: notification.id || '',
          priority: notification.priority,
          weddingId: notification.event.weddingId || '',
          type: notification.event.type,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: this.getAndroidPriority(notification.priority),
          notification: {
            icon: 'ic_wedding_notification',
            color: this.getNotificationColor(notification.event.type),
            sound: this.getNotificationSound(notification.priority),
            channelId: this.getAndroidChannelId(notification.event.type),
            priority: this.getAndroidNotificationPriority(
              notification.priority,
            ),
            visibility: this.getAndroidVisibility(notification.priority),
            clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
            badge: payload.badge,
          },
          ttl: this.getTTL(notification.priority),
        },
        apns: {
          headers: {
            'apns-priority': this.getAPNSPriority(notification.priority),
            'apns-expiration': String(
              Math.floor(Date.now() / 1000) +
                this.getTTL(notification.priority),
            ),
          },
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              badge: payload.badge || 1,
              sound: {
                name: payload.sound || this.getIOSSound(notification.priority),
                critical: notification.priority === 'emergency',
                volume: notification.priority === 'emergency' ? 1.0 : 0.7,
              },
              category: this.getIOSCategory(notification.event.type),
              'thread-id': notification.event.weddingId || 'wedding-updates',
              'interruption-level': this.getIOSInterruptionLevel(
                notification.priority,
              ),
            },
            customData: payload.data,
          },
        },
        webpush: {
          headers: {
            TTL: String(this.getTTL(notification.priority)),
            Urgency: this.getWebPushUrgency(notification.priority),
          },
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/wedding-notification-192.png',
            badge: '/icons/wedding-badge-72.png',
            image: this.getNotificationImage(notification),
            vibrate: this.getVibrationPattern(notification.priority),
            requireInteraction: notification.priority === 'emergency',
            silent: false,
            actions: this.getWebPushActions(notification),
            data: payload.data,
          },
        },
      };

      // Send the push notification
      const response = await this.messaging.send(message);

      return {
        success: true,
        channel: 'push',
        providerId: 'fcm',
        recipientId: notification.recipientId,
        messageId: response,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        metadata: {
          platform: 'multi-platform',
          priority: notification.priority,
        },
      };
    } catch (error: any) {
      const errorMessage = this.handleFCMError(error);

      return {
        success: false,
        channel: 'push',
        providerId: 'fcm',
        recipientId: notification.recipientId,
        messageId: '',
        timestamp: new Date(),
        error: errorMessage,
        latency: Date.now() - startTime,
        metadata: {
          errorCode: error.code,
          errorType: error.name,
        },
      };
    }
  }

  async getProviderStatus(): Promise<{
    healthy: boolean;
    latency: number;
    errorRate: number;
  }> {
    const startTime = Date.now();

    try {
      // Try to validate a test token format (won't actually send)
      const testMessage: Message = {
        token: 'test-token-health-check',
        notification: {
          title: 'Health Check',
          body: 'Testing FCM connection',
        },
        dryRun: true, // This prevents actual sending
      };

      await this.messaging.send(testMessage);

      return {
        healthy: true,
        latency: Date.now() - startTime,
        errorRate: 0,
      };
    } catch (error: any) {
      // If it's just an invalid token error, the service is actually healthy
      if (error.code === 'messaging/invalid-registration-token') {
        return {
          healthy: true,
          latency: Date.now() - startTime,
          errorRate: 0,
        };
      }

      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
      };
    }
  }

  private isValidFCMToken(token: string): boolean {
    // FCM tokens are typically 152-163 characters long and contain only alphanumeric characters, hyphens, underscores, and colons
    const fcmTokenRegex = /^[A-Za-z0-9_-]+(:APA91b[A-Za-z0-9_-]+)?$/;
    return (
      token.length >= 140 && token.length <= 165 && fcmTokenRegex.test(token)
    );
  }

  private generatePushPayload(
    notification: ProcessedNotification,
  ): PushPayload {
    const context = notification.event.context;
    const weddingTitle = context?.weddingTitle || 'Wedding';
    const weddingDate = context?.weddingDate || '';

    switch (notification.event.type) {
      case 'wedding_emergency':
      case 'emergency':
        return {
          title: `🚨 Wedding Emergency`,
          body: `${context?.emergencyType || 'Emergency'} for ${weddingTitle}. Immediate action required.`,
          icon: '/icons/emergency-icon.png',
          sound: 'emergency.wav',
          badge: 1,
          clickAction: 'EMERGENCY_ACTION',
          data: {
            emergencyType: context?.emergencyType || '',
            actionRequired: context?.actionRequired || '',
            emergencyContact: context?.emergencyContact || '',
          },
        };

      case 'weather_alert':
        return {
          title: `🌦️ Weather Alert: ${weddingTitle}`,
          body: `${context?.alertType || 'Weather update'} - ${notification.content.substring(0, 100)}`,
          icon: '/icons/weather-icon.png',
          sound: 'weather-alert.wav',
          badge: 1,
          clickAction: 'WEATHER_ACTION',
          data: {
            alertType: context?.alertType || '',
            currentConditions: context?.currentConditions || '',
            forecast: context?.forecast || '',
          },
        };

      case 'vendor_update':
      case 'vendor_message':
        return {
          title: `📋 ${context?.vendorName || 'Vendor'} Update`,
          body: `New message for ${weddingTitle}: ${notification.content.substring(0, 100)}`,
          icon: '/icons/vendor-icon.png',
          sound: 'vendor-update.wav',
          badge: 1,
          clickAction: 'VENDOR_ACTION',
          data: {
            vendorName: context?.vendorName || '',
            vendorType: context?.vendorType || '',
            updateType: context?.updateType || '',
          },
        };

      case 'timeline_change':
      case 'schedule_update':
        return {
          title: `⏰ Timeline Update: ${weddingTitle}`,
          body: `${context?.changeType || 'Schedule change'} - ${notification.content.substring(0, 100)}`,
          icon: '/icons/timeline-icon.png',
          sound: 'timeline-update.wav',
          badge: 1,
          clickAction: 'TIMELINE_ACTION',
          data: {
            changeType: context?.changeType || '',
            previousTime: context?.previousTime || '',
            newTime: context?.newTime || '',
          },
        };

      case 'payment_reminder':
        return {
          title: `💳 Payment Reminder`,
          body: `Payment due for ${weddingTitle} - ${context?.amount || 'Amount TBD'}`,
          icon: '/icons/payment-icon.png',
          sound: 'payment-reminder.wav',
          badge: 1,
          clickAction: 'PAYMENT_ACTION',
          data: {
            amount: context?.amount || '',
            dueDate: context?.dueDate || '',
            paymentUrl: context?.paymentUrl || '',
          },
        };

      default:
        return {
          title: `📱 ${weddingTitle}`,
          body: notification.content.substring(0, 100),
          icon: '/icons/default-wedding-icon.png',
          sound: 'default.wav',
          badge: 1,
          clickAction: 'DEFAULT_ACTION',
          data: {
            type: notification.event.type,
          },
        };
    }
  }

  private getAndroidPriority(priority: string): 'normal' | 'high' {
    return priority === 'emergency' || priority === 'high' ? 'high' : 'normal';
  }

  private getAndroidNotificationPriority(
    priority: string,
  ):
    | 'PRIORITY_MIN'
    | 'PRIORITY_LOW'
    | 'PRIORITY_DEFAULT'
    | 'PRIORITY_HIGH'
    | 'PRIORITY_MAX' {
    switch (priority) {
      case 'emergency':
        return 'PRIORITY_MAX';
      case 'high':
        return 'PRIORITY_HIGH';
      case 'low':
        return 'PRIORITY_LOW';
      default:
        return 'PRIORITY_DEFAULT';
    }
  }

  private getAndroidVisibility(
    priority: string,
  ): 'VISIBILITY_PRIVATE' | 'VISIBILITY_PUBLIC' | 'VISIBILITY_SECRET' {
    return priority === 'emergency'
      ? 'VISIBILITY_PUBLIC'
      : 'VISIBILITY_PRIVATE';
  }

  private getAndroidChannelId(eventType: string): string {
    const channelMapping: Record<string, string> = {
      wedding_emergency: 'emergency_notifications',
      emergency: 'emergency_notifications',
      weather_alert: 'weather_notifications',
      vendor_update: 'vendor_notifications',
      timeline_change: 'timeline_notifications',
      payment_reminder: 'payment_notifications',
    };

    return channelMapping[eventType] || 'default_notifications';
  }

  private getNotificationColor(eventType: string): string {
    const colorMapping: Record<string, string> = {
      wedding_emergency: '#dc2626', // Red
      emergency: '#dc2626',
      weather_alert: '#f59e0b', // Yellow
      vendor_update: '#3b82f6', // Blue
      timeline_change: '#10b981', // Green
      payment_reminder: '#8b5cf6', // Purple
    };

    return colorMapping[eventType] || '#6366f1'; // Default blue
  }

  private getNotificationSound(priority: string): string {
    switch (priority) {
      case 'emergency':
        return 'emergency_sound.wav';
      case 'high':
        return 'high_priority_sound.wav';
      default:
        return 'default_sound.wav';
    }
  }

  private getAPNSPriority(priority: string): '5' | '10' {
    return priority === 'emergency' || priority === 'high' ? '10' : '5';
  }

  private getIOSSound(priority: string): string {
    switch (priority) {
      case 'emergency':
        return 'emergency.caf';
      case 'high':
        return 'high-priority.caf';
      default:
        return 'default.caf';
    }
  }

  private getIOSCategory(eventType: string): string {
    const categoryMapping: Record<string, string> = {
      wedding_emergency: 'EMERGENCY_CATEGORY',
      weather_alert: 'WEATHER_CATEGORY',
      vendor_update: 'VENDOR_CATEGORY',
      timeline_change: 'TIMELINE_CATEGORY',
      payment_reminder: 'PAYMENT_CATEGORY',
    };

    return categoryMapping[eventType] || 'DEFAULT_CATEGORY';
  }

  private getIOSInterruptionLevel(
    priority: string,
  ): 'passive' | 'active' | 'time-sensitive' | 'critical' {
    switch (priority) {
      case 'emergency':
        return 'critical';
      case 'high':
        return 'time-sensitive';
      case 'medium':
        return 'active';
      default:
        return 'passive';
    }
  }

  private getTTL(priority: string): number {
    // Time to live in seconds
    switch (priority) {
      case 'emergency':
        return 3600; // 1 hour
      case 'high':
        return 14400; // 4 hours
      case 'medium':
        return 86400; // 24 hours
      default:
        return 259200; // 72 hours
    }
  }

  private getWebPushUrgency(
    priority: string,
  ): 'very-low' | 'low' | 'normal' | 'high' {
    switch (priority) {
      case 'emergency':
        return 'high';
      case 'high':
        return 'high';
      case 'medium':
        return 'normal';
      default:
        return 'low';
    }
  }

  private getVibrationPattern(priority: string): number[] {
    switch (priority) {
      case 'emergency':
        return [100, 50, 100, 50, 100, 50, 100]; // Urgent pattern
      case 'high':
        return [200, 100, 200]; // Strong pattern
      default:
        return [100, 50, 100]; // Standard pattern
    }
  }

  private getNotificationImage(
    notification: ProcessedNotification,
  ): string | undefined {
    // Return appropriate image based on notification type
    const eventType = notification.event.type;
    const imageMapping: Record<string, string> = {
      weather_alert: '/images/weather-alert-banner.jpg',
      vendor_update: '/images/vendor-update-banner.jpg',
      timeline_change: '/images/timeline-banner.jpg',
    };

    return imageMapping[eventType];
  }

  private getWebPushActions(
    notification: ProcessedNotification,
  ): Array<{ action: string; title: string; icon?: string }> {
    const actions = [];

    switch (notification.event.type) {
      case 'wedding_emergency':
      case 'emergency':
        actions.push(
          { action: 'call', title: '📞 Call Now', icon: '/icons/phone.png' },
          { action: 'view', title: '👀 View Details', icon: '/icons/view.png' },
        );
        break;

      case 'vendor_update':
        actions.push(
          { action: 'reply', title: '💬 Reply', icon: '/icons/reply.png' },
          { action: 'view', title: '👀 View Message', icon: '/icons/view.png' },
        );
        break;

      case 'payment_reminder':
        actions.push(
          { action: 'pay', title: '💳 Pay Now', icon: '/icons/payment.png' },
          { action: 'view', title: '👀 View Invoice', icon: '/icons/view.png' },
        );
        break;

      default:
        actions.push({
          action: 'view',
          title: '👀 View',
          icon: '/icons/view.png',
        });
    }

    return actions;
  }

  private handleFCMError(error: any): string {
    // Map FCM error codes to user-friendly messages
    const errorMappings: Record<string, string> = {
      'messaging/invalid-registration-token':
        'Device token is invalid or expired',
      'messaging/registration-token-not-registered':
        'Device is no longer registered for notifications',
      'messaging/invalid-package-name': 'App package name is invalid',
      'messaging/message-rate-exceeded':
        'Too many messages sent to this device',
      'messaging/device-message-rate-exceeded':
        'Device message rate limit exceeded',
      'messaging/topics-message-rate-exceeded':
        'Topic message rate limit exceeded',
      'messaging/invalid-apns-credentials':
        'Invalid Apple Push Notification credentials',
      'messaging/mismatched-credential': 'Credential mismatch',
      'messaging/authentication-error': 'Authentication failed',
      'messaging/server-unavailable': 'FCM service temporarily unavailable',
      'messaging/internal-error': 'Internal FCM error',
      'messaging/unknown-error': 'Unknown FCM error',
    };

    if (error.code && errorMappings[error.code]) {
      return errorMappings[error.code];
    }

    return error.message || 'Push notification delivery failed';
  }
}
