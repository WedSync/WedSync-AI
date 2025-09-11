// Push notification system with cross-platform support
import {
  PushNotifications,
  PushNotificationSchema,
  Token,
  ActionPerformed,
} from '@capacitor/push-notifications';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
  category?: string;
}

export interface NotificationAction {
  id: string;
  title: string;
  destructive?: boolean;
  authenticationRequired?: boolean;
  foreground?: boolean;
  input?: boolean;
}

export class PushNotificationService {
  private isInitialized = false;
  private registrationToken: string | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const permissionResult = await PushNotifications.requestPermissions();

      if (permissionResult.receive === 'granted') {
        // Register for notifications
        await PushNotifications.register();

        // Setup listeners
        this.setupListeners();

        this.isInitialized = true;
        console.log('Push notifications initialized successfully');
      } else {
        console.warn('Push notification permissions not granted');
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  private setupListeners(): void {
    // Registration listener
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push notification token:', token.value);
      this.registrationToken = token.value;
      this.sendTokenToServer(token.value);
    });

    // Registration error listener
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push notification registration error:', error);
    });

    // Notification received listener (foreground)
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received (foreground):', notification);
        this.handleForegroundNotification(notification);
      },
    );

    // Notification action listener (background/closed app)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        this.handleNotificationAction(action);
      },
    );
  }

  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/push-notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: this.getPlatform(),
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register token: ${response.statusText}`);
      }

      console.log('Push notification token registered with server');
    } catch (error) {
      console.error('Failed to register token with server:', error);
    }
  }

  private handleForegroundNotification(
    notification: PushNotificationSchema,
  ): void {
    // Custom handling for foreground notifications
    if (notification.data?.type === 'timeline_update') {
      this.handleTimelineUpdate(notification);
    } else if (notification.data?.type === 'client_message') {
      this.handleClientMessage(notification);
    } else if (notification.data?.type === 'wedding_reminder') {
      this.handleWeddingReminder(notification);
    } else if (notification.data?.type === 'payment_due') {
      this.handlePaymentReminder(notification);
    } else {
      this.showGenericNotification(notification);
    }
  }

  private handleNotificationAction(action: ActionPerformed): void {
    const notification = action.notification;
    const actionId = action.actionId;

    console.log('Notification action:', actionId, notification);

    // Handle different action types
    if (actionId === 'tap' || actionId === 'default') {
      // Handle tap on notification
      this.navigateFromNotification(notification);
    } else if (actionId === 'reply') {
      // Handle reply action
      this.handleReplyAction(notification, action.inputValue);
    } else if (actionId === 'mark_complete') {
      // Handle mark complete action
      this.handleMarkCompleteAction(notification);
    }
  }

  private handleTimelineUpdate(notification: PushNotificationSchema): void {
    const clientId = notification.data?.clientId;
    const timelineId = notification.data?.timelineId;

    // Show in-app notification
    this.showInAppNotification({
      title: notification.title || 'Timeline Updated',
      message:
        notification.body || 'A client has updated their wedding timeline',
      type: 'info',
      action: () => {
        window.location.href = `/dashboard/clients/${clientId}/timeline`;
      },
    });
  }

  private handleClientMessage(notification: PushNotificationSchema): void {
    const clientId = notification.data?.clientId;
    const messageId = notification.data?.messageId;

    // Show in-app notification with action
    this.showInAppNotification({
      title: notification.title || 'New Message',
      message: notification.body || 'You have a new message from a client',
      type: 'message',
      action: () => {
        window.location.href = `/dashboard/communications?client=${clientId}&message=${messageId}`;
      },
    });

    // Update message count badge
    this.updateMessageBadge();
  }

  private handleWeddingReminder(notification: PushNotificationSchema): void {
    const weddingId = notification.data?.weddingId;
    const reminderType = notification.data?.reminderType;

    this.showInAppNotification({
      title: notification.title || 'Wedding Reminder',
      message: notification.body || "Don't forget about an upcoming wedding!",
      type: 'reminder',
      action: () => {
        window.location.href = `/dashboard/clients/${weddingId}`;
      },
    });
  }

  private handlePaymentReminder(notification: PushNotificationSchema): void {
    const invoiceId = notification.data?.invoiceId;

    this.showInAppNotification({
      title: notification.title || 'Payment Due',
      message: notification.body || 'You have a payment due',
      type: 'warning',
      action: () => {
        window.location.href = `/dashboard/billing?invoice=${invoiceId}`;
      },
    });
  }

  private showGenericNotification(notification: PushNotificationSchema): void {
    this.showInAppNotification({
      title: notification.title || 'Notification',
      message: notification.body || 'You have a new notification',
      type: 'info',
    });
  }

  private navigateFromNotification(notification: PushNotificationSchema): void {
    const data = notification.data;

    if (data?.deepLink) {
      // Handle deep link navigation
      window.location.href = data.deepLink;
    } else if (data?.type === 'timeline_update' && data?.clientId) {
      window.location.href = `/dashboard/clients/${data.clientId}/timeline`;
    } else if (data?.type === 'client_message' && data?.clientId) {
      window.location.href = `/dashboard/communications?client=${data.clientId}`;
    } else if (data?.type === 'wedding_reminder' && data?.weddingId) {
      window.location.href = `/dashboard/clients/${data.weddingId}`;
    } else {
      // Default navigation
      window.location.href = '/dashboard';
    }
  }

  private handleReplyAction(
    notification: PushNotificationSchema,
    replyText?: string,
  ): void {
    if (!replyText) return;

    const clientId = notification.data?.clientId;
    const messageId = notification.data?.messageId;

    // Send reply to server
    fetch('/api/communications/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        messageId,
        reply: replyText,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => {
      console.error('Failed to send reply:', error);
    });
  }

  private handleMarkCompleteAction(notification: PushNotificationSchema): void {
    const taskId = notification.data?.taskId;
    const reminderType = notification.data?.reminderType;

    if (reminderType === 'task' && taskId) {
      // Mark task as complete
      fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((error) => {
        console.error('Failed to mark task complete:', error);
      });
    }
  }

  private showInAppNotification(options: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'message' | 'reminder';
    action?: () => void;
  }): void {
    // Create in-app notification element
    const notification = document.createElement('div');
    notification.className = `
      fixed top-4 right-4 max-w-sm bg-white border-l-4 rounded-lg shadow-lg z-50 p-4 cursor-pointer
      ${options.type === 'error' ? 'border-red-500' : ''}
      ${options.type === 'warning' ? 'border-yellow-500' : ''}
      ${options.type === 'success' ? 'border-green-500' : ''}
      ${options.type === 'info' || options.type === 'message' || options.type === 'reminder' ? 'border-blue-500' : ''}
    `;

    notification.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${this.getNotificationIcon(options.type)}
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">${options.title}</p>
          <p class="mt-1 text-sm text-gray-500">${options.message}</p>
        </div>
        <button class="ml-4 text-gray-400 hover:text-gray-600">
          <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(notification);

    // Handle click
    notification.addEventListener('click', (e) => {
      if (
        e.target === notification.querySelector('button') ||
        notification.querySelector('button')?.contains(e.target as Node)
      ) {
        // Close button clicked
        document.body.removeChild(notification);
      } else if (options.action) {
        // Notification clicked
        options.action();
        document.body.removeChild(notification);
      }
    });

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  }

  private getNotificationIcon(type: string): string {
    switch (type) {
      case 'error':
        return '<svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>';
      case 'warning':
        return '<svg class="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
      case 'success':
        return '<svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>';
      default:
        return '<svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';
    }
  }

  private updateMessageBadge(): void {
    // Update app badge count
    PushNotifications.getBadgeNumber().then(({ count }) => {
      PushNotifications.setBadgeNumber({ count: count + 1 });
    });
  }

  private getPlatform(): string {
    if (typeof window !== 'undefined' && window.Capacitor) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  // Public methods for sending notifications
  async sendNotificationToUser(
    userId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      await fetch('/api/push-notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          payload,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Get current registration token
  getRegistrationToken(): string | null {
    return this.registrationToken;
  }

  // Check if notifications are enabled
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const permissions = await PushNotifications.checkPermissions();
      return permissions.receive === 'granted';
    } catch (error) {
      console.error('Failed to check notification permissions:', error);
      return false;
    }
  }

  // Unregister from push notifications
  async unregister(): Promise<void> {
    try {
      await PushNotifications.removeAllListeners();
      console.log('Push notifications unregistered');
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }
  }
}
