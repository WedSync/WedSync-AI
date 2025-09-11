import { createClient } from '@supabase/supabase-js';
import type {
  NotificationChannelProvider,
  ProcessedNotification,
  NotificationDeliveryResult,
  NotificationEvent,
} from '../../../types/notification-backend';

interface InAppNotification {
  id: string;
  user_id: string;
  wedding_id?: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  status: 'unread' | 'read' | 'archived';
  action_url?: string;
  action_label?: string;
  icon?: string;
  color?: string;
  metadata?: Record<string, any>;
  expires_at?: string;
  created_at: string;
  read_at?: string;
}

interface InAppDisplayConfig {
  showToast: boolean;
  persistent: boolean;
  position:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'center';
  duration: number; // ms, 0 = permanent until dismissed
  sound: boolean;
  vibration: boolean;
}

export class InAppNotificationProvider implements NotificationChannelProvider {
  private supabase;

  constructor() {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      throw new Error(
        'Supabase configuration not found. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
      );
    }

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  async send(
    notification: ProcessedNotification,
  ): Promise<NotificationDeliveryResult> {
    const startTime = Date.now();

    try {
      // Validate user ID (recipientId should be a user UUID)
      if (!this.isValidUUID(notification.recipientId)) {
        return {
          success: false,
          channel: 'in_app',
          providerId: 'supabase',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: 'Invalid user ID format',
          latency: Date.now() - startTime,
        };
      }

      // Generate in-app notification data
      const inAppNotification = this.generateInAppNotification(notification);

      // Store notification in database
      const { data: dbResult, error: dbError } = await this.supabase
        .from('in_app_notifications')
        .insert(inAppNotification)
        .select('id')
        .single();

      if (dbError || !dbResult) {
        return {
          success: false,
          channel: 'in_app',
          providerId: 'supabase',
          recipientId: notification.recipientId,
          messageId: '',
          timestamp: new Date(),
          error: `Database error: ${dbError?.message || 'Failed to store notification'}`,
          latency: Date.now() - startTime,
        };
      }

      // Send real-time notification via Supabase Realtime
      const realtimeChannel = `user:${notification.recipientId}:notifications`;
      const { error: realtimeError } = await this.supabase
        .channel(realtimeChannel)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            notification: inAppNotification,
            display: this.getDisplayConfig(notification),
            timestamp: new Date().toISOString(),
          },
        });

      if (realtimeError) {
        // Still mark as successful since the notification is stored in DB
        console.warn(
          'Realtime notification failed but DB notification stored:',
          realtimeError,
        );
      }

      // Update user's unread notification count
      await this.updateUnreadCount(notification.recipientId);

      // Send browser notification if user has granted permission and is offline
      await this.sendBrowserNotificationIfNeeded(
        notification,
        inAppNotification,
      );

      return {
        success: true,
        channel: 'in_app',
        providerId: 'supabase',
        recipientId: notification.recipientId,
        messageId: dbResult.id,
        timestamp: new Date(),
        latency: Date.now() - startTime,
        metadata: {
          stored_in_db: true,
          realtime_sent: !realtimeError,
          channel: realtimeChannel,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        channel: 'in_app',
        providerId: 'supabase',
        recipientId: notification.recipientId,
        messageId: '',
        timestamp: new Date(),
        error: error.message || 'In-app notification delivery failed',
        latency: Date.now() - startTime,
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
      // Test database connection
      const { error } = await this.supabase
        .from('in_app_notifications')
        .select('count(*)')
        .limit(1);

      return {
        healthy: !error,
        latency: Date.now() - startTime,
        errorRate: error ? 1 : 0,
      };
    } catch (error) {
      return {
        healthy: false,
        latency: Date.now() - startTime,
        errorRate: 1,
      };
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private generateInAppNotification(
    notification: ProcessedNotification,
  ): InAppNotification {
    const context = notification.event.context;
    const notificationId = crypto.randomUUID();

    let title = '';
    let message = notification.content;
    let icon = '';
    let color = '';
    let actionUrl = '';
    let actionLabel = '';
    let expiresAt: string | undefined;

    switch (notification.event.type) {
      case 'wedding_emergency':
      case 'emergency':
        title = '🚨 Wedding Emergency';
        icon = 'emergency';
        color = '#dc2626'; // Red
        actionUrl = context?.emergencyUrl || '/dashboard/emergencies';
        actionLabel = 'Handle Emergency';
        break;

      case 'weather_alert':
        title = '🌦️ Weather Alert';
        icon = 'weather';
        color = '#f59e0b'; // Amber
        actionUrl = context?.weatherUrl || '/dashboard/weather';
        actionLabel = 'View Weather';
        break;

      case 'vendor_update':
      case 'vendor_message':
        title = `📋 ${context?.vendorName || 'Vendor'} Update`;
        icon = 'vendor';
        color = '#3b82f6'; // Blue
        actionUrl =
          context?.vendorUrl || `/dashboard/vendors/${context?.vendorId}`;
        actionLabel = 'View Message';
        break;

      case 'timeline_change':
      case 'schedule_update':
        title = '⏰ Timeline Update';
        icon = 'schedule';
        color = '#10b981'; // Green
        actionUrl = context?.timelineUrl || '/dashboard/timeline';
        actionLabel = 'View Timeline';
        break;

      case 'payment_reminder':
        title = '💳 Payment Due';
        icon = 'payment';
        color = '#8b5cf6'; // Purple
        actionUrl = context?.paymentUrl || '/dashboard/payments';
        actionLabel = 'Pay Now';
        // Payment reminders expire after 30 days
        expiresAt = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;

      case 'guest_rsvp':
        title = '👥 New RSVP';
        icon = 'guests';
        color = '#06b6d4'; // Cyan
        actionUrl = context?.guestUrl || '/dashboard/guests';
        actionLabel = 'View Guest';
        break;

      case 'vendor_cancellation':
        title = '❌ Vendor Cancellation';
        icon = 'warning';
        color = '#dc2626'; // Red
        actionUrl = context?.vendorUrl || '/dashboard/vendors';
        actionLabel = 'Find Replacement';
        break;

      case 'venue_confirmation':
        title = '🏛️ Venue Confirmed';
        icon = 'venue';
        color = '#10b981'; // Green
        actionUrl = context?.venueUrl || '/dashboard/venues';
        actionLabel = 'View Details';
        break;

      case 'photo_ready':
        title = '📸 Photos Ready';
        icon = 'photos';
        color = '#f59e0b'; // Amber
        actionUrl = context?.photoUrl || '/dashboard/photos';
        actionLabel = 'View Photos';
        // Photo notifications expire after 90 days
        expiresAt = new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ).toISOString();
        break;

      default:
        title = `📱 ${context?.weddingTitle || 'Wedding'} Update`;
        icon = 'notification';
        color = '#6366f1'; // Indigo
        actionUrl = '/dashboard';
        actionLabel = 'View Details';
    }

    return {
      id: notificationId,
      user_id: notification.recipientId,
      wedding_id: notification.event.weddingId,
      type: notification.event.type,
      title,
      message,
      priority: notification.priority as any,
      status: 'unread',
      action_url: actionUrl,
      action_label: actionLabel,
      icon,
      color,
      metadata: {
        originalEventId: notification.event.id,
        context: notification.event.context,
        channel: 'in_app',
        processingTimestamp: notification.event.timestamp,
      },
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };
  }

  private getDisplayConfig(
    notification: ProcessedNotification,
  ): InAppDisplayConfig {
    const priority = notification.priority;

    switch (priority) {
      case 'emergency':
        return {
          showToast: true,
          persistent: true,
          position: 'center',
          duration: 0, // Permanent until dismissed
          sound: true,
          vibration: true,
        };

      case 'high':
        return {
          showToast: true,
          persistent: true,
          position: 'top-right',
          duration: 15000, // 15 seconds
          sound: true,
          vibration: false,
        };

      case 'medium':
        return {
          showToast: true,
          persistent: false,
          position: 'top-right',
          duration: 8000, // 8 seconds
          sound: false,
          vibration: false,
        };

      default: // low
        return {
          showToast: false, // Only show in notification panel
          persistent: false,
          position: 'top-right',
          duration: 5000, // 5 seconds if shown as toast
          sound: false,
          vibration: false,
        };
    }
  }

  private async updateUnreadCount(userId: string): Promise<void> {
    try {
      // Update user's unread notification count
      const { error } = await this.supabase.rpc(
        'increment_unread_notifications',
        {
          user_id: userId,
        },
      );

      if (error) {
        console.warn('Failed to update unread notification count:', error);
      }
    } catch (error) {
      console.warn('Error updating unread notification count:', error);
    }
  }

  private async sendBrowserNotificationIfNeeded(
    notification: ProcessedNotification,
    inAppNotification: InAppNotification,
  ): Promise<void> {
    try {
      // Check if user is online via presence table
      const { data: presence } = await this.supabase
        .from('user_presence')
        .select('online_at')
        .eq('user_id', notification.recipientId)
        .single();

      // If user hasn't been online in the last 5 minutes, they're likely offline
      const isOffline =
        !presence ||
        new Date(presence.online_at) < new Date(Date.now() - 5 * 60 * 1000);

      if (isOffline && notification.priority !== 'low') {
        // Send browser notification for offline users
        // This would integrate with the Web Push API or service worker
        await this.triggerBrowserNotification(notification, inAppNotification);
      }
    } catch (error) {
      console.warn(
        'Failed to check user online status or send browser notification:',
        error,
      );
    }
  }

  private async triggerBrowserNotification(
    notification: ProcessedNotification,
    inAppNotification: InAppNotification,
  ): Promise<void> {
    try {
      // This would trigger a push notification to the user's browser
      // even when they're not on the site (via service worker)

      // For now, we'll just log this - in a real implementation,
      // this would integrate with the Push Provider or a service worker
      console.log('Would send browser notification to offline user:', {
        userId: notification.recipientId,
        title: inAppNotification.title,
        body: inAppNotification.message,
        priority: notification.priority,
      });

      // In a real implementation, you might:
      // 1. Store the notification for service worker pickup
      // 2. Trigger a web push notification
      // 3. Send to mobile app if user has the app installed
    } catch (error) {
      console.warn('Failed to trigger browser notification:', error);
    }
  }

  // Utility method to mark notifications as read
  async markAsRead(
    notificationIds: string[],
    userId: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('in_app_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .in('id', notificationIds)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      return false;
    }
  }

  // Utility method to get user's notifications
  async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'all' | 'unread' | 'read';
      type?: string;
    } = {},
  ): Promise<InAppNotification[]> {
    try {
      let query = this.supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      if (options.type) {
        query = query.eq('type', options.type);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 50) - 1,
        );
      }

      // Filter out expired notifications
      query = query.or(
        'expires_at.is.null,expires_at.gt.' + new Date().toISOString(),
      );

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch user notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  }

  // Utility method to clean up expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('in_app_notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Failed to cleanup expired notifications:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      return 0;
    }
  }
}
