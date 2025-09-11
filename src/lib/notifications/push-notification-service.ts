// WS-157 Push Notification Service for Helper Assignments
// Handles push notification registration, sending, and mobile integration

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    taskId?: string;
    type:
      | 'task_assigned'
      | 'task_due'
      | 'task_updated'
      | 'task_completed'
      | 'sync_complete';
    action?: string;
    url?: string;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface NotificationPermissionResult {
  granted: boolean;
  denied: boolean;
  default: boolean;
  error?: string;
}

export class PushNotificationService {
  private supabase = createClientComponentClient();
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

  constructor() {
    this.initializeServiceWorker();
  }

  // Service Worker initialization
  private async initializeServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('Service Worker registered:', this.registration);

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener(
        'message',
        this.handleServiceWorkerMessage.bind(this),
      );

      // Check for service worker updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New content available, refresh the page
              this.showUpdateNotification();
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  // Permission management
  async requestPermission(): Promise<NotificationPermissionResult> {
    if (!('Notification' in window)) {
      return {
        granted: false,
        denied: true,
        default: false,
        error: 'Notifications not supported',
      };
    }

    try {
      const permission = await Notification.requestPermission();

      return {
        granted: permission === 'granted',
        denied: permission === 'denied',
        default: permission === 'default',
      };
    } catch (error) {
      return {
        granted: false,
        denied: false,
        default: false,
        error: `Permission request failed: ${error}`,
      };
    }
  }

  getPermissionStatus(): NotificationPermissionResult {
    if (!('Notification' in window)) {
      return {
        granted: false,
        denied: true,
        default: false,
        error: 'Notifications not supported',
      };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      default: permission === 'default',
    };
  }

  // Push subscription management
  async subscribeToPushNotifications(): Promise<{
    success: boolean;
    subscription?: PushSubscription;
    error?: string;
  }> {
    if (!this.registration) {
      return {
        success: false,
        error: 'Service Worker not registered',
      };
    }

    const permissionResult = await this.requestPermission();
    if (!permissionResult.granted) {
      return {
        success: false,
        error: 'Notification permission denied',
      };
    }

    try {
      // Check for existing subscription
      let subscription = await this.registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const applicationServerKey = this.urlB64ToUint8Array(
          this.vapidPublicKey,
        ) as BufferSource;
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      // Save subscription to database
      await this.saveSubscriptionToDatabase(subscription);

      return {
        success: true,
        subscription,
      };
    } catch (error) {
      console.error('Push subscription failed:', error);
      return {
        success: false,
        error: `Subscription failed: ${error}`,
      };
    }
  }

  async unsubscribeFromPushNotifications(): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.registration) {
      return {
        success: false,
        error: 'Service Worker not registered',
      };
    }

    try {
      const subscription =
        await this.registration.pushManager.getSubscription();

      if (subscription) {
        const unsubscribed = await subscription.unsubscribe();
        if (unsubscribed) {
          await this.removeSubscriptionFromDatabase();
        }

        return { success: unsubscribed };
      }

      return { success: true }; // Already unsubscribed
    } catch (error) {
      return {
        success: false,
        error: `Unsubscription failed: ${error}`,
      };
    }
  }

  private async saveSubscriptionToDatabase(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.toJSON().keys?.p256dh,
        auth: subscription.toJSON().keys?.auth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await this.supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving subscription:', error);
      }
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  }

  private async removeSubscriptionFromDatabase(): Promise<void> {
    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser();
      if (!user) return;

      const { error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error removing subscription:', error);
      }
    } catch (error) {
      console.error('Error removing push subscription:', error);
    }
  }

  // Local notification display
  async showLocalNotification(payload: PushNotificationPayload): Promise<{
    success: boolean;
    error?: string;
  }> {
    const permissionStatus = this.getPermissionStatus();
    if (!permissionStatus.granted) {
      return {
        success: false,
        error: 'Notification permission not granted',
      };
    }

    try {
      if (this.registration) {
        // Show notification via service worker (better for background)
        await this.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/badge-72x72.png',
          data: payload.data,
          // actions: payload.actions || [], // Not supported in all environments
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
          // vibrate: payload.vibrate || [200, 100, 200], // Not supported in all environments
          tag: `helper-task-${payload.data?.taskId || Date.now()}`,
          // renotify: true, // Not supported in all environments
          // timestamp: Date.now() // Not supported in all environments
        });
      } else {
        // Fallback to basic notification
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          data: payload.data,
          requireInteraction: payload.requireInteraction || false,
          silent: payload.silent || false,
          // vibrate: payload.vibrate || [200, 100, 200], // Not supported in all environments
          tag: `helper-task-${payload.data?.taskId || Date.now()}`,
          // renotify: true, // Not supported in all environments
          // timestamp: Date.now() // Not supported in all environments
        });

        // Handle notification click
        notification.onclick = () => {
          this.handleNotificationClick(payload.data);
          notification.close();
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error showing notification:', error);
      return {
        success: false,
        error: `Failed to show notification: ${error}`,
      };
    }
  }

  // Predefined notification templates
  async notifyTaskAssigned(
    taskTitle: string,
    taskId: string,
    assignedBy: string,
  ): Promise<void> {
    await this.showLocalNotification({
      title: '📋 New Task Assigned',
      body: `${assignedBy} assigned you: ${taskTitle}`,
      icon: '/icons/task-icon.png',
      data: {
        taskId,
        type: 'task_assigned',
        action: 'view_task',
        url: `/tasks/${taskId}`,
      },
      actions: [
        {
          action: 'view_task',
          title: 'View Task',
          icon: '/icons/view-icon.png',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });
  }

  async notifyTaskDueSoon(
    taskTitle: string,
    taskId: string,
    dueIn: string,
  ): Promise<void> {
    await this.showLocalNotification({
      title: '⏰ Task Due Soon',
      body: `"${taskTitle}" is due ${dueIn}`,
      icon: '/icons/clock-icon.png',
      data: {
        taskId,
        type: 'task_due',
        action: 'view_task',
        url: `/tasks/${taskId}`,
      },
      actions: [
        {
          action: 'start_task',
          title: 'Start Task',
          icon: '/icons/play-icon.png',
        },
        {
          action: 'view_task',
          title: 'View Details',
        },
      ],
      requireInteraction: true,
      vibrate: [300, 200, 300],
    });
  }

  async notifyTaskUpdated(
    taskTitle: string,
    taskId: string,
    updateType: string,
  ): Promise<void> {
    await this.showLocalNotification({
      title: '🔄 Task Updated',
      body: `"${taskTitle}" status changed to ${updateType}`,
      data: {
        taskId,
        type: 'task_updated',
        action: 'view_task',
        url: `/tasks/${taskId}`,
      },
      vibrate: [100, 50, 100],
    });
  }

  async notifyTaskCompleted(
    taskTitle: string,
    taskId: string,
    completedBy: string,
  ): Promise<void> {
    await this.showLocalNotification({
      title: '✅ Task Completed',
      body: `${completedBy} completed: ${taskTitle}`,
      icon: '/icons/check-icon.png',
      data: {
        taskId,
        type: 'task_completed',
        action: 'view_task',
        url: `/tasks/${taskId}`,
      },
      vibrate: [100, 100, 100, 100, 100],
    });
  }

  async notifySyncComplete(changesCount: number): Promise<void> {
    if (changesCount === 0) return;

    await this.showLocalNotification({
      title: '🔄 Sync Complete',
      body: `${changesCount} task${changesCount > 1 ? 's' : ''} synchronized`,
      data: {
        type: 'sync_complete',
        action: 'refresh_tasks',
      },
      silent: true,
      vibrate: [50, 25, 50],
    });
  }

  private async showUpdateNotification(): Promise<void> {
    await this.showLocalNotification({
      title: '🆕 App Updated',
      body: 'New version available. Refresh to update.',
      data: {
        type: 'task_updated' as any,
        action: 'refresh_app',
      },
      actions: [
        {
          action: 'refresh_app',
          title: 'Refresh Now',
        },
        {
          action: 'dismiss',
          title: 'Later',
        },
      ],
      requireInteraction: true,
    });
  }

  // Event handlers
  private handleServiceWorkerMessage(event: MessageEvent): void {
    console.log('Message from Service Worker:', event.data);

    const { type, data } = event.data;

    switch (type) {
      case 'notification_click':
        this.handleNotificationClick(data);
        break;
      case 'background_sync':
        this.handleBackgroundSync(data);
        break;
      default:
        console.log('Unknown service worker message:', type);
    }
  }

  private handleNotificationClick(data?: any): void {
    if (!data) return;

    // Focus or open the app window
    if ('serviceWorker' in navigator && 'clients' in self) {
      // In service worker context, use self.clients directly
      (self as any).clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        .then((clients: any[]) => {
          // Try to focus existing window
          for (const client of clients) {
            if (client.url.includes(window.location.origin)) {
              client.focus();
              if (data.url) {
                client.postMessage({
                  type: 'navigate',
                  url: data.url,
                });
              }
              return;
            }
          }

          // Open new window if none exists
          if (data.url) {
            window.open(data.url, '_blank');
          }
        });
    }

    // Handle specific actions
    switch (data.action) {
      case 'view_task':
        if (data.url) {
          window.location.href = data.url;
        }
        break;
      case 'start_task':
        if (data.taskId) {
          this.handleStartTask(data.taskId);
        }
        break;
      case 'refresh_app':
        window.location.reload();
        break;
      case 'refresh_tasks':
        window.dispatchEvent(new CustomEvent('refresh-tasks'));
        break;
    }
  }

  private async handleStartTask(taskId: string): Promise<void> {
    // This would typically update the task status
    // Implementation depends on your task management system
    window.dispatchEvent(
      new CustomEvent('start-task', {
        detail: { taskId },
      }),
    );
  }

  private handleBackgroundSync(data: any): void {
    // Handle background sync completion
    console.log('Background sync completed:', data);
    window.dispatchEvent(
      new CustomEvent('background-sync-complete', {
        detail: data,
      }),
    );
  }

  // Utility methods
  private urlB64ToUint8Array(base64String: string): Uint8Array {
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

  // Schedule notifications for due tasks
  async scheduleTaskReminders(): Promise<void> {
    if (!this.registration) return;

    try {
      // This would typically fetch upcoming tasks and schedule reminders
      // Implementation depends on your task scheduling system

      // Example: Schedule reminder 1 hour before due time
      const upcomingTasks = await this.getUpcomingTasks();

      for (const task of upcomingTasks) {
        const dueTime = new Date(task.deadline).getTime();
        const reminderTime = dueTime - 60 * 60 * 1000; // 1 hour before
        const now = Date.now();

        if (reminderTime > now) {
          setTimeout(() => {
            this.notifyTaskDueSoon(task.title, task.id, 'in 1 hour');
          }, reminderTime - now);
        }
      }
    } catch (error) {
      console.error('Error scheduling task reminders:', error);
    }
  }

  private async getUpcomingTasks(): Promise<any[]> {
    // This would fetch tasks due within the next 24 hours
    // Implementation depends on your data layer
    return [];
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationService();
