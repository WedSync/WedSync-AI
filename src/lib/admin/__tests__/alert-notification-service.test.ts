/**
 * Integration Tests for Alert Notification Service
 * Team C - WS-228 Admin Alert System
 *
 * These tests verify all notification channels work correctly:
 * - Email notifications with templates
 * - Slack integration with proper formatting
 * - SMS escalation for critical alerts
 * - Error handling and retry logic
 * - Configuration management
 */

import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  AlertNotificationService,
  AlertPriority,
  NotificationChannel,
  Alert,
  NotificationConfig,
} from '../alert-notification-service';
import { NotificationConfigManager } from '../notification-config-manager';

// Mock external dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/email/email-service');

const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({ select: jest.fn(() => ({ single: jest.fn() })) })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        eq: jest.fn(() => ({ single: jest.fn() })),
        contains: jest.fn(() => ({
          contains: jest.fn(() => ({ filter: jest.fn() })),
        })),
        in: jest.fn(() => ({ filter: jest.fn() })),
        lte: jest.fn(() => ({ eq: jest.fn(() => ({ limit: jest.fn() })) })),
        gte: jest.fn(() => ({ lte: jest.fn() })),
        order: jest.fn(),
      })),
      contains: jest.fn(() => ({
        contains: jest.fn(() => ({ filter: jest.fn() })),
      })),
      in: jest.fn(() => ({ filter: jest.fn() })),
      lte: jest.fn(() => ({ eq: jest.fn(() => ({ limit: jest.fn() })) })),
      gte: jest.fn(() => ({ lte: jest.fn() })),
      order: jest.fn(),
    })),
    update: jest.fn(() => ({ eq: jest.fn() })),
    delete: jest.fn(() => ({ eq: jest.fn() })),
  })),
};

const mockEmailService = {
  sendEmail: jest.fn(),
  getEmailTemplate: jest.fn(),
  processTemplate: jest.fn(),
};

// Mock fetch for external API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('AlertNotificationService Integration Tests', () => {
  let notificationService: AlertNotificationService;
  let configManager: NotificationConfigManager;

  const mockAlert: Alert = {
    id: 'alert-123',
    type: 'system_health',
    priority: AlertPriority.CRITICAL,
    title: 'Database Connection Failed',
    message: 'Primary database connection lost. Failing over to backup.',
    metadata: {
      dbHost: 'db-primary.wedsync.com',
      errorCode: 'CONNECTION_TIMEOUT',
      affectedUsers: 150,
    },
    timestamp: new Date('2025-01-20T10:30:00Z'),
    acknowledged: false,
  };

  const mockConfigs: NotificationConfig[] = [
    {
      id: 'config-email-1',
      adminUserId: 'admin-123',
      channel: NotificationChannel.EMAIL,
      priority: [AlertPriority.CRITICAL, AlertPriority.HIGH],
      alertTypes: ['system_health', 'security'],
      enabled: true,
      settings: {
        emailAddress: 'admin@wedsync.com',
        emailEnabled: true,
        immediateForCritical: true,
      },
    },
    {
      id: 'config-slack-1',
      adminUserId: 'admin-123',
      channel: NotificationChannel.SLACK,
      priority: [AlertPriority.CRITICAL],
      alertTypes: ['system_health', 'security'],
      enabled: true,
      settings: {
        slackEnabled: true,
        slackWebhookUrl: 'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
        slackChannel: '#critical-alerts',
      },
    },
    {
      id: 'config-sms-1',
      adminUserId: 'admin-123',
      channel: NotificationChannel.SMS,
      priority: [AlertPriority.CRITICAL],
      alertTypes: ['system_health'],
      enabled: true,
      settings: {
        smsEnabled: true,
        smsNumber: '+441234567890',
      },
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup Supabase mocks
    (require('@/lib/supabase/server') as any).createClient = jest.fn(
      () => mockSupabase,
    );

    // Setup EmailService mocks
    (require('@/lib/email/email-service') as any).EmailService = jest.fn(
      () => mockEmailService,
    );

    // Setup fetch mock for successful responses
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: jest.fn().mockResolvedValue('success'),
      json: jest.fn().mockResolvedValue({ success: true }),
    } as any);

    notificationService = new AlertNotificationService();
    configManager = new NotificationConfigManager();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Email Notifications', () => {
    it('should send email notification with correct template variables', async () => {
      // Setup mock responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[0]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: { id: 'delivery-123' }, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock email template
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'alert_email_templates') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
          };
        }
        return mockSupabase.from();
      });

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify email was sent with correct data
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@wedsync.com',
          subject: expect.stringContaining('CRITICAL'),
          subject: expect.stringContaining('Database Connection Failed'),
          html: expect.stringContaining('Database Connection Failed'),
          html: expect.stringContaining('Primary database connection lost'),
          from: expect.stringContaining('@wedsync.com'),
        }),
      );

      // Verify delivery was logged
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'alert_notification_deliveries',
      );
      expect(mockSupabase.from).toHaveBeenCalledWith('alert_notification_logs');
    });

    it('should handle email sending failures with retry', async () => {
      // Setup to return config but fail email sending
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[0]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: { id: 'delivery-456' }, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock email service to throw error
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('SMTP server unavailable'),
      );

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify failure was logged
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'alert_notification_deliveries',
      );

      // Verify retry was scheduled
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'alert_notification_retries',
      );
    });
  });

  describe('Slack Notifications', () => {
    it('should send Slack notification with correct formatting', async () => {
      // Setup mock responses for Slack config
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[1]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-slack-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify Slack webhook was called
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/TEST/WEBHOOK/URL',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"color":"danger"'), // Critical priority
        }),
      );

      const slackCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('hooks.slack.com'),
      );

      if (slackCall) {
        const payload = JSON.parse(slackCall[1].body);
        expect(payload.attachments[0].title).toContain('🚨'); // Critical emoji
        expect(payload.attachments[0].title).toContain(
          'Database Connection Failed',
        );
        expect(payload.attachments[0].fields).toContainEqual(
          expect.objectContaining({
            title: 'Priority',
            value: 'CRITICAL',
          }),
        );
      }
    });

    it('should handle Slack API failures', async () => {
      // Setup Slack config
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[1]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-slack-456' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Mock Slack API failure
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify failure was logged and retry scheduled
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'alert_notification_deliveries',
      );
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'alert_notification_retries',
      );
    });
  });

  describe('SMS Notifications', () => {
    beforeEach(() => {
      // Setup Twilio environment variables
      process.env.TWILIO_ACCOUNT_SID = 'test_account_sid';
      process.env.TWILIO_AUTH_TOKEN = 'test_auth_token';
      process.env.TWILIO_FROM_NUMBER = '+15551234567';
    });

    it('should send SMS notification for critical alerts', async () => {
      // Setup SMS config
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[2]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-sms-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify Twilio API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.twilio.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
          body: expect.any(URLSearchParams),
        }),
      );

      // Verify SMS content
      const twilioCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('api.twilio.com'),
      );

      if (twilioCall) {
        const body = twilioCall[1].body;
        expect(body.get('To')).toBe('+441234567890');
        expect(body.get('From')).toBe('+15551234567');
        expect(body.get('Body')).toContain('🚨'); // Critical emoji
        expect(body.get('Body')).toContain('Database Connection Failed');
      }
    });

    it('should truncate long SMS messages', async () => {
      // Create alert with very long message
      const longAlert: Alert = {
        ...mockAlert,
        message:
          'This is a very long message that exceeds the SMS character limit. '.repeat(
            50,
          ),
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[2]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-sms-456' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await notificationService.sendAlertNotification(longAlert, ['admin-123']);

      const twilioCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('api.twilio.com'),
      );

      if (twilioCall) {
        const body = twilioCall[1].body;
        const message = body.get('Body');
        expect(message.length).toBeLessThanOrEqual(1500);
        expect(message).toContain('...');
      }
    });
  });

  describe('Priority-based Channel Selection', () => {
    it('should send to all channels for CRITICAL alerts', async () => {
      // Setup all notification configs
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: mockConfigs,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-multi-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await notificationService.sendAlertNotification(mockAlert, ['admin-123']);

      // Verify all three channels were attempted
      expect(mockEmailService.sendEmail).toHaveBeenCalled();

      const slackCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('hooks.slack.com'),
      );
      expect(slackCall).toBeDefined();

      const smsCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('api.twilio.com'),
      );
      expect(smsCall).toBeDefined();
    });

    it('should send only email for LOW priority alerts', async () => {
      const lowPriorityAlert: Alert = {
        ...mockAlert,
        priority: AlertPriority.LOW,
      };

      // Only email config should match LOW priority
      const emailOnlyConfig = [
        {
          ...mockConfigs[0],
          priority: [
            AlertPriority.LOW,
            AlertPriority.MEDIUM,
            AlertPriority.HIGH,
            AlertPriority.CRITICAL,
          ],
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: emailOnlyConfig,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-low-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await notificationService.sendAlertNotification(lowPriorityAlert, [
        'admin-123',
      ]);

      // Verify only email was sent
      expect(mockEmailService.sendEmail).toHaveBeenCalled();

      // Verify Slack and SMS were NOT called
      const slackCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('hooks.slack.com'),
      );
      expect(slackCall).toBeUndefined();

      const smsCall = (global.fetch as jest.Mock).mock.calls.find((call) =>
        call[0].includes('api.twilio.com'),
      );
      expect(smsCall).toBeUndefined();
    });
  });

  describe('Quiet Hours', () => {
    it('should skip notifications during quiet hours for non-critical alerts', async () => {
      // Mock current time to be in quiet hours (11 PM)
      const mockDate = new Date('2025-01-20T23:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const configWithQuietHours = {
        ...mockConfigs[0],
        priority: [AlertPriority.HIGH], // Non-critical
        quietHours: {
          start: '22:00',
          end: '07:00',
          timezone: 'UTC',
        },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [configWithQuietHours],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const highPriorityAlert: Alert = {
        ...mockAlert,
        priority: AlertPriority.HIGH,
      };

      await notificationService.sendAlertNotification(highPriorityAlert, [
        'admin-123',
      ]);

      // Verify no notifications were sent due to quiet hours
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });

  describe('Retry Logic', () => {
    it('should process pending retries with exponential backoff', async () => {
      const pendingRetries = [
        {
          id: 'retry-123',
          alert_id: 'alert-123',
          channel: 'email',
          recipient: 'admin@wedsync.com',
          retry_count: 1,
          retry_at: new Date(Date.now() - 1000).toISOString(), // Past time
          task_data: JSON.stringify({
            alertId: 'alert-123',
            alert: mockAlert,
            channel: 'email',
            recipient: 'admin@wedsync.com',
            retryCount: 0,
            maxRetries: 3,
          }),
          processed: false,
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'alert_notification_retries') {
          return {
            select: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: pendingRetries,
                    error: null,
                  }),
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { id: 'delivery-retry-123' },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      await notificationService.processRetries();

      // Verify retry was processed
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other notifications if one fails', async () => {
      // Setup multiple configs where email fails but Slack succeeds
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              contains: jest.fn().mockReturnValue({
                filter: jest.fn().mockResolvedValue({
                  data: [mockConfigs[0], mockConfigs[1]],
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-error-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Email fails
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email server down'),
      );

      // Slack succeeds (already mocked to return successful response)

      await expect(
        notificationService.sendAlertNotification(mockAlert, ['admin-123']),
      ).resolves.not.toThrow();

      // Verify both were attempted
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hooks.slack.com'),
        expect.anything(),
      );
    });
  });
});

describe('NotificationConfigManager Integration Tests', () => {
  let configManager: NotificationConfigManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (require('@/lib/supabase/server') as any).createClient = jest.fn(
      () => mockSupabase,
    );
    configManager = new NotificationConfigManager();
  });

  describe('Configuration Management', () => {
    it('should create default configurations for new admin user', async () => {
      const newAdminUser = {
        id: 'admin-new-123',
        email: 'newadmin@wedsync.com',
        name: 'New Admin',
        role: 'admin',
        timezone: 'Europe/London',
        isActive: true,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'admin_notification_configs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { code: 'PGRST116' },
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: 'config-123', ...newAdminUser },
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockSupabase.from();
      });

      const configs =
        await configManager.setupDefaultConfigurations(newAdminUser);

      expect(configs).toHaveLength(3); // Email, Slack (disabled), SMS (disabled)
      expect(configs[0].channel).toBe(NotificationChannel.EMAIL);
      expect(configs[0].enabled).toBe(true);
      expect(configs[0].settings.emailAddress).toBe('newadmin@wedsync.com');
    });

    it('should validate notification settings correctly', async () => {
      // Valid email settings
      const validEmailResult = await configManager.validateChannelSettings(
        NotificationChannel.EMAIL,
        { emailAddress: 'valid@email.com', emailEnabled: true },
      );
      expect(validEmailResult.valid).toBe(true);
      expect(validEmailResult.errors).toHaveLength(0);

      // Invalid email settings
      const invalidEmailResult = await configManager.validateChannelSettings(
        NotificationChannel.EMAIL,
        { emailAddress: 'invalid-email', emailEnabled: true },
      );
      expect(invalidEmailResult.valid).toBe(false);
      expect(invalidEmailResult.errors).toContain(
        'Valid email address is required',
      );

      // Valid Slack settings
      const validSlackResult = await configManager.validateChannelSettings(
        NotificationChannel.SLACK,
        {
          slackWebhookUrl: 'https://hooks.slack.com/services/TEST',
          slackEnabled: true,
        },
      );
      expect(validSlackResult.valid).toBe(true);

      // Invalid SMS settings
      const invalidSMSResult = await configManager.validateChannelSettings(
        NotificationChannel.SMS,
        { smsNumber: '123456', smsEnabled: true }, // Invalid format
      );
      expect(invalidSMSResult.valid).toBe(false);
      expect(invalidSMSResult.errors).toContain(
        'Valid phone number is required for SMS notifications',
      );
    });

    it('should test notification configuration', async () => {
      const testConfig: NotificationConfig = {
        id: 'config-test-123',
        adminUserId: 'admin-123',
        channel: NotificationChannel.EMAIL,
        priority: [AlertPriority.LOW],
        alertTypes: ['test'],
        enabled: true,
        settings: { emailAddress: 'test@wedsync.com' },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: testConfig, error: null }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'delivery-test-123' },
              error: null,
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      const result = await configManager.testNotificationConfiguration(
        'admin-123',
        NotificationChannel.EMAIL,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test notification sent successfully');
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('Configuration Summary', () => {
    it('should generate correct configuration summary', async () => {
      const mockConfigsForSummary = [
        {
          id: 'config-1',
          adminUserId: 'admin-123',
          channel: NotificationChannel.EMAIL,
          enabled: true,
          alertTypes: ['system_health', 'security'],
          createdAt: '2025-01-20T10:00:00Z',
          updatedAt: '2025-01-20T11:00:00Z',
        },
        {
          id: 'config-2',
          adminUserId: 'admin-123',
          channel: NotificationChannel.SLACK,
          enabled: true,
          alertTypes: ['security', 'performance'],
          createdAt: '2025-01-20T10:30:00Z',
        },
        {
          id: 'config-3',
          adminUserId: 'admin-123',
          channel: NotificationChannel.SMS,
          enabled: false,
          alertTypes: ['system_health'],
          createdAt: '2025-01-20T09:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockConfigsForSummary,
              error: null,
            }),
          }),
        }),
      });

      const summary = await configManager.getConfigurationSummary('admin-123');

      expect(summary.totalConfigs).toBe(3);
      expect(summary.enabledChannels).toEqual([
        NotificationChannel.EMAIL,
        NotificationChannel.SLACK,
      ]);
      expect(summary.alertTypeCoverage['security']).toEqual([
        NotificationChannel.EMAIL,
        NotificationChannel.SLACK,
      ]);
      expect(summary.lastUpdated).toBe('2025-01-20T11:00:00Z');
    });
  });
});

/**
 * Performance Tests
 * Verify notification system can handle high load
 */
describe('Performance Tests', () => {
  let notificationService: AlertNotificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    (require('@/lib/supabase/server') as any).createClient = jest.fn(
      () => mockSupabase,
    );
    (require('@/lib/email/email-service') as any).EmailService = jest.fn(
      () => mockEmailService,
    );
    notificationService = new AlertNotificationService();
  });

  it('should handle bulk notifications efficiently', async () => {
    // Setup 100 admin users with configurations
    const bulkConfigs = Array.from({ length: 100 }, (_, i) => ({
      id: `config-bulk-${i}`,
      adminUserId: `admin-${i}`,
      channel: NotificationChannel.EMAIL,
      priority: [AlertPriority.HIGH],
      alertTypes: ['system_health'],
      enabled: true,
      settings: { emailAddress: `admin${i}@wedsync.com` },
    }));

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          contains: jest.fn().mockReturnValue({
            contains: jest.fn().mockReturnValue({
              filter: jest.fn().mockResolvedValue({
                data: bulkConfigs,
                error: null,
              }),
            }),
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: { id: 'delivery-bulk' }, error: null }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    mockEmailService.sendEmail.mockResolvedValue(undefined);

    const highPriorityAlert: Alert = {
      ...mockAlert,
      priority: AlertPriority.HIGH,
      title: 'Bulk Performance Test Alert',
    };

    const startTime = Date.now();

    await notificationService.sendAlertNotification(
      highPriorityAlert,
      Array.from({ length: 100 }, (_, i) => `admin-${i}`),
    );

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Should complete within 5 seconds for 100 notifications
    expect(executionTime).toBeLessThan(5000);

    // Verify all emails were sent
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(100);
  }, 10000); // 10 second timeout for performance test
});
