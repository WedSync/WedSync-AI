interface PushSubscriptionData {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface TimelineNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data: {
    nodeId: string;
    clientId: string;
    type: 'trigger' | 'reminder' | 'completion' | 'delay';
    url: string;
  };
  timestamp: Date;
  requiresAction: boolean;
}

class TimelinePushNotifications {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  async init(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      // Register service worker
      this.registration =
        await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Service worker registered for push notifications');

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      if (this.subscription) {
        console.log('📱 Existing push subscription found');
        await this.updateSubscriptionOnServer(this.subscription);
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      );
    } catch (error) {
      console.error('Push notification init failed:', error);
    }
  }

  // Request permission and subscribe
  async requestPermission(): Promise<boolean> {
    if (!this.registration) {
      console.error('Service worker not registered');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      console.log('✅ Push notification subscription created');

      // Send subscription to server
      await this.updateSubscriptionOnServer(this.subscription);

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  // Update subscription on server
  private async updateSubscriptionOnServer(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          feature: 'timeline',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription on server');
      }

      console.log('✅ Push subscription updated on server');
    } catch (error) {
      console.error('Failed to update subscription:', error);
    }
  }

  // Schedule timeline notification
  async scheduleTimelineNotification(
    nodeId: string,
    clientName: string,
    nodeTitle: string,
    triggerDate: Date,
    type: 'email' | 'form' | 'reminder' | 'meeting' | 'payment',
  ): Promise<void> {
    if (!this.subscription) {
      console.warn('No push subscription available');
      return;
    }

    const notification: TimelineNotification = {
      id: `timeline_${nodeId}_${Date.now()}`,
      title: `WedSync: ${this.getNotificationTitle(type)}`,
      body: `${clientName}: ${nodeTitle} is ready to trigger`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        nodeId,
        clientId: '', // TODO: Get from context
        type: 'trigger',
        url: `/dashboard/timeline?node=${nodeId}`,
      },
      timestamp: triggerDate,
      requiresAction: type === 'meeting' || type === 'payment',
    };

    try {
      const response = await fetch('/api/notifications/push/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification,
          scheduleFor: triggerDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule notification');
      }

      console.log('📅 Timeline notification scheduled:', notification.title);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  // Cancel scheduled notification
  async cancelTimelineNotification(nodeId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/push/cancel/${nodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel notification');
      }

      console.log('❌ Timeline notification cancelled for node:', nodeId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  // Send immediate notification
  async sendImmediateNotification(
    title: string,
    body: string,
    data: Record<string, any> = {},
  ): Promise<void> {
    if (!this.subscription) {
      console.warn('No push subscription available');
      return;
    }

    try {
      const response = await fetch('/api/notifications/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          data,
          immediate: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send immediate notification');
      }

      console.log('📬 Immediate notification sent:', title);
    } catch (error) {
      console.error('Failed to send immediate notification:', error);
    }
  }

  // Handle timeline triggers
  async notifyTimelineTrigger(
    nodeId: string,
    clientName: string,
    nodeTitle: string,
    status: 'success' | 'failed' | 'delayed',
  ): Promise<void> {
    const statusEmoji = {
      success: '✅',
      failed: '❌',
      delayed: '⏰',
    };

    const title = `${statusEmoji[status]} Timeline Update`;
    const body = `${clientName}: ${nodeTitle} ${status === 'success' ? 'completed' : status}`;

    await this.sendImmediateNotification(title, body, {
      nodeId,
      clientName,
      type: 'trigger-result',
      status,
    });
  }

  // Notify about offline changes
  async notifyOfflineSync(changesCount: number): Promise<void> {
    if (changesCount === 0) return;

    await this.sendImmediateNotification(
      '📶 Back Online',
      `${changesCount} timeline changes synced successfully`,
      {
        type: 'sync-complete',
        changesCount,
      },
    );
  }

  // Handle messages from service worker
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;

    switch (type) {
      case 'notification-click':
        // Handle notification click
        if (data.url) {
          window.location.href = data.url;
        }
        break;

      case 'notification-action':
        // Handle notification action buttons
        this.handleNotificationAction(data.action, data.notification);
        break;
    }
  }

  // Handle notification actions
  private async handleNotificationAction(
    action: string,
    notification: any,
  ): Promise<void> {
    switch (action) {
      case 'view':
        if (notification.data.url) {
          window.location.href = notification.data.url;
        }
        break;

      case 'snooze':
        // Reschedule for 1 hour later
        const snoozeTime = new Date(Date.now() + 60 * 60 * 1000);
        await this.scheduleTimelineNotification(
          notification.data.nodeId,
          'Snoozed reminder',
          notification.body,
          snoozeTime,
          'reminder',
        );
        break;

      case 'complete':
        // Mark as completed
        try {
          await fetch(
            `/api/timeline/nodes/${notification.data.nodeId}/complete`,
            {
              method: 'POST',
            },
          );
        } catch (error) {
          console.error('Failed to mark as completed:', error);
        }
        break;
    }
  }

  // Get notification title based on type
  private getNotificationTitle(type: string): string {
    const titles = {
      email: 'Email Ready',
      form: 'Form Due',
      reminder: 'Reminder',
      meeting: 'Meeting Scheduled',
      payment: 'Payment Due',
    };
    return titles[type as keyof typeof titles] || 'Timeline Update';
  }

  // Utility: Convert VAPID key
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

  // Check if notifications are supported and enabled
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return true;

    try {
      const success = await this.subscription.unsubscribe();
      if (success) {
        this.subscription = null;
        console.log('✅ Unsubscribed from push notifications');
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }
}

// Singleton instance
export const timelinePush = new TimelinePushNotifications();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  timelinePush.init().catch(console.error);
}

export type { TimelineNotification, PushSubscriptionData };
export default timelinePush;
