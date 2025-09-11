/**
 * AnalyticsNotifications - Push notifications for vendor performance alerts
 *
 * Features:
 * - Performance threshold alerts (revenue, booking drops, rating changes)
 * - Smart notification timing based on user behavior patterns
 * - Rich notifications with action buttons
 * - Notification batching to avoid spam
 * - Offline notification queueing
 * - Analytics-specific notification templates
 * - User preference management
 * - Notification analytics and engagement tracking
 */

import {
  AnalyticsNotification,
  NotificationAction,
  VendorMetrics,
  MobileSecurityConfig,
} from '@/types/mobile-analytics';

interface NotificationConfig {
  enabled: boolean;
  quietHours: { start: number; end: number }; // Hour of day (0-23)
  maxDaily: number; // Maximum notifications per day
  batchingEnabled: boolean;
  batchingDelay: number; // milliseconds
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  showOnLockScreen: boolean;
  categories: NotificationCategory[];
}

interface NotificationCategory {
  type: AnalyticsNotification['type'];
  enabled: boolean;
  priority: 'low' | 'default' | 'high';
  threshold?: number; // For numeric thresholds
  cooldown: number; // minimum time between notifications of this type
}

interface NotificationTemplate {
  type: AnalyticsNotification['type'];
  title: (data: any) => string;
  body: (data: any) => string;
  icon?: string;
  badge?: string;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
}

interface NotificationSchedule {
  id: string;
  notification: AnalyticsNotification;
  scheduledFor: Date;
  priority: number;
  batchKey?: string; // For grouping notifications
}

interface NotificationStats {
  sent: number;
  clicked: number;
  dismissed: number;
  clickRate: number;
  engagementScore: number;
  lastSent: Date;
}

export class AnalyticsNotifications {
  private config: NotificationConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private notificationQueue: NotificationSchedule[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private dailyCount: number = 0;
  private lastCountReset: Date = new Date();
  private userInteractionPattern: Map<string, Date[]> = new Map();
  private notificationHistory: Map<string, Date> = new Map();
  private stats: NotificationStats;

  // Notification templates for different alert types
  private templates: NotificationTemplate[] = [
    {
      type: 'performance_alert',
      title: (data) => `Performance Alert: ${data.vendorName}`,
      body: (data) => `${data.metric} has ${data.direction} by ${data.change}`,
      icon: '/icons/alert-icon-192.png',
      badge: '/icons/alert-badge-72.png',
      requireInteraction: true,
      actions: [
        { action: 'view_details', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    },
    {
      type: 'booking_milestone',
      title: (data) => `Milestone Reached: ${data.vendorName}`,
      body: (data) =>
        `${data.milestone} bookings achieved! ${data.encouragement}`,
      icon: '/icons/milestone-icon-192.png',
      badge: '/icons/milestone-badge-72.png',
      actions: [
        { action: 'view_analytics', title: 'View Analytics' },
        { action: 'share_achievement', title: 'Share' },
      ],
    },
    {
      type: 'review_received',
      title: (data) => `New Review: ${data.vendorName}`,
      body: (data) => `${data.rating} stars from ${data.clientName}`,
      icon: '/icons/review-icon-192.png',
      badge: '/icons/review-badge-72.png',
      actions: [
        { action: 'view_review', title: 'View Review' },
        { action: 'respond', title: 'Respond' },
      ],
    },
    {
      type: 'payment_due',
      title: (data) => `Payment Due: ${data.clientName}`,
      body: (data) =>
        `Invoice #${data.invoiceNumber} (${data.amount}) is due ${data.dueDate}`,
      icon: '/icons/payment-icon-192.png',
      badge: '/icons/payment-badge-72.png',
      requireInteraction: true,
      actions: [
        { action: 'view_invoice', title: 'View Invoice' },
        { action: 'send_reminder', title: 'Send Reminder' },
      ],
    },
  ];

  constructor(config?: Partial<NotificationConfig>) {
    this.config = {
      enabled: true,
      quietHours: { start: 22, end: 8 }, // 10 PM to 8 AM
      maxDaily: 10,
      batchingEnabled: true,
      batchingDelay: 5 * 60 * 1000, // 5 minutes
      vibrationEnabled: true,
      soundEnabled: true,
      showOnLockScreen: true,
      categories: [
        {
          type: 'performance_alert',
          enabled: true,
          priority: 'high',
          threshold: 20, // 20% change
          cooldown: 2 * 60 * 60 * 1000, // 2 hours
        },
        {
          type: 'booking_milestone',
          enabled: true,
          priority: 'default',
          cooldown: 24 * 60 * 60 * 1000, // 24 hours
        },
        {
          type: 'review_received',
          enabled: true,
          priority: 'default',
          cooldown: 30 * 60 * 1000, // 30 minutes
        },
        {
          type: 'payment_due',
          enabled: true,
          priority: 'high',
          cooldown: 6 * 60 * 60 * 1000, // 6 hours
        },
      ],
      ...config,
    };

    this.stats = {
      sent: 0,
      clicked: 0,
      dismissed: 0,
      clickRate: 0,
      engagementScore: 0,
      lastSent: new Date(),
    };

    this.initialize();
  }

  /**
   * Initialize notifications system
   */
  private async initialize(): Promise<void> {
    try {
      // Request notification permission
      await this.requestPermission();

      // Register service worker for push notifications
      await this.registerServiceWorker();

      // Set up notification click handlers
      this.setupNotificationHandlers();

      // Load user preferences
      await this.loadUserPreferences();

      // Start monitoring vendor performance
      this.startPerformanceMonitoring();
    } catch (error) {
      console.error('[Notifications] Initialization failed:', error);
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    return await Notification.requestPermission();
  }

  /**
   * Register service worker for push notifications
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration =
          await navigator.serviceWorker.register('/sw-analytics.js');

        // Subscribe to push notifications
        await this.subscribeToPush();
      } catch (error) {
        console.error(
          '[Notifications] Service worker registration failed:',
          error,
        );
      }
    }
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPush(): Promise<void> {
    if (!this.registration) return;

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        ),
      });

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('[Notifications] Push subscription failed:', error);
    }
  }

  /**
   * Set up notification event handlers
   */
  private setupNotificationHandlers(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'NOTIFICATION_CLICKED') {
          this.handleNotificationClick(event.data.payload);
        }
      });
    }
  }

  /**
   * Send notification
   */
  async sendNotification(notification: AnalyticsNotification): Promise<void> {
    if (!this.canSendNotification(notification)) {
      return;
    }

    // Check daily limit
    this.checkDailyLimit();
    if (this.dailyCount >= this.config.maxDaily) {
      console.log('[Notifications] Daily limit reached, queueing for tomorrow');
      return;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      console.log('[Notifications] In quiet hours, scheduling for later');
      this.scheduleForLater(notification);
      return;
    }

    if (this.config.batchingEnabled) {
      this.addToBatch(notification);
    } else {
      await this.sendImmediately(notification);
    }
  }

  /**
   * Monitor vendor performance for alerts
   */
  private startPerformanceMonitoring(): void {
    // Set up periodic checks for performance changes
    setInterval(
      async () => {
        try {
          await this.checkPerformanceAlerts();
        } catch (error) {
          console.error('[Notifications] Performance monitoring error:', error);
        }
      },
      15 * 60 * 1000,
    ); // Check every 15 minutes
  }

  /**
   * Check for performance alerts
   */
  private async checkPerformanceAlerts(): Promise<void> {
    try {
      // Fetch current vendor metrics
      const response = await fetch('/api/analytics/vendors/metrics');
      if (!response.ok) return;

      const vendors = (await response.json()) as VendorMetrics[];

      for (const vendor of vendors) {
        await this.checkVendorAlerts(vendor);
      }
    } catch (error) {
      console.error(
        '[Notifications] Error checking performance alerts:',
        error,
      );
    }
  }

  /**
   * Check alerts for individual vendor
   */
  private async checkVendorAlerts(vendor: VendorMetrics): Promise<void> {
    // Get historical data to compare
    const historical = await this.getHistoricalMetrics(vendor.id);
    if (!historical) return;

    // Check revenue changes
    const revenueChange = this.calculatePercentageChange(
      vendor.revenue,
      historical.revenue,
    );

    if (Math.abs(revenueChange) >= 20) {
      // 20% threshold
      await this.sendNotification({
        id: `performance-${vendor.id}-revenue-${Date.now()}`,
        type: 'performance_alert',
        title: `Revenue Alert: ${vendor.name}`,
        body: `Revenue has ${revenueChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(revenueChange).toFixed(1)}%`,
        data: {
          vendorId: vendor.id,
          vendorName: vendor.name,
          metric: 'Revenue',
          direction: revenueChange > 0 ? 'increased' : 'decreased',
          change: `${Math.abs(revenueChange).toFixed(1)}%`,
          url: `/analytics/vendors/${vendor.id}`,
        },
        timestamp: new Date(),
        read: false,
      });
    }

    // Check rating changes
    const ratingChange = vendor.clientRating - historical.clientRating;
    if (Math.abs(ratingChange) >= 0.5) {
      // 0.5 star threshold
      await this.sendNotification({
        id: `performance-${vendor.id}-rating-${Date.now()}`,
        type: 'performance_alert',
        title: `Rating Alert: ${vendor.name}`,
        body: `Rating has ${ratingChange > 0 ? 'improved' : 'dropped'} by ${Math.abs(ratingChange).toFixed(1)} stars`,
        data: {
          vendorId: vendor.id,
          vendorName: vendor.name,
          metric: 'Rating',
          direction: ratingChange > 0 ? 'improved' : 'dropped',
          change: `${Math.abs(ratingChange).toFixed(1)} stars`,
          url: `/analytics/vendors/${vendor.id}`,
        },
        timestamp: new Date(),
        read: false,
      });
    }
  }

  /**
   * Check if notification can be sent
   */
  private canSendNotification(notification: AnalyticsNotification): boolean {
    if (!this.config.enabled) return false;
    if (Notification.permission !== 'granted') return false;

    // Check category settings
    const category = this.config.categories.find(
      (c) => c.type === notification.type,
    );
    if (!category?.enabled) return false;

    // Check cooldown
    const lastNotification = this.notificationHistory.get(
      `${notification.type}-${notification.data?.vendorId}`,
    );
    if (lastNotification) {
      const timeSince = Date.now() - lastNotification.getTime();
      if (timeSince < (category.cooldown || 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if in quiet hours
   */
  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    const { start, end } = this.config.quietHours;

    if (start > end) {
      // Spans midnight (e.g., 22 to 8)
      return hour >= start || hour <= end;
    } else {
      // Same day (e.g., 12 to 14)
      return hour >= start && hour <= end;
    }
  }

  /**
   * Check and reset daily count
   */
  private checkDailyLimit(): void {
    const today = new Date();
    const lastReset = this.lastCountReset;

    if (
      today.getDate() !== lastReset.getDate() ||
      today.getMonth() !== lastReset.getMonth() ||
      today.getFullYear() !== lastReset.getFullYear()
    ) {
      this.dailyCount = 0;
      this.lastCountReset = today;
    }
  }

  /**
   * Add notification to batch
   */
  private addToBatch(notification: AnalyticsNotification): void {
    const schedule: NotificationSchedule = {
      id: notification.id,
      notification,
      scheduledFor: new Date(Date.now() + this.config.batchingDelay),
      priority: this.getNotificationPriority(notification.type),
      batchKey: `${notification.type}-${notification.data?.vendorId || 'general'}`,
    };

    this.notificationQueue.push(schedule);

    // Clear existing batch timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set new batch timeout
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.config.batchingDelay);
  }

  /**
   * Process notification batch
   */
  private async processBatch(): Promise<void> {
    if (this.notificationQueue.length === 0) return;

    // Group notifications by batch key
    const batches = this.groupNotificationsByBatch();

    for (const [batchKey, notifications] of batches) {
      if (notifications.length === 1) {
        await this.sendImmediately(notifications[0].notification);
      } else {
        await this.sendBatchedNotification(batchKey, notifications);
      }
    }

    this.notificationQueue = [];
  }

  /**
   * Group notifications by batch key
   */
  private groupNotificationsByBatch(): Map<string, NotificationSchedule[]> {
    const batches = new Map<string, NotificationSchedule[]>();

    for (const schedule of this.notificationQueue) {
      const key = schedule.batchKey || 'default';
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(schedule);
    }

    return batches;
  }

  /**
   * Send batched notification
   */
  private async sendBatchedNotification(
    batchKey: string,
    notifications: NotificationSchedule[],
  ): Promise<void> {
    const count = notifications.length;
    const firstNotification = notifications[0].notification;

    const batchedNotification: AnalyticsNotification = {
      id: `batch-${batchKey}-${Date.now()}`,
      type: firstNotification.type,
      title: `${count} Analytics Updates`,
      body: this.createBatchedBody(notifications),
      data: {
        batch: true,
        count,
        notifications: notifications.map((n) => n.notification.id),
      },
      timestamp: new Date(),
      read: false,
    };

    await this.sendImmediately(batchedNotification);
  }

  /**
   * Send notification immediately
   */
  private async sendImmediately(
    notification: AnalyticsNotification,
  ): Promise<void> {
    const template = this.getTemplate(notification.type);
    if (!template) return;

    const notificationOptions: NotificationOptions = {
      body: template.body(notification.data || {}),
      icon: template.icon,
      badge: template.badge,
      actions: template.actions,
      requireInteraction: template.requireInteraction,
      data: notification.data,
      tag: `analytics-${notification.type}`,
      timestamp: notification.timestamp.getTime(),
      vibrate: this.config.vibrationEnabled ? [200, 100, 200] : undefined,
      silent: !this.config.soundEnabled,
    };

    if (this.registration) {
      // Use service worker to show notification
      await this.registration.showNotification(
        template.title(notification.data || {}),
        notificationOptions,
      );
    } else {
      // Fallback to direct notification
      new Notification(
        template.title(notification.data || {}),
        notificationOptions,
      );
    }

    // Update statistics
    this.updateStats('sent');
    this.dailyCount++;

    // Record notification history
    if (notification.data?.vendorId) {
      this.notificationHistory.set(
        `${notification.type}-${notification.data.vendorId}`,
        new Date(),
      );
    }
  }

  /**
   * Get notification template
   */
  private getTemplate(
    type: AnalyticsNotification['type'],
  ): NotificationTemplate | undefined {
    return this.templates.find((t) => t.type === type);
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(type: AnalyticsNotification['type']): number {
    const category = this.config.categories.find((c) => c.type === type);
    const priorityMap = { low: 1, default: 2, high: 3 };
    return priorityMap[category?.priority || 'default'];
  }

  /**
   * Handle notification click
   */
  private handleNotificationClick(payload: any): void {
    this.updateStats('clicked');

    // Track user interaction patterns
    this.trackUserInteraction(payload.action || 'click');

    // Route to appropriate page
    if (payload.url) {
      window.open(payload.url, '_blank');
    }
  }

  /**
   * Track user interaction patterns
   */
  private trackUserInteraction(action: string): void {
    const now = new Date();
    if (!this.userInteractionPattern.has(action)) {
      this.userInteractionPattern.set(action, []);
    }

    const interactions = this.userInteractionPattern.get(action)!;
    interactions.push(now);

    // Keep only last 50 interactions
    if (interactions.length > 50) {
      interactions.splice(0, interactions.length - 50);
    }
  }

  /**
   * Create batched notification body
   */
  private createBatchedBody(notifications: NotificationSchedule[]): string {
    const types = [...new Set(notifications.map((n) => n.notification.type))];

    if (types.length === 1) {
      return `${notifications.length} ${types[0].replace('_', ' ')} updates`;
    } else {
      return `Multiple analytics updates available`;
    }
  }

  /**
   * Schedule notification for later
   */
  private scheduleForLater(notification: AnalyticsNotification): void {
    const now = new Date();
    const tomorrow8AM = new Date(now);
    tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
    tomorrow8AM.setHours(8, 0, 0, 0);

    const schedule: NotificationSchedule = {
      id: notification.id,
      notification,
      scheduledFor: tomorrow8AM,
      priority: this.getNotificationPriority(notification.type),
    };

    this.notificationQueue.push(schedule);
  }

  /**
   * Get historical metrics for comparison
   */
  private async getHistoricalMetrics(
    vendorId: string,
  ): Promise<VendorMetrics | null> {
    try {
      const response = await fetch(
        `/api/analytics/vendors/${vendorId}/historical?period=7d`,
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(
        '[Notifications] Error fetching historical metrics:',
        error,
      );
    }
    return null;
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Update notification statistics
   */
  private updateStats(action: 'sent' | 'clicked' | 'dismissed'): void {
    this.stats[action]++;
    this.stats.clickRate =
      this.stats.sent > 0 ? this.stats.clicked / this.stats.sent : 0;
    this.stats.engagementScore =
      (this.stats.clicked + this.stats.dismissed) /
      Math.max(this.stats.sent, 1);
    this.stats.lastSent = new Date();
  }

  /**
   * Load user preferences
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = localStorage.getItem('analytics-notification-prefs');
      if (stored) {
        const preferences = JSON.parse(stored);
        this.config = { ...this.config, ...preferences };
      }
    } catch (error) {
      console.error('[Notifications] Error loading preferences:', error);
    }
  }

  /**
   * Save user preferences
   */
  async saveUserPreferences(
    preferences: Partial<NotificationConfig>,
  ): Promise<void> {
    try {
      this.config = { ...this.config, ...preferences };
      localStorage.setItem(
        'analytics-notification-prefs',
        JSON.stringify(preferences),
      );
    } catch (error) {
      console.error('[Notifications] Error saving preferences:', error);
    }
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(
    subscription: PushSubscription,
  ): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          type: 'analytics',
          preferences: this.config,
        }),
      });
    } catch (error) {
      console.error(
        '[Notifications] Error sending subscription to server:',
        error,
      );
    }
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
   * Destroy notification manager
   */
  destroy(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.notificationQueue = [];
    this.userInteractionPattern.clear();
    this.notificationHistory.clear();
  }
}
