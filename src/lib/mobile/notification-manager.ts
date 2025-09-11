/**
 * WS-162/163/164: Mobile Push Notification Manager
 * Firebase-based push notification system for helper schedules, budget alerts, and expense tracking
 */

import { initializeApp } from 'firebase/app';
import {
  getMessaging,
  onMessage,
  getToken,
  MessagePayload,
} from 'firebase/messaging';

export interface ScheduleNotification {
  helperId: string;
  assignmentId: string;
  taskTitle: string;
  scheduledTime: string;
  venue?: string;
  type: 'schedule_update' | 'reminder' | 'check_in_required';
}

export interface BudgetNotification {
  coupleId: string;
  categoryId: string;
  categoryName: string;
  percentage: number;
  amountSpent: number;
  budgetLimit: number;
  severity: 'warning' | 'critical' | 'info';
  type: 'budget_alert' | 'overspend' | 'approaching_limit';
}

export interface ExpenseNotification {
  userId: string;
  expenseId: string;
  amount: number;
  vendor?: string;
  category: string;
  type: 'expense_captured' | 'receipt_processed' | 'approval_needed';
  status: 'success' | 'error' | 'pending';
}

export interface NotificationPermissionStatus {
  granted: boolean;
  token?: string;
  error?: string;
}

export class MobilePushNotificationManager {
  private messaging: any;
  private isInitialized = false;
  private deviceToken: string | null = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      };

      const firebaseApp = initializeApp(firebaseConfig);

      // Initialize messaging only in browser environment
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        this.messaging = getMessaging(firebaseApp);
        this.isInitialized = true;
      }
    } catch (error) {
      console.error(
        '[NotificationManager] Firebase initialization failed:',
        error,
      );
    }
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isInitialized) {
      return { granted: false, error: 'Messaging not initialized' };
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        // Get FCM registration token
        const token = await getToken(this.messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        this.deviceToken = token;

        // Store token in database for this user
        await this.registerDeviceToken(token);

        // Set up foreground message handling
        this.setupForegroundMessageHandling();

        return { granted: true, token };
      }

      return { granted: false, error: 'Permission denied' };
    } catch (error) {
      console.error('[NotificationManager] Permission request failed:', error);
      return { granted: false, error: error.message };
    }
  }

  private setupForegroundMessageHandling() {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log(
        '[NotificationManager] Foreground message received:',
        payload,
      );
      this.handleForegroundNotification(payload);
    });
  }

  private async handleForegroundNotification(payload: MessagePayload) {
    const { notification, data } = payload;

    if (!notification) return;

    // Show browser notification for foreground messages
    const notificationOptions: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data?.type || 'general',
      data: data,
      actions: this.getNotificationActions(data?.type),
      vibrate: [200, 100, 200],
      renotify: true,
    };

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification(
        notification.title || 'WedSync',
        notificationOptions,
      );
    } else {
      new Notification(notification.title || 'WedSync', notificationOptions);
    }
  }

  private getNotificationActions(type?: string): NotificationAction[] {
    switch (type) {
      case 'schedule_update':
        return [
          { action: 'view_schedule', title: 'View Schedule' },
          { action: 'confirm_attendance', title: 'Confirm' },
        ];
      case 'budget_alert':
        return [
          { action: 'view_budget', title: 'View Budget' },
          { action: 'adjust_budget', title: 'Adjust' },
        ];
      case 'expense_captured':
        return [
          { action: 'view_expense', title: 'View Details' },
          { action: 'edit_expense', title: 'Edit' },
        ];
      default:
        return [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ];
    }
  }

  // WS-162: Helper Schedule Notifications
  async sendScheduleNotification(
    notification: ScheduleNotification,
  ): Promise<boolean> {
    try {
      const payload = {
        notification: {
          title: 'Schedule Update',
          body: `${notification.taskTitle} - ${notification.scheduledTime}`,
          icon: '/icons/schedule-icon.png',
          badge: '/icons/badge-icon.png',
        },
        data: {
          type: 'schedule_update',
          assignmentId: notification.assignmentId,
          helperId: notification.helperId,
          action: 'view_schedule',
          url: `/helpers/schedules/${notification.assignmentId}`,
        },
      };

      return await this.sendToUser(notification.helperId, payload);
    } catch (error) {
      console.error(
        '[NotificationManager] Schedule notification failed:',
        error,
      );
      return false;
    }
  }

  // WS-163: Budget Alert Notifications
  async sendBudgetAlert(notification: BudgetNotification): Promise<boolean> {
    try {
      const urgencyLevel = this.getBudgetUrgencyLevel(notification.severity);
      const payload = {
        notification: {
          title: `Budget Alert - ${notification.categoryName}`,
          body: `${notification.percentage}% used ($${notification.amountSpent.toLocaleString()} of $${notification.budgetLimit.toLocaleString()})`,
          icon: '/icons/budget-icon.png',
          badge: '/icons/badge-icon.png',
          tag: `budget-${notification.categoryId}`,
          requireInteraction: notification.severity === 'critical',
        },
        data: {
          type: 'budget_alert',
          categoryId: notification.categoryId,
          severity: notification.severity,
          percentage: notification.percentage.toString(),
          action: 'view_budget',
          url: `/budget/categories/${notification.categoryId}`,
        },
        android: {
          priority: urgencyLevel,
          notification: {
            color: this.getSeverityColor(notification.severity),
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: `Budget Alert - ${notification.categoryName}`,
                body: `${notification.percentage}% used`,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      return await this.sendToUser(notification.coupleId, payload);
    } catch (error) {
      console.error('[NotificationManager] Budget alert failed:', error);
      return false;
    }
  }

  // WS-164: Expense Capture Notifications
  async sendExpenseNotification(
    notification: ExpenseNotification,
  ): Promise<boolean> {
    try {
      const payload = {
        notification: {
          title: 'Expense Captured',
          body: `$${notification.amount.toFixed(2)} - ${notification.vendor || notification.category}`,
          icon: '/icons/expenses-icon.png',
          badge: '/icons/badge-icon.png',
        },
        data: {
          type: 'expense_captured',
          expenseId: notification.expenseId,
          status: notification.status,
          action: 'view_expense',
          url: `/expenses/${notification.expenseId}`,
        },
      };

      return await this.sendToUser(notification.userId, payload);
    } catch (error) {
      console.error(
        '[NotificationManager] Expense notification failed:',
        error,
      );
      return false;
    }
  }

  // Voice-to-text success notification
  async sendVoiceProcessingNotification(
    userId: string,
    success: boolean,
    transcript?: string,
  ): Promise<boolean> {
    try {
      const payload = {
        notification: {
          title: success ? 'Voice Entry Processed' : 'Voice Entry Failed',
          body: success
            ? `Expense recorded: ${transcript?.substring(0, 50)}...`
            : 'Please try recording again',
          icon: '/icons/voice-icon.png',
          badge: '/icons/badge-icon.png',
        },
        data: {
          type: 'voice_processing',
          success: success.toString(),
          action: success ? 'view_expense' : 'retry_voice',
          url: success ? '/expenses/recent' : '/expenses/capture',
        },
      };

      return await this.sendToUser(userId, payload);
    } catch (error) {
      console.error(
        '[NotificationManager] Voice processing notification failed:',
        error,
      );
      return false;
    }
  }

  // Camera receipt processing notification
  async sendReceiptProcessingNotification(
    userId: string,
    success: boolean,
    ocrData?: any,
  ): Promise<boolean> {
    try {
      const payload = {
        notification: {
          title: success ? 'Receipt Processed' : 'Receipt Processing Failed',
          body: success
            ? `Amount detected: $${ocrData?.amount || 'Unknown'}`
            : 'Please retake the photo',
          icon: '/icons/camera-icon.png',
          badge: '/icons/badge-icon.png',
        },
        data: {
          type: 'receipt_processing',
          success: success.toString(),
          action: success ? 'review_expense' : 'retake_photo',
          url: success ? '/expenses/review' : '/expenses/capture',
        },
      };

      return await this.sendToUser(userId, payload);
    } catch (error) {
      console.error(
        '[NotificationManager] Receipt processing notification failed:',
        error,
      );
      return false;
    }
  }

  private async sendToUser(userId: string, payload: any): Promise<boolean> {
    try {
      // Get user's device tokens from database
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          payload,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[NotificationManager] Send to user failed:', error);
      return false;
    }
  }

  private async registerDeviceToken(token: string): Promise<void> {
    try {
      await fetch('/api/users/device-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: this.detectPlatform(),
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('[NotificationManager] Token registration failed:', error);
    }
  }

  private detectPlatform(): string {
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'web';
  }

  private getBudgetUrgencyLevel(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'high';
      case 'warning':
        return 'normal';
      default:
        return 'normal';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  }

  // Cleanup and unsubscribe
  async cleanup(): Promise<void> {
    if (this.deviceToken) {
      try {
        await fetch('/api/users/device-tokens', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: this.deviceToken,
          }),
        });
      } catch (error) {
        console.error('[NotificationManager] Cleanup failed:', error);
      }
    }
  }

  // Test notification functionality
  async sendTestNotification(): Promise<boolean> {
    if (!this.deviceToken) return false;

    const testNotification: BudgetNotification = {
      coupleId: 'test-user',
      categoryId: 'test-category',
      categoryName: 'Test Category',
      percentage: 85,
      amountSpent: 8500,
      budgetLimit: 10000,
      severity: 'warning',
      type: 'budget_alert',
    };

    return await this.sendBudgetAlert(testNotification);
  }

  get isReady(): boolean {
    return this.isInitialized && this.deviceToken !== null;
  }

  get token(): string | null {
    return this.deviceToken;
  }
}

// Singleton instance for app-wide use
export const notificationManager = new MobilePushNotificationManager();

export default MobilePushNotificationManager;
