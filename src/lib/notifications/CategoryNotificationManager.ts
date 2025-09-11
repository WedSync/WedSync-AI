import { TaskCategory, CategoryTask } from '@/types/task-categories';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: NotificationAction[];
  vibrate?: number[];
  silent?: boolean;
  requireInteraction?: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class CategoryNotificationManager {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private pushSubscription: PushSubscription | null = null;
  private organizationId: string;
  private userId: string;

  constructor(organizationId: string, userId: string) {
    this.organizationId = organizationId;
    this.userId = userId;
    this.initialize();
  }

  // Initialize notification manager
  private async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        this.serviceWorkerRegistration =
          await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered for notifications');

        // Check for existing push subscription
        const existingSubscription =
          await this.serviceWorkerRegistration.pushManager.getSubscription();
        if (existingSubscription) {
          this.pushSubscription = {
            endpoint: existingSubscription.endpoint,
            keys: {
              p256dh: existingSubscription.getKey('p256dh')
                ? btoa(
                    String.fromCharCode(
                      ...new Uint8Array(existingSubscription.getKey('p256dh')!),
                    ),
                  )
                : '',
              auth: existingSubscription.getKey('auth')
                ? btoa(
                    String.fromCharCode(
                      ...new Uint8Array(existingSubscription.getKey('auth')!),
                    ),
                  )
                : '',
            },
          };
        }
      } catch (error) {
        console.error('Failed to initialize notification manager:', error);
      }
    }
  }

  // Request notification permission
  public async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Notifications are not supported in this browser');
      return 'denied';
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      await this.subscribeToPushNotifications();
    }

    return permission;
  }

  // Subscribe to push notifications
  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      console.error('Service Worker not registered');
      return;
    }

    try {
      // Convert VAPID public key to Uint8Array
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'your-vapid-public-key';
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      const subscription =
        await this.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });

      this.pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh')
            ? btoa(
                String.fromCharCode(
                  ...new Uint8Array(subscription.getKey('p256dh')!),
                ),
              )
            : '',
          auth: subscription.getKey('auth')
            ? btoa(
                String.fromCharCode(
                  ...new Uint8Array(subscription.getKey('auth')!),
                ),
              )
            : '',
        },
      };

      // Send subscription to server
      await this.sendSubscriptionToServer();

      console.log('Push notification subscription successful');
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(): Promise<void> {
    if (!this.pushSubscription) return;

    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: this.pushSubscription,
          organization_id: this.organizationId,
          user_id: this.userId,
          notification_types: [
            'category_created',
            'category_updated',
            'task_completed',
            'task_overdue',
            'sync_completed',
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  // Show local notification
  public async showNotification(options: NotificationOptions): Promise<void> {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if (this.serviceWorkerRegistration) {
      // Use service worker for better persistence
      await this.serviceWorkerRegistration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        data: options.data,
        actions: options.actions,
        vibrate: options.vibrate || [200, 100, 200],
        silent: options.silent,
        requireInteraction: options.requireInteraction,
        tag: `category-${Date.now()}`,
      });
    } else {
      // Fallback to basic notification
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        data: options.data,
        vibrate: options.vibrate || [200, 100, 200],
        silent: options.silent,
        requireInteraction: options.requireInteraction,
      });
    }
  }

  // Category-specific notification methods
  public async notifyCategoryCreated(category: TaskCategory): Promise<void> {
    await this.showNotification({
      title: 'New Category Created',
      body: `${category.display_name} has been added to your wedding planning`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'category_created',
        category_id: category.id,
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view', title: 'View Category' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [100, 50, 100],
    });
  }

  public async notifyCategoryUpdated(category: TaskCategory): Promise<void> {
    await this.showNotification({
      title: 'Category Updated',
      body: `${category.display_name} has been modified`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'category_updated',
        category_id: category.id,
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view', title: 'View Changes' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [50, 30, 50],
      silent: true,
    });
  }

  public async notifyTaskCompleted(
    task: CategoryTask,
    category: TaskCategory,
  ): Promise<void> {
    await this.showNotification({
      title: 'Task Completed! 🎉',
      body: `"${task.title}" in ${category.display_name} has been completed`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'task_completed',
        task_id: task.id,
        category_id: category.id,
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view', title: 'View Category' },
        { action: 'next_task', title: 'Next Task' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: false,
    });
  }

  public async notifyTaskOverdue(
    task: CategoryTask,
    category: TaskCategory,
  ): Promise<void> {
    await this.showNotification({
      title: 'Task Overdue ⚠️',
      body: `"${task.title}" in ${category.display_name} is overdue`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'task_overdue',
        task_id: task.id,
        category_id: category.id,
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'snooze', title: 'Snooze 1 Hour' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
    });
  }

  public async notifySyncCompleted(syncedItems: number): Promise<void> {
    if (syncedItems === 0) return;

    await this.showNotification({
      title: 'Categories Synced',
      body: `${syncedItems} ${syncedItems === 1 ? 'category' : 'categories'} synced successfully`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'sync_completed',
        synced_items: syncedItems,
        organization_id: this.organizationId,
      },
      vibrate: [50],
      silent: true,
      requireInteraction: false,
    });
  }

  public async notifyMilestoneReached(
    milestone: string,
    completedTasks: number,
    totalTasks: number,
  ): Promise<void> {
    const percentage = Math.round((completedTasks / totalTasks) * 100);

    await this.showNotification({
      title: `Milestone Reached! 🏆`,
      body: `${milestone} - ${percentage}% complete (${completedTasks}/${totalTasks} tasks)`,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'milestone_reached',
        milestone,
        percentage,
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view', title: 'View Progress' },
        { action: 'share', title: 'Share Achievement' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [100, 50, 100, 50, 100, 50, 200],
      requireInteraction: false,
    });
  }

  // Batch notifications for multiple category changes
  public async notifyBatchUpdate(
    updatedCategories: TaskCategory[],
  ): Promise<void> {
    if (updatedCategories.length === 0) return;

    const categoryNames = updatedCategories
      .slice(0, 3)
      .map((cat) => cat.display_name)
      .join(', ');
    const additionalCount =
      updatedCategories.length > 3 ? updatedCategories.length - 3 : 0;

    let body = `${categoryNames}`;
    if (additionalCount > 0) {
      body += ` and ${additionalCount} other ${additionalCount === 1 ? 'category' : 'categories'}`;
    }
    body += ` ${updatedCategories.length === 1 ? 'has' : 'have'} been updated`;

    await this.showNotification({
      title: 'Categories Updated',
      body,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'batch_update',
        category_ids: updatedCategories.map((cat) => cat.id),
        organization_id: this.organizationId,
      },
      actions: [
        { action: 'view_all', title: 'View All' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      vibrate: [100, 50, 100],
      silent: updatedCategories.length > 5, // Silent for large batches
    });
  }

  // Schedule notification for future
  public async scheduleNotification(
    delay: number,
    options: NotificationOptions,
  ): Promise<void> {
    setTimeout(async () => {
      await this.showNotification(options);
    }, delay);
  }

  // Get notification settings
  public async getNotificationSettings(): Promise<{
    permission: NotificationPermission;
    isSubscribed: boolean;
    subscription?: PushSubscription;
  }> {
    return {
      permission: Notification.permission,
      isSubscribed: !!this.pushSubscription,
      subscription: this.pushSubscription || undefined,
    };
  }

  // Update notification preferences
  public async updateNotificationPreferences(preferences: {
    categories: boolean;
    tasks: boolean;
    milestones: boolean;
    sync: boolean;
    quietHours: { start: string; end: string } | null;
  }): Promise<void> {
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.userId,
          organization_id: this.organizationId,
          preferences,
        }),
      });
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    }
  }

  // Unsubscribe from notifications
  public async unsubscribe(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            user_id: this.userId,
            organization_id: this.organizationId,
          }),
        });
      }

      this.pushSubscription = null;
      console.log('Unsubscribed from push notifications');
    } catch (error) {
      console.error('Failed to unsubscribe from notifications:', error);
    }
  }

  // Utility function to convert VAPID key
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
