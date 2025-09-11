'use client';

import {
  TimelineEvent,
  WeddingTimeline,
  TimelineConflict,
} from '@/types/timeline';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface TimelineNotificationConfig {
  eventUpdated: boolean;
  eventCreated: boolean;
  eventDeleted: boolean;
  conflictDetected: boolean;
  vendorAssigned: boolean;
  timelineShared: boolean;
  reminderNotifications: boolean;
  vendorConfirmations: boolean;
}

class TimelinePushNotificationService {
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private config: TimelineNotificationConfig = {
    eventUpdated: true,
    eventCreated: true,
    eventDeleted: true,
    conflictDetected: true,
    vendorAssigned: true,
    timelineShared: true,
    reminderNotifications: true,
    vendorConfirmations: true,
  };

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(
        '/sw-timeline-notifications.js',
      );
      console.log('Timeline notification service worker registered');

      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
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
        console.log('Notification permission denied');
        return false;
      }

      // Subscribe to push notifications
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return false;
      }

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await this.saveSubscriptionToServer(this.subscription);

      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  // Save subscription to server
  private async saveSubscriptionToServer(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      await fetch('/api/timeline/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          config: this.config,
        }),
      });
    } catch (error) {
      console.error('Failed to save push subscription:', error);
      throw error;
    }
  }

  // Send local notification (fallback)
  private async sendLocalNotification(
    payload: PushNotificationPayload,
  ): Promise<void> {
    if (!('Notification' in window)) return;

    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/wedding-timeline-192.png',
      badge: payload.badge || '/icons/wedding-badge-72.png',
      image: payload.image,
      data: payload.data,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions as any, // TypeScript type compatibility
    });

    notification.onclick = () => {
      window.focus();
      if (payload.data?.url) {
        window.location.href = payload.data.url;
      }
      notification.close();
    };

    // Auto-close after 10 seconds unless requireInteraction is true
    if (!payload.requireInteraction) {
      setTimeout(() => notification.close(), 10000);
    }
  }

  // Notify event created
  async notifyEventCreated(
    timeline: WeddingTimeline,
    event: TimelineEvent,
  ): Promise<void> {
    if (!this.config.eventCreated) return;

    const payload: PushNotificationPayload = {
      title: `New Event Added: ${event.title}`,
      body: `Added to ${timeline.name} timeline at ${new Date(event.start_time).toLocaleTimeString()}`,
      icon: '/icons/event-created.png',
      tag: `event-created-${event.id}`,
      data: {
        type: 'event_created',
        timelineId: timeline.id,
        eventId: event.id,
        url: `/timeline/${timeline.id}?event=${event.id}`,
      },
      actions: [
        { action: 'view', title: 'View Timeline', icon: '/icons/view.png' },
        { action: 'edit', title: 'Edit Event', icon: '/icons/edit.png' },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Notify event updated
  async notifyEventUpdated(
    timeline: WeddingTimeline,
    event: TimelineEvent,
    changes: string[],
  ): Promise<void> {
    if (!this.config.eventUpdated) return;

    const changeText =
      changes.length > 1
        ? `${changes.length} changes made`
        : changes[0] || 'Event updated';

    const payload: PushNotificationPayload = {
      title: `Event Updated: ${event.title}`,
      body: `${changeText} in ${timeline.name}`,
      icon: '/icons/event-updated.png',
      tag: `event-updated-${event.id}`,
      data: {
        type: 'event_updated',
        timelineId: timeline.id,
        eventId: event.id,
        changes,
        url: `/timeline/${timeline.id}?event=${event.id}`,
      },
      actions: [
        { action: 'view', title: 'View Changes', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Notify event deleted
  async notifyEventDeleted(
    timeline: WeddingTimeline,
    eventTitle: string,
  ): Promise<void> {
    if (!this.config.eventDeleted) return;

    const payload: PushNotificationPayload = {
      title: `Event Removed: ${eventTitle}`,
      body: `Removed from ${timeline.name} timeline`,
      icon: '/icons/event-deleted.png',
      tag: `event-deleted-${Date.now()}`,
      data: {
        type: 'event_deleted',
        timelineId: timeline.id,
        url: `/timeline/${timeline.id}`,
      },
      actions: [
        { action: 'view', title: 'View Timeline', icon: '/icons/view.png' },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Notify conflict detected
  async notifyConflictDetected(
    timeline: WeddingTimeline,
    conflict: TimelineConflict,
  ): Promise<void> {
    if (!this.config.conflictDetected) return;

    const payload: PushNotificationPayload = {
      title: 'Timeline Conflict Detected',
      body: `${conflict.description} in ${timeline.name}`,
      icon: '/icons/conflict-warning.png',
      tag: `conflict-${conflict.id}`,
      requireInteraction: conflict.severity === 'error',
      data: {
        type: 'conflict_detected',
        timelineId: timeline.id,
        conflictId: conflict.id,
        url: `/timeline/${timeline.id}?conflict=${conflict.id}`,
      },
      actions: [
        { action: 'resolve', title: 'Resolve Now', icon: '/icons/resolve.png' },
        { action: 'later', title: 'Resolve Later', icon: '/icons/later.png' },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Notify vendor assigned
  async notifyVendorAssigned(
    timeline: WeddingTimeline,
    event: TimelineEvent,
    vendorName: string,
  ): Promise<void> {
    if (!this.config.vendorAssigned) return;

    const payload: PushNotificationPayload = {
      title: `Vendor Assigned: ${vendorName}`,
      body: `Assigned to "${event.title}" in ${timeline.name}`,
      icon: '/icons/vendor-assigned.png',
      tag: `vendor-assigned-${event.id}`,
      data: {
        type: 'vendor_assigned',
        timelineId: timeline.id,
        eventId: event.id,
        vendorName,
        url: `/timeline/${timeline.id}?event=${event.id}`,
      },
      actions: [
        { action: 'view', title: 'View Details', icon: '/icons/view.png' },
        {
          action: 'contact',
          title: 'Contact Vendor',
          icon: '/icons/contact.png',
        },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Notify timeline shared
  async notifyTimelineShared(
    timeline: WeddingTimeline,
    sharedWith: string[],
    shareUrl: string,
  ): Promise<void> {
    if (!this.config.timelineShared) return;

    const recipientText =
      sharedWith.length === 1 ? sharedWith[0] : `${sharedWith.length} people`;

    const payload: PushNotificationPayload = {
      title: 'Timeline Shared',
      body: `${timeline.name} shared with ${recipientText}`,
      icon: '/icons/timeline-shared.png',
      tag: `timeline-shared-${timeline.id}`,
      data: {
        type: 'timeline_shared',
        timelineId: timeline.id,
        sharedWith,
        shareUrl,
        url: `/timeline/${timeline.id}`,
      },
      actions: [
        { action: 'view', title: 'View Timeline', icon: '/icons/view.png' },
        {
          action: 'manage',
          title: 'Manage Sharing',
          icon: '/icons/manage.png',
        },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Send reminder notifications
  async sendReminder(
    timeline: WeddingTimeline,
    event: TimelineEvent,
    minutesBefore: number,
  ): Promise<void> {
    if (!this.config.reminderNotifications) return;

    const timeText =
      minutesBefore >= 60
        ? `${Math.floor(minutesBefore / 60)} hour${Math.floor(minutesBefore / 60) > 1 ? 's' : ''}`
        : `${minutesBefore} minute${minutesBefore > 1 ? 's' : ''}`;

    const payload: PushNotificationPayload = {
      title: `Upcoming: ${event.title}`,
      body: `Starts in ${timeText} at ${event.location || 'scheduled location'}`,
      icon: '/icons/reminder.png',
      tag: `reminder-${event.id}-${minutesBefore}`,
      requireInteraction: minutesBefore <= 15, // Require interaction for last-minute reminders
      data: {
        type: 'reminder',
        timelineId: timeline.id,
        eventId: event.id,
        minutesBefore,
        url: `/timeline/${timeline.id}?event=${event.id}`,
      },
      actions: [
        { action: 'view', title: 'View Details', icon: '/icons/view.png' },
        {
          action: 'navigate',
          title: 'Get Directions',
          icon: '/icons/navigate.png',
        },
        { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' },
      ],
    };

    await this.sendLocalNotification(payload);
  }

  // Update notification configuration
  updateConfig(config: Partial<TimelineNotificationConfig>): void {
    this.config = { ...this.config, ...config };

    // Save config to localStorage
    localStorage.setItem(
      'timeline-notification-config',
      JSON.stringify(this.config),
    );

    // Update server subscription if available
    if (this.subscription) {
      this.saveSubscriptionToServer(this.subscription).catch(console.error);
    }
  }

  // Get current configuration
  getConfig(): TimelineNotificationConfig {
    // Load from localStorage if available
    const saved = localStorage.getItem('timeline-notification-config');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (error) {
        console.error('Failed to load notification config:', error);
      }
    }

    return { ...this.config };
  }

  // Check notification permission status
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // Get subscription status
  async getSubscriptionStatus(): Promise<{
    subscribed: boolean;
    subscription?: PushSubscription;
  }> {
    if (!this.registration) {
      return { subscribed: false };
    }

    try {
      const subscription =
        await this.registration.pushManager.getSubscription();
      return {
        subscribed: !!subscription,
        subscription: subscription || undefined,
      };
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return { subscribed: false };
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.subscription) return true;

    try {
      const success = await this.subscription.unsubscribe();
      if (success) {
        // Notify server
        await fetch('/api/timeline/push-subscription', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: this.subscription.endpoint }),
        });

        this.subscription = null;
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
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
}

// Export singleton
export const timelinePushNotificationService =
  new TimelinePushNotificationService();

// React hook for timeline push notifications
export function useTimelinePushNotifications() {
  const [isSupported] = React.useState(() =>
    timelinePushNotificationService.isSupported(),
  );
  const [permission, setPermission] = React.useState<NotificationPermission>(
    () => (isSupported ? Notification.permission : 'denied'),
  );
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [config, setConfig] = React.useState(() =>
    timelinePushNotificationService.getConfig(),
  );

  React.useEffect(() => {
    if (!isSupported) return;

    // Initialize service
    timelinePushNotificationService.initialize().then(() => {
      // Check subscription status
      timelinePushNotificationService.getSubscriptionStatus().then((status) => {
        setIsSubscribed(status.subscribed);
      });
    });

    // Listen for permission changes
    const checkPermission = () => {
      setPermission(Notification.permission);
    };

    // Check permission periodically (since there's no event for permission changes)
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, [isSupported]);

  const requestPermission = React.useCallback(async () => {
    const granted = await timelinePushNotificationService.requestPermission();
    setPermission(Notification.permission);
    setIsSubscribed(granted);
    return granted;
  }, []);

  const updateConfig = React.useCallback(
    (newConfig: Partial<TimelineNotificationConfig>) => {
      timelinePushNotificationService.updateConfig(newConfig);
      setConfig(timelinePushNotificationService.getConfig());
    },
    [],
  );

  const unsubscribe = React.useCallback(async () => {
    const success = await timelinePushNotificationService.unsubscribe();
    if (success) {
      setIsSubscribed(false);
    }
    return success;
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    config,
    requestPermission,
    updateConfig,
    unsubscribe,
    service: timelinePushNotificationService,
  };
}

// Add React import
import React from 'react';
