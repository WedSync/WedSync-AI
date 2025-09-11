import { renderHook, act } from '@testing-library/react';
import { usePaymentNotifications } from '@/hooks/payments/usePaymentNotifications';
import { 
  mockPaymentData,
  testUtils,
  MOCK_WEDDING_ID,
  MOCK_USER_ID
} from '../../../../tests/payments/fixtures/payment-fixtures';

// Mock notification API
global.Notification = class MockNotification {
  static permission = 'granted';
  static requestPermission = jest.fn(() => Promise.resolve('granted'));
  
  constructor(title: string, options?: NotificationOptions) {
    Object.assign(this, { title, ...options });
  }
} as any;

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      showNotification: jest.fn(),
      getNotifications: jest.fn(() => Promise.resolve([])),
    }),
    register: jest.fn(() => Promise.resolve()),
  },
  writable: false,
});

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnValue(
        Promise.resolve({ 
          data: [{ reminders: true, lead_time: 7, email: true, push: true }], 
          error: null 
        })
      ),
      insert: jest.fn().mockReturnValue(
        Promise.resolve({ data: {}, error: null })
      ),
      update: jest.fn().mockReturnValue(
        Promise.resolve({ data: {}, error: null })
      ),
      delete: jest.fn().mockReturnValue(
        Promise.resolve({ error: null })
      ),
      eq: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: MOCK_USER_ID } }, 
        error: null 
      })
    }
  })
}));

// Mock email service
jest.mock('@/lib/email/email-service', () => ({
  sendPaymentReminder: jest.fn(() => Promise.resolve({ success: true })),
  sendBulkPaymentReminders: jest.fn(() => Promise.resolve({ success: true, sent: 3 })),
}));

describe('usePaymentNotifications Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('initializes with default settings', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      expect(result.current.settings).toEqual({
        reminders: true,
        lead_time: 7,
        email: true,
        push: true
      });
      expect(result.current.permission).toBe('granted');
    });

    test('requests notification permission on first use', async () => {
      // Mock permission as default
      global.Notification.permission = 'default';
      
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(global.Notification.requestPermission).toHaveBeenCalled();
      expect(result.current.permission).toBe('granted');
    });

    test('handles denied notification permission', async () => {
      global.Notification.permission = 'denied';
      global.Notification.requestPermission = jest.fn(() => Promise.resolve('denied'));
      
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      await act(async () => {
        await result.current.requestPermission();
      });

      expect(result.current.permission).toBe('denied');
      expect(result.current.canShowNotifications).toBe(false);
    });
  });

  describe('Notification Scheduling', () => {
    test('schedules notifications for new payment', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const newPayment = testUtils.createPayment({
        due_date: '2025-03-15',
        priority: 'high'
      });

      await act(async () => {
        await result.current.scheduleNotifications(newPayment);
      });

      expect(result.current.scheduledNotifications).toContain(newPayment.id);
    });

    test('schedules multiple reminder types', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const urgentPayment = testUtils.createPayment({
        due_date: '2025-02-01', // 1 month away
        priority: 'high'
      });

      await act(async () => {
        await result.current.scheduleNotifications(urgentPayment);
      });

      // Should schedule 30-day, 7-day, 3-day, and 1-day reminders
      expect(result.current.getScheduledReminders(urgentPayment.id)).toHaveLength(4);
    });

    test('respects user notification settings', async () => {
      // Mock user with email-only notifications
      const emailOnlySettings = {
        reminders: true,
        lead_time: 7,
        email: true,
        push: false
      };

      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: [emailOnlySettings], error: null })
      );

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.scheduleNotifications(payment);
      });

      const reminders = result.current.getScheduledReminders(payment.id);
      expect(reminders.every(r => r.type === 'email')).toBe(true);
      expect(reminders.some(r => r.type === 'push')).toBe(false);
    });

    test('cancels scheduled notifications', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.scheduleNotifications(payment);
        await result.current.cancelNotifications(payment.id);
      });

      expect(result.current.scheduledNotifications).not.toContain(payment.id);
      expect(result.current.getScheduledReminders(payment.id)).toHaveLength(0);
    });
  });

  describe('Due Date Reminders', () => {
    test('sends due date reminder', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const dueSoonPayment = mockPaymentData.find(p => p.status === 'due-soon')!;

      await act(async () => {
        await result.current.sendDueReminder(dueSoonPayment.id);
      });

      expect(mockEmailService.sendPaymentReminder).toHaveBeenCalledWith({
        payment: dueSoonPayment,
        user_id: MOCK_USER_ID,
        reminder_type: 'due_soon'
      });
    });

    test('sends overdue notification', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const overduePayment = mockPaymentData.find(p => p.status === 'overdue')!;

      await act(async () => {
        await result.current.sendOverdueNotification(overduePayment.id);
      });

      // Should send both email and push notification for overdue payments
      expect(result.current.lastNotification).toEqual({
        type: 'overdue',
        payment_id: overduePayment.id,
        sent_at: expect.any(Date),
        channels: ['email', 'push']
      });
    });

    test('sends bulk reminders efficiently', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const dueSoonPayments = mockPaymentData.filter(p => p.status === 'due-soon' || p.status === 'overdue');

      await act(async () => {
        await result.current.sendBulkReminders(dueSoonPayments.map(p => p.id));
      });

      expect(mockEmailService.sendBulkPaymentReminders).toHaveBeenCalledWith({
        payments: dueSoonPayments,
        user_id: MOCK_USER_ID
      });
    });
  });

  describe('Push Notifications', () => {
    test('shows browser push notification', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.showPushNotification(payment, 'Due reminder');
      });

      const sw = await navigator.serviceWorker.ready;
      expect(sw.showNotification).toHaveBeenCalledWith(
        'Payment Due Reminder',
        expect.objectContaining({
          body: expect.stringContaining(payment.vendor_name),
          icon: '/icons/payment-reminder.png',
          tag: `payment-${payment.id}`,
          requireInteraction: true
        })
      );
    });

    test('handles push notification errors gracefully', async () => {
      const sw = await navigator.serviceWorker.ready;
      sw.showNotification = jest.fn(() => Promise.reject(new Error('Push failed')));

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.showPushNotification(payment, 'Test');
      });

      expect(result.current.lastError).toBe('Failed to show push notification');
    });

    test('queues notifications when offline', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true
      });

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.showPushNotification(payment, 'Offline test');
      });

      expect(result.current.queuedNotifications).toHaveLength(1);
      expect(result.current.queuedNotifications[0]).toEqual({
        payment,
        message: 'Offline test',
        type: 'push',
        created_at: expect.any(Date)
      });
    });

    test('processes queued notifications when online', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      // Add notifications to queue
      const payment = testUtils.createPayment();
      await act(async () => {
        result.current.queueNotification(payment, 'Queued test', 'push');
      });

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true
      });

      await act(async () => {
        await result.current.processQueuedNotifications();
      });

      expect(result.current.queuedNotifications).toHaveLength(0);
    });
  });

  describe('Email Notifications', () => {
    test('sends email reminder with correct template', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendEmailReminder(payment.id, 'due_soon');
      });

      expect(mockEmailService.sendPaymentReminder).toHaveBeenCalledWith({
        payment,
        user_id: MOCK_USER_ID,
        reminder_type: 'due_soon',
        template: 'payment_due_soon'
      });
    });

    test('handles email delivery failures', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      mockEmailService.sendPaymentReminder.mockRejectedValue(new Error('SMTP error'));

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendEmailReminder(payment.id, 'overdue');
      });

      expect(result.current.lastError).toBe('Failed to send email reminder');
      expect(result.current.failedNotifications).toContain(payment.id);
    });

    test('retries failed email notifications', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      mockEmailService.sendPaymentReminder
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendEmailReminder(payment.id, 'due_soon');
        await result.current.retryFailedNotifications();
      });

      expect(mockEmailService.sendPaymentReminder).toHaveBeenCalledTimes(2);
      expect(result.current.failedNotifications).toHaveLength(0);
    });
  });

  describe('Notification Settings', () => {
    test('loads user notification preferences', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(result.current.settings).toEqual({
        reminders: true,
        lead_time: 7,
        email: true,
        push: true
      });
    });

    test('updates notification settings', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const newSettings = {
        reminders: true,
        lead_time: 14,
        email: false,
        push: true
      };

      await act(async () => {
        await result.current.updateSettings(newSettings);
      });

      expect(result.current.settings).toEqual(newSettings);
    });

    test('validates notification settings', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const invalidSettings = {
        reminders: true,
        lead_time: -1, // Invalid
        email: true,
        push: true
      };

      act(() => {
        const validation = result.current.validateSettings(invalidSettings);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Lead time must be positive');
      });
    });

    test('applies default settings for new users', async () => {
      const mockSupabase = require('@/lib/supabase/client').createClient();
      mockSupabase.from().select.mockReturnValue(
        Promise.resolve({ data: [], error: null }) // No existing settings
      );

      const { result } = renderHook(() => usePaymentNotifications('new-user-id'));

      await act(async () => {
        await result.current.loadSettings();
      });

      expect(result.current.settings).toEqual({
        reminders: true,
        lead_time: 7,
        email: true,
        push: false // Default to false for new users
      });
    });
  });

  describe('Smart Notification Logic', () => {
    test('determines appropriate reminder timing', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const highPriorityPayment = testUtils.createPayment({
        priority: 'high',
        amount: 10000
      });

      const remindersSchedule = result.current.calculateReminderSchedule(highPriorityPayment);

      expect(remindersSchedule).toEqual([
        { days_before: 30, type: 'email' },
        { days_before: 14, type: 'email' },
        { days_before: 7, type: 'both' },
        { days_before: 3, type: 'both' },
        { days_before: 1, type: 'push' },
        { days_before: 0, type: 'urgent_push' }
      ]);
    });

    test('adjusts reminder frequency by priority', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const lowPriorityPayment = testUtils.createPayment({
        priority: 'low',
        amount: 100
      });

      const remindersSchedule = result.current.calculateReminderSchedule(lowPriorityPayment);

      // Lower priority should have fewer reminders
      expect(remindersSchedule.length).toBeLessThanOrEqual(3);
      expect(remindersSchedule).toEqual([
        { days_before: 7, type: 'email' },
        { days_before: 1, type: 'email' }
      ]);
    });

    test('skips reminders for paid payments', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const paidPayment = testUtils.createPayment({
        status: 'paid'
      });

      const remindersSchedule = result.current.calculateReminderSchedule(paidPayment);
      expect(remindersSchedule).toHaveLength(0);
    });

    test('escalates overdue notifications', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const overduePayment = mockPaymentData.find(p => p.status === 'overdue')!;

      await act(async () => {
        await result.current.escalateOverdueNotification(overduePayment.id);
      });

      expect(result.current.escalatedNotifications).toContain(overduePayment.id);
      // Should send urgent notifications
      expect(result.current.lastNotification?.type).toBe('urgent_overdue');
    });
  });

  describe('Notification Templates', () => {
    test('generates correct email template for due reminder', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();
      const template = result.current.generateEmailTemplate(payment, 'due_soon');

      expect(template.subject).toContain('Payment Due Soon');
      expect(template.body).toContain(payment.vendor_name);
      expect(template.body).toContain(testUtils.formatCurrency(payment.amount));
      expect(template.body).toContain(payment.due_date);
    });

    test('generates urgent template for overdue payments', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const overduePayment = mockPaymentData.find(p => p.status === 'overdue')!;
      const template = result.current.generateEmailTemplate(overduePayment, 'overdue');

      expect(template.subject).toContain('URGENT: Payment Overdue');
      expect(template.body).toContain('This payment is now overdue');
      expect(template.priority).toBe('high');
    });

    test('customizes templates by payment category', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const venuePayment = testUtils.createPayment({ category: 'Venue' });
      const template = result.current.generateEmailTemplate(venuePayment, 'due_soon');

      expect(template.body).toContain('venue payment');
      expect(template.category_specific_message).toBeTruthy();
    });

    test('includes payment action buttons in templates', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();
      const template = result.current.generateEmailTemplate(payment, 'due_soon');

      expect(template.body).toContain('Mark as Paid');
      expect(template.body).toContain('View Payment Details');
      expect(template.body).toContain('Update Due Date');
    });
  });

  describe('Notification History', () => {
    test('tracks notification history', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendDueReminder(payment.id);
      });

      const history = result.current.getNotificationHistory(payment.id);
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        payment_id: payment.id,
        type: 'due_reminder',
        channel: 'email',
        sent_at: expect.any(Date),
        success: true
      });
    });

    test('prevents duplicate notifications', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendDueReminder(payment.id);
        await result.current.sendDueReminder(payment.id); // Duplicate
      });

      const history = result.current.getNotificationHistory(payment.id);
      expect(history).toHaveLength(1); // Should not send duplicate
    });

    test('cleans up old notification history', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      // Mock old notifications
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 90); // 90 days ago

      await act(async () => {
        result.current.addToHistory('payment-old', 'due_reminder', 'email', oldDate, true);
        await result.current.cleanupOldHistory();
      });

      const allHistory = result.current.getAllNotificationHistory();
      expect(allHistory.every(h => h.sent_at > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    test('batches notifications efficiently', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payments = testUtils.createPayments(100);

      await act(async () => {
        await result.current.batchScheduleNotifications(payments);
      });

      // Should process in batches rather than individual calls
      expect(result.current.scheduledNotifications.length).toBe(100);
      expect(result.current.batchProcessingStats.total_batches).toBeGreaterThan(1);
    });

    test('implements notification rate limiting', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        // Try to send multiple notifications rapidly
        for (let i = 0; i < 10; i++) {
          await result.current.sendDueReminder(payment.id);
        }
      });

      // Should respect rate limits and not send all 10
      const history = result.current.getNotificationHistory(payment.id);
      expect(history.length).toBeLessThanOrEqual(3); // Max 3 per hour
    });

    test('caches notification templates', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();
      
      const template1 = result.current.generateEmailTemplate(payment, 'due_soon');
      const template2 = result.current.generateEmailTemplate(payment, 'due_soon');

      // Should return cached template for same inputs
      expect(template1).toBe(template2);
    });
  });

  describe('Error Recovery', () => {
    test('handles notification service outages', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      mockEmailService.sendPaymentReminder.mockRejectedValue(new Error('Service unavailable'));

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendDueReminder(payment.id);
      });

      expect(result.current.failedNotifications).toContain(payment.id);
      expect(result.current.lastError).toBe('Failed to send email reminder');
    });

    test('implements exponential backoff for retries', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      let attemptCount = 0;
      mockEmailService.sendPaymentReminder.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true });
      });

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendDueReminderWithRetry(payment.id);
      });

      expect(attemptCount).toBe(3);
      expect(result.current.retryStats.total_attempts).toBe(3);
      expect(result.current.retryStats.success_on_retry).toBe(true);
    });

    test('gives up after max retries', async () => {
      const mockEmailService = require('@/lib/email/email-service');
      mockEmailService.sendPaymentReminder.mockRejectedValue(new Error('Persistent failure'));

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.sendDueReminderWithRetry(payment.id, { maxRetries: 3 });
      });

      expect(result.current.retryStats.gave_up_after_max_retries).toBe(true);
      expect(result.current.permanentFailures).toContain(payment.id);
    });
  });

  describe('Notification Analytics', () => {
    test('tracks notification engagement', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      await act(async () => {
        await result.current.trackNotificationClick('payment-001', 'email');
        await result.current.trackNotificationDismiss('payment-002', 'push');
      });

      const analytics = result.current.getNotificationAnalytics();
      
      expect(analytics.email_click_rate).toBeGreaterThan(0);
      expect(analytics.push_dismiss_rate).toBeGreaterThan(0);
      expect(analytics.total_interactions).toBe(2);
    });

    test('calculates notification effectiveness', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const effectiveness = result.current.calculateNotificationEffectiveness([
        { type: 'email', clicked: true, resulted_in_payment: true },
        { type: 'email', clicked: false, resulted_in_payment: false },
        { type: 'push', clicked: true, resulted_in_payment: true },
        { type: 'push', clicked: true, resulted_in_payment: false },
      ]);

      expect(effectiveness.email.click_rate).toBe(0.5);
      expect(effectiveness.email.conversion_rate).toBe(0.5);
      expect(effectiveness.push.click_rate).toBe(1.0);
      expect(effectiveness.push.conversion_rate).toBe(0.5);
    });

    test('optimizes notification timing based on analytics', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const historicalData = [
        { sent_at: '09:00', opened: true },
        { sent_at: '14:00', opened: false },
        { sent_at: '19:00', opened: true },
        { sent_at: '22:00', opened: false },
      ];

      const optimalTime = result.current.calculateOptimalNotificationTime(historicalData);
      
      // Should identify 9 AM and 7 PM as optimal times
      expect(['09:00', '19:00']).toContain(optimalTime);
    });
  });

  describe('Integration with External Services', () => {
    test('integrates with calendar reminders', async () => {
      // Mock calendar API
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ event_id: 'cal-123' })
        })
      ) as jest.MockedFunction<typeof fetch>;

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.addToCalendar(payment);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/calendar/events'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(payment.vendor_name)
        })
      );
    });

    test('syncs with mobile app notifications', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.syncWithMobileApp(payment, 'due_soon');
      });

      expect(result.current.mobileAppSyncStatus).toEqual({
        last_sync: expect.any(Date),
        pending_notifications: 0,
        sync_success: true
      });
    });

    test('handles third-party notification failures gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Calendar API down')));

      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.addToCalendar(payment);
      });

      expect(result.current.lastError).toBe('Failed to add to calendar');
      expect(result.current.fallbackNotificationSent).toBe(true);
    });
  });

  describe('Accessibility Features', () => {
    test('provides high contrast notification styling', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();
      const template = result.current.generateAccessibleNotification(payment, {
        high_contrast: true,
        large_text: true
      });

      expect(template.styles).toContain('high-contrast');
      expect(template.styles).toContain('large-text');
      expect(template.aria_live).toBe('assertive');
    });

    test('supports screen reader announcements', async () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const payment = testUtils.createPayment();

      await act(async () => {
        await result.current.announceToScreenReader(payment, 'Payment reminder sent');
      });

      expect(result.current.screenReaderAnnouncement).toBe(
        `Payment reminder sent for ${payment.vendor_name}. Amount: ${testUtils.formatCurrency(payment.amount)}. Due: ${payment.due_date}`
      );
    });

    test('provides keyboard shortcuts for notification actions', () => {
      const { result } = renderHook(() => usePaymentNotifications(MOCK_USER_ID));

      const shortcuts = result.current.getKeyboardShortcuts();

      expect(shortcuts).toEqual({
        'Ctrl+M': 'markAsPaid',
        'Ctrl+R': 'snoozeReminder',
        'Ctrl+D': 'viewPaymentDetails',
        'Escape': 'dismissNotification'
      });
    });
  });
});