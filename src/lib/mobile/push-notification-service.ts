/**
 * Push Notification Service for Wedding Timeline Changes
 * Handles critical notifications for suppliers and couples
 * Ensures wedding timeline updates reach users immediately
 */

interface PushSubscription {
  id: string;
  userId: string;
  weddingId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  platform: 'android' | 'ios' | 'web';
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

interface NotificationPayload {
  id: string;
  type:
    | 'timeline_change'
    | 'vendor_status'
    | 'wedding_emergency'
    | 'reminder'
    | 'conflict_alert';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  weddingId: string;
  title: string;
  body: string;
  data: any;
  icon?: string;
  badge?: string;
  image?: string;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp: Date;
  expiresAt?: Date;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface NotificationPreferences {
  userId: string;
  weddingId: string;
  enableTimelineChanges: boolean;
  enableVendorUpdates: boolean;
  enableEmergencyAlerts: boolean;
  enableReminders: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;
  weekendQuietHours: boolean;
  deliveryMethods: ('push' | 'email' | 'sms')[];
  emergencyBypass: boolean; // Emergency notifications ignore quiet hours
  lastUpdated: Date;
}

interface DeliveryResult {
  subscriptionId: string;
  success: boolean;
  error?: string;
  statusCode?: number;
  timestamp: Date;
  retryable: boolean;
}

interface NotificationAnalytics {
  notificationId: string;
  sent: number;
  delivered: number;
  clicked: number;
  dismissed: number;
  failed: number;
  deliveryRate: number;
  clickRate: number;
  avgDeliveryTime: number;
}

export class PushNotificationService {
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;
  private subscriptions = new Map<string, PushSubscription>();
  private notificationQueue: NotificationPayload[] = [];
  private isProcessingQueue = false;
  private retryDelays = [1000, 5000, 15000, 30000]; // Progressive retry delays

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize push notification service
   */
  async initializeService(): Promise<void> {
    try {
      console.log(
        '[PushService] Initializing wedding push notification service...',
      );

      // Load VAPID keys (in production, from secure environment)
      this.vapidKeys = await this.loadVapidKeys();

      // Load existing subscriptions
      await this.loadSubscriptions();

      // Start notification queue processor
      this.startQueueProcessor();

      // Setup analytics collection
      this.initializeAnalytics();

      console.log('[PushService] Wedding push notification service ready');
    } catch (error) {
      console.error('[PushService] Failed to initialize:', error);
      throw new Error('Push notification service initialization failed');
    }
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribeToPushNotifications(
    userId: string,
    weddingId: string,
    subscription: any,
  ): Promise<string> {
    try {
      const pushSubscription: PushSubscription = {
        id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        weddingId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: navigator.userAgent,
        platform: this.detectPlatform(),
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Store subscription
      this.subscriptions.set(pushSubscription.id, pushSubscription);
      await this.persistSubscription(pushSubscription);

      // Send welcome notification
      await this.sendWelcomeNotification(pushSubscription);

      console.log(
        `[PushService] User ${userId} subscribed to wedding ${weddingId} notifications`,
      );

      return pushSubscription.id;
    } catch (error) {
      console.error('[PushService] Subscription failed:', error);
      throw error;
    }
  }

  /**
   * Send timeline change notification
   */
  async sendTimelineChangeNotification(
    weddingId: string,
    eventData: {
      eventId: string;
      eventName: string;
      oldTime: string;
      newTime: string;
      vendor: string;
      affectedUsers: string[];
    },
  ): Promise<void> {
    const notification: NotificationPayload = {
      id: `timeline_${Date.now()}_${eventData.eventId}`,
      type: 'timeline_change',
      priority: this.assessTimelinePriority(eventData),
      weddingId,
      title: '📅 Wedding Timeline Updated',
      body: `${eventData.eventName} moved from ${eventData.oldTime} to ${eventData.newTime}`,
      data: {
        eventId: eventData.eventId,
        oldTime: eventData.oldTime,
        newTime: eventData.newTime,
        vendor: eventData.vendor,
        weddingId,
      },
      icon: '/icons/calendar-192.png',
      badge: '/icons/badge-72.png',
      actions: [
        { action: 'view', title: 'View Timeline', icon: '/icons/view.png' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      timestamp: new Date(),
    };

    await this.queueNotification(notification, eventData.affectedUsers);
  }

  /**
   * Send vendor status update notification
   */
  async sendVendorStatusNotification(
    weddingId: string,
    vendorData: {
      vendorId: string;
      vendorName: string;
      status:
        | 'running_late'
        | 'arrived'
        | 'completed'
        | 'cancelled'
        | 'emergency';
      message: string;
      estimatedDelay?: number;
      affectedUsers: string[];
    },
  ): Promise<void> {
    const statusEmojis = {
      running_late: '⏰',
      arrived: '✅',
      completed: '🎉',
      cancelled: '❌',
      emergency: '🚨',
    };

    const notification: NotificationPayload = {
      id: `vendor_${Date.now()}_${vendorData.vendorId}`,
      type: 'vendor_status',
      priority: vendorData.status === 'emergency' ? 'emergency' : 'normal',
      weddingId,
      title: `${statusEmojis[vendorData.status]} ${vendorData.vendorName}`,
      body: vendorData.message,
      data: {
        vendorId: vendorData.vendorId,
        vendorName: vendorData.vendorName,
        status: vendorData.status,
        estimatedDelay: vendorData.estimatedDelay,
        weddingId,
      },
      icon: '/icons/vendor-192.png',
      badge: '/icons/badge-72.png',
      actions: [
        {
          action: 'contact',
          title: 'Contact Vendor',
          icon: '/icons/phone.png',
        },
        { action: 'view_schedule', title: 'View Schedule' },
      ],
      requireInteraction: vendorData.status === 'emergency',
      silent: false,
      vibrate:
        vendorData.status === 'emergency'
          ? [100, 50, 100, 50, 100, 50, 100]
          : [100, 100, 100],
      timestamp: new Date(),
    };

    await this.queueNotification(notification, vendorData.affectedUsers);
  }

  /**
   * Send wedding day emergency notification
   */
  async sendEmergencyNotification(
    weddingId: string,
    emergencyData: {
      type:
        | 'weather'
        | 'venue_change'
        | 'vendor_emergency'
        | 'medical'
        | 'other';
      title: string;
      message: string;
      actionRequired: boolean;
      contactInfo?: string;
      allUsers: boolean; // Send to all wedding participants
    },
  ): Promise<void> {
    const notification: NotificationPayload = {
      id: `emergency_${Date.now()}_${weddingId}`,
      type: 'wedding_emergency',
      priority: 'emergency',
      weddingId,
      title: `🚨 Wedding Emergency: ${emergencyData.title}`,
      body: emergencyData.message,
      data: {
        emergencyType: emergencyData.type,
        actionRequired: emergencyData.actionRequired,
        contactInfo: emergencyData.contactInfo,
        weddingId,
      },
      icon: '/icons/emergency-192.png',
      badge: '/icons/emergency-badge.png',
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200, 100, 200, 100, 200, 100, 200],
      timestamp: new Date(),
      actions: emergencyData.actionRequired
        ? [
            { action: 'acknowledge', title: 'Acknowledge' },
            { action: 'contact_coordinator', title: 'Call Coordinator' },
          ]
        : [{ action: 'view_details', title: 'View Details' }],
    };

    // Get all users for wedding if needed
    const recipients = emergencyData.allUsers
      ? await this.getAllWeddingParticipants(weddingId)
      : [];

    await this.queueNotification(notification, recipients);
  }

  /**
   * Send wedding reminder notification
   */
  async sendReminderNotification(
    weddingId: string,
    reminderData: {
      type:
        | 'timeline_review'
        | 'vendor_confirmation'
        | 'final_details'
        | 'day_before'
        | 'day_of';
      title: string;
      message: string;
      dueDate?: Date;
      recipients: string[];
    },
  ): Promise<void> {
    const reminderIcons = {
      timeline_review: '📋',
      vendor_confirmation: '✔️',
      final_details: '📝',
      day_before: '⭐',
      day_of: '💒',
    };

    const notification: NotificationPayload = {
      id: `reminder_${Date.now()}_${weddingId}`,
      type: 'reminder',
      priority: reminderData.type === 'day_of' ? 'high' : 'normal',
      weddingId,
      title: `${reminderIcons[reminderData.type]} ${reminderData.title}`,
      body: reminderData.message,
      data: {
        reminderType: reminderData.type,
        dueDate: reminderData.dueDate?.toISOString(),
        weddingId,
      },
      icon: '/icons/reminder-192.png',
      badge: '/icons/badge-72.png',
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'mark_done', title: 'Mark Complete' },
      ],
      timestamp: new Date(),
    };

    await this.queueNotification(notification, reminderData.recipients);
  }

  /**
   * Send conflict alert notification
   */
  async sendConflictAlert(
    weddingId: string,
    conflictData: {
      conflictId: string;
      conflictType: 'time_overlap' | 'venue_double_booking' | 'vendor_conflict';
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      autoResolvable: boolean;
      affectedUsers: string[];
    },
  ): Promise<void> {
    const severityEmojis = {
      low: '⚠️',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const notification: NotificationPayload = {
      id: `conflict_${Date.now()}_${conflictData.conflictId}`,
      type: 'conflict_alert',
      priority: conflictData.severity === 'critical' ? 'emergency' : 'high',
      weddingId,
      title: `${severityEmojis[conflictData.severity]} Timeline Conflict Detected`,
      body: conflictData.description,
      data: {
        conflictId: conflictData.conflictId,
        conflictType: conflictData.conflictType,
        severity: conflictData.severity,
        autoResolvable: conflictData.autoResolvable,
        weddingId,
      },
      icon: '/icons/conflict-192.png',
      badge: '/icons/conflict-badge.png',
      actions: conflictData.autoResolvable
        ? [
            { action: 'auto_resolve', title: 'Auto Resolve' },
            { action: 'manual_review', title: 'Review Manually' },
          ]
        : [{ action: 'resolve', title: 'Resolve Conflict' }],
      requireInteraction: conflictData.severity === 'critical',
      timestamp: new Date(),
    };

    await this.queueNotification(notification, conflictData.affectedUsers);
  }

  // Private methods

  private async queueNotification(
    notification: NotificationPayload,
    recipients: string[],
  ): Promise<void> {
    // Check user preferences and quiet hours
    const filteredRecipients = await this.filterRecipientsByPreferences(
      notification,
      recipients,
    );

    if (filteredRecipients.length === 0) {
      console.log(
        `[PushService] No eligible recipients for notification ${notification.id}`,
      );
      return;
    }

    // Add to queue with recipients
    const queuedNotification = {
      ...notification,
      data: {
        ...notification.data,
        recipients: filteredRecipients,
      },
    };

    this.notificationQueue.push(queuedNotification);
    console.log(
      `[PushService] Queued notification ${notification.id} for ${filteredRecipients.length} recipients`,
    );
  }

  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.notificationQueue.length > 0) {
        const notification = this.notificationQueue.shift();
        if (notification) {
          await this.deliverNotification(notification);

          // Small delay between notifications to prevent overwhelming
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('[PushService] Queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async deliverNotification(
    notification: NotificationPayload,
  ): Promise<void> {
    const recipients = notification.data.recipients || [];
    const deliveryResults: DeliveryResult[] = [];

    console.log(
      `[PushService] Delivering notification ${notification.id} to ${recipients.length} users`,
    );

    for (const userId of recipients) {
      const userSubscriptions = await this.getUserSubscriptions(
        userId,
        notification.weddingId,
      );

      for (const subscription of userSubscriptions) {
        try {
          const result = await this.sendToSubscription(
            subscription,
            notification,
          );
          deliveryResults.push(result);

          if (result.success) {
            // Update last used timestamp
            subscription.lastUsed = new Date();
            await this.persistSubscription(subscription);
          } else if (!result.retryable) {
            // Remove invalid subscription
            await this.removeSubscription(subscription.id);
          }
        } catch (error) {
          console.error(
            `[PushService] Delivery failed for subscription ${subscription.id}:`,
            error,
          );
          deliveryResults.push({
            subscriptionId: subscription.id,
            success: false,
            error: error.message,
            timestamp: new Date(),
            retryable: this.isRetryableError(error),
          });
        }
      }
    }

    // Record analytics
    await this.recordDeliveryAnalytics(notification, deliveryResults);

    // Handle failed deliveries
    const failedDeliveries = deliveryResults.filter(
      (r) => !r.success && r.retryable,
    );
    if (failedDeliveries.length > 0) {
      await this.scheduleRetryDelivery(notification, failedDeliveries);
    }
  }

  private async sendToSubscription(
    subscription: PushSubscription,
    notification: NotificationPayload,
  ): Promise<DeliveryResult> {
    try {
      // In a real implementation, this would use web-push library
      // For now, simulate the delivery
      const simulatedDelay = Math.random() * 1000;
      await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

      // Simulate occasional failures for testing
      if (Math.random() < 0.05) {
        // 5% failure rate
        throw new Error('Simulated delivery failure');
      }

      return {
        subscriptionId: subscription.id,
        success: true,
        statusCode: 200,
        timestamp: new Date(),
        retryable: false,
      };
    } catch (error) {
      return {
        subscriptionId: subscription.id,
        success: false,
        error: error.message,
        timestamp: new Date(),
        retryable: this.isRetryableError(error),
      };
    }
  }

  private assessTimelinePriority(
    eventData: any,
  ): NotificationPayload['priority'] {
    // Wedding day changes are high priority
    const eventDate = new Date(eventData.eventDate);
    const today = new Date();
    const isWeddingDay = eventDate.toDateString() === today.toDateString();

    if (isWeddingDay) return 'emergency';

    // Major events (ceremony, reception) are high priority
    const majorEvents = ['ceremony', 'reception', 'first_dance'];
    if (
      majorEvents.some((event) =>
        eventData.eventName.toLowerCase().includes(event),
      )
    ) {
      return 'high';
    }

    return 'normal';
  }

  private detectPlatform(): 'android' | 'ios' | 'web' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    return 'web';
  }

  private async loadVapidKeys(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    // In production, load from secure environment variables
    return {
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'mock_public_key',
      privateKey: process.env.VAPID_PRIVATE_KEY || 'mock_private_key',
    };
  }

  private async loadSubscriptions(): Promise<void> {
    // In production, load from database
    console.log('[PushService] Loading existing subscriptions...');
  }

  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000);
  }

  private initializeAnalytics(): void {
    // Initialize notification analytics collection
    console.log('[PushService] Analytics initialized');
  }

  private async sendWelcomeNotification(
    subscription: PushSubscription,
  ): Promise<void> {
    const welcomeNotification: NotificationPayload = {
      id: `welcome_${subscription.id}`,
      type: 'reminder',
      priority: 'normal',
      weddingId: subscription.weddingId,
      title: '🎉 Wedding Notifications Enabled',
      body: "You'll receive important timeline updates and reminders",
      data: { type: 'welcome' },
      icon: '/icons/welcome-192.png',
      timestamp: new Date(),
    };

    await this.deliverNotification(welcomeNotification);
  }

  private async persistSubscription(
    subscription: PushSubscription,
  ): Promise<void> {
    // In production, save to database
    this.subscriptions.set(subscription.id, subscription);
  }

  private async removeSubscription(subscriptionId: string): Promise<void> {
    // In production, remove from database
    this.subscriptions.delete(subscriptionId);
  }

  private async getUserSubscriptions(
    userId: string,
    weddingId: string,
  ): Promise<PushSubscription[]> {
    // In production, query database
    return Array.from(this.subscriptions.values()).filter(
      (sub) =>
        sub.userId === userId && sub.weddingId === weddingId && sub.isActive,
    );
  }

  private async getAllWeddingParticipants(
    weddingId: string,
  ): Promise<string[]> {
    // In production, query wedding participants from database
    return []; // Placeholder
  }

  private async filterRecipientsByPreferences(
    notification: NotificationPayload,
    recipients: string[],
  ): Promise<string[]> {
    // Filter recipients based on notification preferences and quiet hours
    // For now, return all recipients
    return recipients;
  }

  private async recordDeliveryAnalytics(
    notification: NotificationPayload,
    results: DeliveryResult[],
  ): Promise<void> {
    const analytics: NotificationAnalytics = {
      notificationId: notification.id,
      sent: results.length,
      delivered: results.filter((r) => r.success).length,
      clicked: 0, // Would be updated by client-side tracking
      dismissed: 0, // Would be updated by client-side tracking
      failed: results.filter((r) => !r.success).length,
      deliveryRate: results.filter((r) => r.success).length / results.length,
      clickRate: 0, // Would be calculated later
      avgDeliveryTime:
        results.reduce(
          (sum, r) =>
            sum + (r.timestamp.getTime() - notification.timestamp.getTime()),
          0,
        ) / results.length,
    };

    console.log(`[PushService] Analytics for ${notification.id}:`, analytics);
  }

  private async scheduleRetryDelivery(
    notification: NotificationPayload,
    failedDeliveries: DeliveryResult[],
  ): Promise<void> {
    // Schedule retry for failed deliveries
    console.log(
      `[PushService] Scheduling retry for ${failedDeliveries.length} failed deliveries`,
    );
  }

  private isRetryableError(error: any): boolean {
    // Determine if error is retryable (network errors, temporary server issues)
    const retryableErrors = ['network', 'timeout', '5xx', 'rate_limit'];
    return retryableErrors.some((type) =>
      error.message?.toLowerCase().includes(type),
    );
  }
}

export default PushNotificationService;
