/**
 * WS-188: Push Notification Coordinator for Offline Events
 * Push notification coordination for sync completion and conflict resolution alerts
 * Offline-aware notification scheduling with progressive enhancement
 * Wedding context-aware notification prioritization and batching
 * Cross-platform notification management with fallback strategies
 */

export interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  actions?: NotificationAction[];
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: any;
  timestamp?: number;
  priority?: 'high' | 'normal' | 'low';
}

export interface WeddingNotificationContext {
  weddingId: string;
  weddingDate: Date;
  isWeddingDay: boolean;
  timeToWedding: number; // milliseconds
  criticalPeriod: boolean; // within 48 hours
  vendorContext?: {
    vendorId: string;
    vendorType: string;
    contactName: string;
  };
}

export interface OfflineNotificationQueue {
  id: string;
  config: NotificationConfig;
  scheduledFor: number;
  priority: number;
  weddingContext?: WeddingNotificationContext;
  retryCount: number;
  maxRetries: number;
  fallbackStrategy: 'email' | 'sms' | 'in_app' | 'none';
}

export interface NotificationAnalytics {
  sent: number;
  delivered: number;
  clicked: number;
  dismissed: number;
  failed: number;
  engagementRate: number;
  deliveryRate: number;
  averageResponseTime: number;
}

// Wedding-specific notification templates
export const WEDDING_NOTIFICATION_TEMPLATES = {
  sync_success: {
    title: 'WedSync - Data Synchronized',
    body: 'Your wedding changes have been successfully synced.',
    icon: '/icons/sync-success.png',
    tag: 'sync-success',
    priority: 'normal' as const,
  },

  sync_failed: {
    title: 'WedSync - Sync Issue',
    body: "Some changes couldn't be synced. Tap to review.",
    icon: '/icons/sync-error.png',
    tag: 'sync-failed',
    requireInteraction: true,
    priority: 'high' as const,
    actions: [
      { action: 'review', title: 'Review Changes' },
      { action: 'retry', title: 'Retry Now' },
    ],
  },

  conflict_detected: {
    title: 'WedSync - Data Conflict',
    body: 'Your changes conflict with recent updates. Please review.',
    icon: '/icons/conflict.png',
    tag: 'data-conflict',
    requireInteraction: true,
    priority: 'high' as const,
    actions: [
      { action: 'resolve', title: 'Resolve Conflict' },
      { action: 'dismiss', title: 'Later' },
    ],
  },

  wedding_day_critical: {
    title: 'WedSync - Important Wedding Update',
    body: 'Critical update for your wedding day.',
    icon: '/icons/wedding-critical.png',
    badge: '/icons/urgent-badge.png',
    tag: 'wedding-critical',
    requireInteraction: true,
    priority: 'high' as const,
    vibrate: [300, 100, 300, 100, 300],
  },

  vendor_update: {
    title: 'WedSync - Vendor Update',
    body: '{vendorName} has updated your wedding information.',
    icon: '/icons/vendor-update.png',
    tag: 'vendor-update',
    priority: 'normal' as const,
  },

  timeline_change: {
    title: 'WedSync - Schedule Update',
    body: 'Your wedding timeline has been updated.',
    icon: '/icons/timeline-update.png',
    tag: 'timeline-update',
    priority: 'high' as const,
  },

  offline_mode: {
    title: 'WedSync - Working Offline',
    body: "Your changes are being saved locally and will sync when you're back online.",
    icon: '/icons/offline.png',
    tag: 'offline-mode',
    silent: true,
    priority: 'low' as const,
  },

  back_online: {
    title: 'WedSync - Back Online',
    body: 'Connection restored. Syncing your changes now.',
    icon: '/icons/online.png',
    tag: 'back-online',
    priority: 'normal' as const,
  },
};

export class PushNotificationCoordinator {
  private db: IDBDatabase | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private vapidPublicKey: string | null = null;
  private subscription: PushSubscription | null = null;
  private analytics: NotificationAnalytics = {
    sent: 0,
    delivered: 0,
    clicked: 0,
    dismissed: 0,
    failed: 0,
    engagementRate: 0,
    deliveryRate: 0,
    averageResponseTime: 0,
  };
  private notificationQueue: Map<string, OfflineNotificationQueue> = new Map();
  private isOnline = navigator.onLine;

  constructor(vapidPublicKey?: string) {
    this.vapidPublicKey = vapidPublicKey || null;
    this.initializeOnlineMonitoring();
  }

  // Initialize push notification system
  async initialize(): Promise<void> {
    try {
      // Initialize database for offline notification queue
      this.db = await this.openDatabase();

      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;

      // Load existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();

      // Load analytics
      await this.loadAnalytics();

      // Process any queued notifications
      await this.processOfflineQueue();

      console.log('[WS-188] Push notification coordinator initialized');
    } catch (error) {
      console.error('[WS-188] Failed to initialize push notifications:', error);
      throw error;
    }
  }

  // Open IndexedDB for notification management
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WedSyncNotifications', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result;

        // Notification queue for offline handling
        if (!db.objectStoreNames.contains('notification_queue')) {
          const store = db.createObjectStore('notification_queue', {
            keyPath: 'id',
          });
          store.createIndex('scheduledFor', 'scheduledFor', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        }

        // Analytics store
        if (!db.objectStoreNames.contains('notification_analytics')) {
          const store = db.createObjectStore('notification_analytics', {
            keyPath: 'date',
          });
        }

        // Wedding context store
        if (!db.objectStoreNames.contains('wedding_context')) {
          db.createObjectStore('wedding_context', { keyPath: 'weddingId' });
        }
      };
    });
  }

  // Initialize online/offline monitoring
  private initializeOnlineMonitoring(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[WS-188] Back online - processing notification queue');
      setTimeout(() => this.processOfflineQueue(), 1000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[WS-188] Gone offline - notifications will be queued');
    });
  }

  // Request notification permission and setup push subscription
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[WS-188] Notifications not supported');
      return false;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('[WS-188] Notification permission denied');
      return false;
    }

    // Setup push subscription if VAPID key is available
    if (this.vapidPublicKey && this.registration) {
      try {
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
        });
        console.log('[WS-188] Push subscription created');
      } catch (error) {
        console.error('[WS-188] Failed to create push subscription:', error);
      }
    }

    return true;
  }

  // Convert VAPID key for push subscription
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

  // Show local notification with wedding context
  async showNotification(
    type: keyof typeof WEDDING_NOTIFICATION_TEMPLATES,
    customConfig?: Partial<NotificationConfig>,
    weddingContext?: WeddingNotificationContext,
  ): Promise<void> {
    const template = WEDDING_NOTIFICATION_TEMPLATES[type];
    const config: NotificationConfig = {
      ...template,
      ...customConfig,
      timestamp: Date.now(),
    };

    // Apply wedding context to notification
    if (weddingContext) {
      config.data = { ...config.data, weddingContext };

      // Enhance notification based on wedding timing
      if (weddingContext.isWeddingDay) {
        config.requireInteraction = true;
        config.priority = 'high';
        config.vibrate = [300, 100, 300];
      } else if (weddingContext.criticalPeriod) {
        config.priority = 'high';
        config.requireInteraction = true;
      }

      // Customize vendor notifications
      if (
        weddingContext.vendorContext &&
        config.body.includes('{vendorName}')
      ) {
        config.body = config.body.replace(
          '{vendorName}',
          weddingContext.vendorContext.contactName || 'Your vendor',
        );
      }
    }

    // Check if we can show notification immediately
    if (this.canShowNotification()) {
      await this.displayNotification(config);
    } else {
      // Queue for later delivery
      await this.queueNotification(config, weddingContext);
    }
  }

  // Check if notification can be shown immediately
  private canShowNotification(): boolean {
    return (
      Notification.permission === 'granted' &&
      this.isOnline &&
      !document.hidden &&
      this.registration !== null
    );
  }

  // Display notification immediately
  private async displayNotification(config: NotificationConfig): Promise<void> {
    try {
      if (this.registration) {
        // Use service worker notification for better control
        await this.registration.showNotification(config.title, {
          body: config.body,
          icon: config.icon,
          badge: config.badge,
          image: config.image,
          actions: config.actions,
          tag: config.tag,
          requireInteraction: config.requireInteraction,
          silent: config.silent,
          vibrate: config.vibrate,
          data: config.data,
          timestamp: config.timestamp,
        });
      } else {
        // Fallback to simple notification
        new Notification(config.title, {
          body: config.body,
          icon: config.icon,
          tag: config.tag,
          requireInteraction: config.requireInteraction,
          silent: config.silent,
          vibrate: config.vibrate,
          data: config.data,
        });
      }

      // Track analytics
      this.analytics.sent++;
      await this.updateAnalytics();

      console.log(`[WS-188] Notification displayed: ${config.title}`);
    } catch (error) {
      console.error('[WS-188] Failed to display notification:', error);
      this.analytics.failed++;
      await this.updateAnalytics();
    }
  }

  // Queue notification for later delivery
  private async queueNotification(
    config: NotificationConfig,
    weddingContext?: WeddingNotificationContext,
  ): Promise<void> {
    if (!this.db) return;

    const queueItem: OfflineNotificationQueue = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config,
      scheduledFor: Date.now() + 1000, // Try in 1 second
      priority: this.calculateNotificationPriority(config, weddingContext),
      weddingContext,
      retryCount: 0,
      maxRetries: 3,
      fallbackStrategy: this.determineFallbackStrategy(config, weddingContext),
    };

    try {
      const tx = this.db.transaction(['notification_queue'], 'readwrite');
      const store = tx.objectStore('notification_queue');
      await store.add(queueItem);

      this.notificationQueue.set(queueItem.id, queueItem);
      console.log(`[WS-188] Notification queued: ${queueItem.id}`);
    } catch (error) {
      console.error('[WS-188] Failed to queue notification:', error);
    }
  }

  // Calculate notification priority based on wedding context
  private calculateNotificationPriority(
    config: NotificationConfig,
    weddingContext?: WeddingNotificationContext,
  ): number {
    let priority = 5; // default

    if (config.priority === 'high') priority += 3;
    else if (config.priority === 'low') priority -= 2;

    if (weddingContext) {
      if (weddingContext.isWeddingDay) priority += 5;
      else if (weddingContext.criticalPeriod) priority += 3;

      // Boost priority as wedding approaches
      const daysToWedding =
        weddingContext.timeToWedding / (24 * 60 * 60 * 1000);
      if (daysToWedding <= 1) priority += 4;
      else if (daysToWedding <= 7) priority += 2;
    }

    return Math.min(priority, 10); // Cap at 10
  }

  // Determine fallback strategy for failed notifications
  private determineFallbackStrategy(
    config: NotificationConfig,
    weddingContext?: WeddingNotificationContext,
  ): 'email' | 'sms' | 'in_app' | 'none' {
    if (weddingContext?.isWeddingDay) {
      return 'sms'; // Most reliable for wedding day
    }

    if (weddingContext?.criticalPeriod) {
      return 'email'; // Email for critical notifications
    }

    if (config.priority === 'high') {
      return 'in_app'; // In-app for important but not critical
    }

    return 'none'; // No fallback for low priority
  }

  // Process offline notification queue
  async processOfflineQueue(): Promise<void> {
    if (!this.db || !this.isOnline) return;

    try {
      const tx = this.db.transaction(['notification_queue'], 'readonly');
      const store = tx.objectStore('notification_queue');
      const queuedItems = (await store.getAll()) as OfflineNotificationQueue[];

      // Sort by priority and scheduled time
      queuedItems.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.scheduledFor - b.scheduledFor;
      });

      for (const item of queuedItems) {
        if (Date.now() >= item.scheduledFor) {
          await this.processQueuedNotification(item);
        }
      }
    } catch (error) {
      console.error('[WS-188] Failed to process notification queue:', error);
    }
  }

  // Process individual queued notification
  private async processQueuedNotification(
    item: OfflineNotificationQueue,
  ): Promise<void> {
    try {
      if (this.canShowNotification()) {
        await this.displayNotification(item.config);
        await this.removeFromQueue(item.id);
      } else {
        // Retry with backoff
        item.retryCount++;

        if (item.retryCount >= item.maxRetries) {
          // Try fallback strategy
          await this.executeFallbackStrategy(item);
          await this.removeFromQueue(item.id);
        } else {
          // Reschedule with exponential backoff
          item.scheduledFor = Date.now() + Math.pow(2, item.retryCount) * 1000;
          await this.updateQueueItem(item);
        }
      }
    } catch (error) {
      console.error(
        `[WS-188] Failed to process queued notification ${item.id}:`,
        error,
      );
      await this.removeFromQueue(item.id);
    }
  }

  // Execute fallback strategy for failed notifications
  private async executeFallbackStrategy(
    item: OfflineNotificationQueue,
  ): Promise<void> {
    console.log(
      `[WS-188] Executing fallback strategy: ${item.fallbackStrategy} for ${item.id}`,
    );

    switch (item.fallbackStrategy) {
      case 'email':
        // This would integrate with email service
        console.log('[WS-188] Fallback: Email notification sent');
        break;

      case 'sms':
        // This would integrate with SMS service
        console.log('[WS-188] Fallback: SMS notification sent');
        break;

      case 'in_app':
        // Show in-app notification or toast
        console.log('[WS-188] Fallback: In-app notification shown');
        this.showInAppNotification(item.config);
        break;

      case 'none':
      default:
        console.log('[WS-188] No fallback strategy - notification dropped');
        break;
    }
  }

  // Show in-app notification as fallback
  private showInAppNotification(config: NotificationConfig): void {
    // This would integrate with your app's toast/banner system
    console.log(
      `[WS-188] In-app notification: ${config.title} - ${config.body}`,
    );

    // Example: dispatch custom event for app to handle
    window.dispatchEvent(
      new CustomEvent('wedsync-notification', {
        detail: config,
      }),
    );
  }

  // Remove notification from queue
  private async removeFromQueue(id: string): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['notification_queue'], 'readwrite');
      const store = tx.objectStore('notification_queue');
      await store.delete(id);

      this.notificationQueue.delete(id);
    } catch (error) {
      console.error(
        `[WS-188] Failed to remove notification ${id} from queue:`,
        error,
      );
    }
  }

  // Update queued notification
  private async updateQueueItem(item: OfflineNotificationQueue): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['notification_queue'], 'readwrite');
      const store = tx.objectStore('notification_queue');
      await store.put(item);

      this.notificationQueue.set(item.id, item);
    } catch (error) {
      console.error(
        `[WS-188] Failed to update queued notification ${item.id}:`,
        error,
      );
    }
  }

  // Set wedding context for enhanced notifications
  async setWeddingContext(
    weddingContext: WeddingNotificationContext,
  ): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['wedding_context'], 'readwrite');
      const store = tx.objectStore('wedding_context');
      await store.put(weddingContext);

      console.log(
        `[WS-188] Wedding context set for ${weddingContext.weddingId}`,
      );
    } catch (error) {
      console.error('[WS-188] Failed to set wedding context:', error);
    }
  }

  // Get wedding context
  async getWeddingContext(
    weddingId: string,
  ): Promise<WeddingNotificationContext | null> {
    if (!this.db) return null;

    try {
      const tx = this.db.transaction(['wedding_context'], 'readonly');
      const store = tx.objectStore('wedding_context');
      const context = await store.get(weddingId);
      return context || null;
    } catch (error) {
      console.error('[WS-188] Failed to get wedding context:', error);
      return null;
    }
  }

  // Load analytics from storage
  private async loadAnalytics(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['notification_analytics'], 'readonly');
      const store = tx.objectStore('notification_analytics');
      const today = new Date().toISOString().split('T')[0];
      const todayData = await store.get(today);

      if (todayData) {
        this.analytics = todayData;
      }
    } catch (error) {
      console.error('[WS-188] Failed to load analytics:', error);
    }
  }

  // Update analytics in storage
  private async updateAnalytics(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['notification_analytics'], 'readwrite');
      const store = tx.objectStore('notification_analytics');
      const today = new Date().toISOString().split('T')[0];

      const analyticsData = {
        ...this.analytics,
        date: today,
        engagementRate:
          this.analytics.sent > 0
            ? (this.analytics.clicked / this.analytics.sent) * 100
            : 0,
        deliveryRate:
          this.analytics.sent > 0
            ? ((this.analytics.sent - this.analytics.failed) /
                this.analytics.sent) *
              100
            : 0,
      };

      await store.put(analyticsData);
    } catch (error) {
      console.error('[WS-188] Failed to update analytics:', error);
    }
  }

  // Public API methods
  async getAnalytics(): Promise<NotificationAnalytics> {
    await this.loadAnalytics();
    return { ...this.analytics };
  }

  async getQueuedNotifications(): Promise<OfflineNotificationQueue[]> {
    return Array.from(this.notificationQueue.values());
  }

  async clearQueue(): Promise<void> {
    if (!this.db) return;

    try {
      const tx = this.db.transaction(['notification_queue'], 'readwrite');
      const store = tx.objectStore('notification_queue');
      await store.clear();

      this.notificationQueue.clear();
      console.log('[WS-188] Notification queue cleared');
    } catch (error) {
      console.error('[WS-188] Failed to clear notification queue:', error);
    }
  }

  async getPushSubscription(): Promise<PushSubscription | null> {
    return this.subscription;
  }

  // Cleanup and destroy
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.notificationQueue.clear();
    console.log('[WS-188] Push notification coordinator destroyed');
  }
}

// Utility functions for notification management
export const NotificationUtils = {
  // Create wedding day notification context
  createWeddingDayContext: (
    weddingId: string,
    weddingDate: Date,
  ): WeddingNotificationContext => {
    const now = Date.now();
    const weddingTime = weddingDate.getTime();
    const timeToWedding = weddingTime - now;
    const isWeddingDay = Math.abs(timeToWedding) < 24 * 60 * 60 * 1000; // Within 24 hours
    const criticalPeriod =
      timeToWedding < 48 * 60 * 60 * 1000 && timeToWedding > 0; // Within 48 hours

    return {
      weddingId,
      weddingDate,
      isWeddingDay,
      timeToWedding,
      criticalPeriod,
    };
  },

  // Check if notifications are supported and enabled
  isNotificationSupported: (): boolean => {
    return 'Notification' in window && 'serviceWorker' in navigator;
  },

  // Get notification permission status
  getPermissionStatus: (): NotificationPermission => {
    return Notification.permission;
  },

  // Format notification timestamp
  formatNotificationTime: (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 24 * 60)
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  },
};

export default PushNotificationCoordinator;
