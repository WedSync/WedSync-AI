import {
  PresenceState,
  NotificationUrgency,
  Notification,
  WeddingPresenceContext,
} from '@/types/presence';
import {
  getUserPresence,
  getBulkPresence,
} from '@/lib/presence/presence-manager';
import {
  scheduleNotification,
  sendImmediateNotification,
} from '@/lib/notifications/notification-service';
import {
  logIntegrationActivity,
  logIntegrationError,
} from '@/lib/integrations/audit-logger';
import {
  analyzeUserPresencePatterns,
  getOptimalNotificationTiming,
} from '@/lib/analytics/presence-analytics';

// Wedding-specific notification urgency rules
const weddingNotificationRules = {
  // Timeline changes - high urgency, send to online/idle only
  timelineUpdate: {
    urgency: 'high' as const,
    deferIfBusy: false,
    respectDoNotDisturb: true,
    maxDelay: 30, // minutes
  },

  // General updates - medium urgency, defer if busy
  generalUpdate: {
    urgency: 'medium' as const,
    deferIfBusy: true,
    respectDoNotDisturb: true,
    maxDelay: 120, // 2 hours
  },

  // Emergency coordination - urgent, always send
  emergencyCoordination: {
    urgency: 'urgent' as const,
    deferIfBusy: false,
    respectDoNotDisturb: false,
    maxDelay: 0,
  },

  // Venue updates - high urgency during wedding day
  venueUpdate: {
    urgency: 'high' as const,
    deferIfBusy: false,
    respectDoNotDisturb: true,
    maxDelay: 15, // minutes
  },

  // Vendor coordination - medium urgency
  vendorCoordination: {
    urgency: 'medium' as const,
    deferIfBusy: true,
    respectDoNotDisturb: true,
    maxDelay: 60, // minutes
  },

  // Payment reminders - low urgency
  paymentReminder: {
    urgency: 'low' as const,
    deferIfBusy: true,
    respectDoNotDisturb: true,
    maxDelay: 1440, // 24 hours
  },
} as const;

// Presence-aware notification routing service
export class PresenceAwareNotificationRouter {
  private readonly maxRetries = 3;
  private readonly retryDelay = 60000; // 1 minute

  constructor() {
    // Initialize notification queue monitoring
    this.startQueueMonitoring();
  }

  /**
   * Send presence-aware notification to multiple recipients
   */
  async sendPresenceAwareNotification(
    notification: Notification,
    recipientIds: string[],
    weddingContext?: WeddingPresenceContext,
  ): Promise<void> {
    try {
      // Filter recipients based on presence and urgency
      const immediateRecipients = await this.filterRecipientsByPresence(
        recipientIds,
        notification.urgency,
        weddingContext,
      );

      // Send immediate notifications
      if (immediateRecipients.length > 0) {
        await sendImmediateNotification(notification, immediateRecipients);

        await logIntegrationActivity('system', 'presence_aware_notification', {
          notificationId: notification.id,
          immediateCount: immediateRecipients.length,
          totalRecipients: recipientIds.length,
          urgency: notification.urgency.level,
        });
      }

      // Handle deferred recipients
      const deferredRecipients = recipientIds.filter(
        (id) => !immediateRecipients.includes(id),
      );
      if (deferredRecipients.length > 0) {
        await this.handleDeferredNotifications(
          notification,
          deferredRecipients,
          weddingContext,
        );
      }
    } catch (error) {
      await logIntegrationError('system', 'notification_routing_failed', error);
      throw error;
    }
  }

  /**
   * Filter recipients based on presence status and notification urgency
   */
  async filterRecipientsByPresence(
    recipientIds: string[],
    urgency: NotificationUrgency,
    weddingContext?: WeddingPresenceContext,
  ): Promise<string[]> {
    try {
      const presenceData = await getBulkPresence(recipientIds);
      const filteredRecipients: string[] = [];

      for (const [userId, presence] of Object.entries(presenceData)) {
        // Check if notification should be sent immediately
        const shouldSendNow = await this.shouldSendNotificationNow(
          presence,
          urgency,
          weddingContext,
        );

        if (shouldSendNow) {
          filteredRecipients.push(userId);
        }
      }

      return filteredRecipients;
    } catch (error) {
      await logIntegrationError('system', 'presence_filtering_failed', error);
      // Fallback: send to all recipients if presence filtering fails
      return recipientIds;
    }
  }

  /**
   * Schedule notification for optimal delivery timing
   */
  async scheduleNotificationForLater(
    notification: Notification,
    recipientId: string,
    when: Date,
    weddingContext?: WeddingPresenceContext,
  ): Promise<void> {
    try {
      // Enhance notification with presence context
      const enhancedNotification = {
        ...notification,
        metadata: {
          ...notification.metadata,
          presenceAware: true,
          scheduledReason: 'recipient_not_available',
          weddingContext,
        },
      };

      await scheduleNotification(enhancedNotification, [recipientId], when);

      await logIntegrationActivity(recipientId, 'notification_scheduled', {
        notificationId: notification.id,
        scheduledFor: when.toISOString(),
        reason: 'presence_unavailable',
      });
    } catch (error) {
      await logIntegrationError(
        recipientId,
        'notification_scheduling_failed',
        error,
      );
      throw error;
    }
  }

  /**
   * Get optimal notification timing based on user's presence patterns
   */
  async getOptimalNotificationTiming(recipientId: string): Promise<Date> {
    try {
      // Analyze user's presence patterns
      const patterns = await analyzeUserPresencePatterns(recipientId);

      // Find the next optimal time slot
      const optimalTime = await getOptimalNotificationTiming(
        recipientId,
        patterns,
      );

      // Ensure it's not too far in the future
      const maxDelay = 4 * 60 * 60 * 1000; // 4 hours
      const maxTime = new Date(Date.now() + maxDelay);

      return optimalTime < maxTime ? optimalTime : maxTime;
    } catch (error) {
      // Fallback: schedule for 1 hour from now
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Handle bulk notification with presence intelligence
   */
  async sendBulkPresenceAwareNotification(
    notifications: Notification[],
    recipientIds: string[],
    weddingContext?: WeddingPresenceContext,
  ): Promise<void> {
    try {
      // Process notifications in batches to avoid overwhelming recipients
      const batchSize = 100;

      for (let i = 0; i < recipientIds.length; i += batchSize) {
        const batch = recipientIds.slice(i, i + batchSize);

        // Process each notification for this batch
        for (const notification of notifications) {
          await this.sendPresenceAwareNotification(
            notification,
            batch,
            weddingContext,
          );

          // Small delay between notifications to prevent spam
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      await logIntegrationError('system', 'bulk_notification_failed', error);
      throw error;
    }
  }

  /**
   * Check if notification should be sent immediately based on presence
   */
  private async shouldSendNotificationNow(
    presence: PresenceState,
    urgency: NotificationUrgency,
    weddingContext?: WeddingPresenceContext,
  ): Promise<boolean> {
    // Always send urgent notifications
    if (urgency.level === 'urgent') {
      return true;
    }

    // Wedding day emergency override
    if (
      weddingContext?.isWeddingDay &&
      weddingContext.priorityLevel === 'critical'
    ) {
      return true;
    }

    // Don't disturb if user appears offline intentionally
    if (this.isAppearsOffline(presence)) {
      return urgency.level === 'urgent';
    }

    // Don't send if away/offline unless high urgency or better
    if (
      (presence.status === 'away' || presence.status === 'offline') &&
      urgency.level === 'low'
    ) {
      return false;
    }

    // Don't disturb if busy and should defer
    if (presence.status === 'busy' && urgency.deferIfBusy) {
      return false;
    }

    // Check custom "do not disturb" status
    if (this.hasDoNotDisturbStatus(presence) && urgency.respectDoNotDisturb) {
      return urgency.level === 'urgent';
    }

    // Check business hours for wedding professionals
    if (weddingContext && !this.isInBusinessHours(presence, weddingContext)) {
      return urgency.level === 'high' || urgency.level === 'urgent';
    }

    // Check if user is actively typing or in a call
    if (this.isUserInActiveInteraction(presence)) {
      return urgency.level === 'urgent';
    }

    return true;
  }

  /**
   * Handle notifications that were deferred due to presence
   */
  private async handleDeferredNotifications(
    notification: Notification,
    deferredRecipients: string[],
    weddingContext?: WeddingPresenceContext,
  ): Promise<void> {
    try {
      for (const recipientId of deferredRecipients) {
        // Calculate optimal delivery time
        const optimalTime =
          await this.getOptimalNotificationTiming(recipientId);

        // Ensure we don't exceed max delay
        const maxDelayTime = new Date(
          Date.now() + notification.urgency.maxDelay * 60 * 1000,
        );

        const deliveryTime =
          optimalTime < maxDelayTime ? optimalTime : maxDelayTime;

        // Schedule for later delivery
        await this.scheduleNotificationForLater(
          notification,
          recipientId,
          deliveryTime,
          weddingContext,
        );
      }
    } catch (error) {
      await logIntegrationError(
        'system',
        'deferred_notification_handling_failed',
        error,
      );

      // Fallback: send immediately to prevent lost notifications
      await sendImmediateNotification(notification, deferredRecipients);
    }
  }

  /**
   * Check if user has "appears offline" setting enabled
   */
  private isAppearsOffline(presence: PresenceState): boolean {
    return (
      presence.customStatus?.toLowerCase().includes('appear offline') ||
      presence.customStatus?.toLowerCase().includes('invisible') ||
      false
    ); // Would check user settings in real implementation
  }

  /**
   * Check if user has do not disturb status
   */
  private hasDoNotDisturbStatus(presence: PresenceState): boolean {
    const dndIndicators = [
      'do not disturb',
      'dnd',
      'focus time',
      'busy - no interruptions',
    ];
    const customStatus = presence.customStatus?.toLowerCase() || '';

    return dndIndicators.some((indicator) => customStatus.includes(indicator));
  }

  /**
   * Check if notification time is within user's business hours
   */
  private isInBusinessHours(
    presence: PresenceState,
    weddingContext: WeddingPresenceContext,
  ): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Wedding professionals typically work extended hours
    if (
      weddingContext.role === 'photographer' ||
      weddingContext.role === 'planner'
    ) {
      // Extended business hours: 8 AM - 10 PM, Tuesday - Saturday
      return day >= 2 && day <= 6 && hour >= 8 && hour <= 22;
    }

    if (weddingContext.role === 'venue_coordinator') {
      // Venue coordinators work weekends but have Monday/Tuesday off
      return (day === 0 || (day >= 3 && day <= 6)) && hour >= 9 && hour <= 21;
    }

    // Default business hours: 9 AM - 6 PM, Monday - Friday
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 18;
  }

  /**
   * Check if user is in active interaction (typing, in call, etc.)
   */
  private isUserInActiveInteraction(presence: PresenceState): boolean {
    // Check for active indicators
    const activeIndicators = [
      'typing',
      'in call',
      'presenting',
      'screen sharing',
    ];
    const customStatus = presence.customStatus?.toLowerCase() || '';

    return (
      activeIndicators.some((indicator) => customStatus.includes(indicator)) ||
      presence.currentPage?.includes('/call/') ||
      presence.currentPage?.includes('/meeting/') ||
      false
    ); // Would check for typing indicators in real implementation
  }

  /**
   * Start monitoring notification queue for optimization
   */
  private startQueueMonitoring(): void {
    // Monitor notification queue every 5 minutes
    setInterval(
      async () => {
        try {
          await this.optimizeNotificationQueue();
        } catch (error) {
          console.error('Notification queue optimization failed:', error);
        }
      },
      5 * 60 * 1000,
    ); // 5 minutes
  }

  /**
   * Optimize notification queue based on real-time presence changes
   */
  private async optimizeNotificationQueue(): Promise<void> {
    try {
      // Get pending scheduled notifications
      const pendingNotifications =
        await this.getPendingScheduledNotifications();

      for (const scheduledNotification of pendingNotifications) {
        const recipientId = scheduledNotification.recipientId;
        const currentPresence = await getUserPresence(recipientId);

        if (currentPresence) {
          // Check if user is now available for immediate delivery
          const canSendNow = await this.shouldSendNotificationNow(
            currentPresence,
            scheduledNotification.notification.urgency,
          );

          if (canSendNow && scheduledNotification.scheduledFor > new Date()) {
            // Move from scheduled to immediate delivery
            await this.moveToImmediateDelivery(scheduledNotification);
          }
        }
      }
    } catch (error) {
      console.error('Queue optimization failed:', error);
    }
  }

  private async getPendingScheduledNotifications(): Promise<any[]> {
    // Implementation would query the notification queue
    return [];
  }

  private async moveToImmediateDelivery(
    scheduledNotification: any,
  ): Promise<void> {
    // Implementation would move notification from scheduled to immediate queue
    console.log(
      `Moving notification ${scheduledNotification.id} to immediate delivery`,
    );
  }
}

// Export wedding-specific notification rule helpers
export function getWeddingNotificationRule(
  type: keyof typeof weddingNotificationRules,
): NotificationUrgency {
  return weddingNotificationRules[type];
}

// Export singleton instance
export const presenceAwareRouter = new PresenceAwareNotificationRouter();
