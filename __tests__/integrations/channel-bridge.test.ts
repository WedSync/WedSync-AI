import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationOrchestrator, NotificationConfig, ChannelEvent } from '@/lib/notifications/channel-bridge/notification-orchestrator';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        data: []
      })),
      insert: vi.fn(() => ({ data: null, error: null })),
      upsert: vi.fn(() => ({ data: null, error: null }))
    }))
  }))
}));

// Mock fetch for external API calls
global.fetch = vi.fn();

describe('NotificationOrchestrator', () => {
  let orchestrator: NotificationOrchestrator;
  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockSupabaseKey = 'test-key';

  beforeEach(() => {
    orchestrator = new NotificationOrchestrator(mockSupabaseUrl, mockSupabaseKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Notification Configuration', () => {
    test('configures channel notifications successfully', async () => {
      const config: NotificationConfig = {
        channelName: 'supplier:photography:org-123',
        enableWhatsApp: true,
        enableSlack: true,
        enableEmail: true,
        enableSMS: false,
        whatsAppSettings: {
          businessAccountId: 'wa-business-123',
          phoneNumberId: 'phone-456',
          accessToken: 'wa-token-789',
          recipients: [
            {
              id: 'contact-1',
              name: 'Sarah Smith',
              phone: '+1234567890',
              role: 'couple',
              preferences: {
                whatsapp: true,
                slack: false,
                email: true,
                sms: false,
                urgentOnly: false,
                businessHoursOnly: false,
                timezone: 'America/New_York'
              }
            }
          ]
        },
        slackSettings: {
          webhookUrl: 'https://hooks.slack.com/test',
          channel: '#wedding-coordination',
          username: 'WedSync Bot'
        },
        emailSettings: {
          fromAddress: 'noreply@wedsync.com',
          recipients: [
            {
              id: 'email-1',
              name: 'Sarah Smith',
              email: 'sarah@example.com',
              role: 'couple',
              preferences: {
                whatsapp: true,
                slack: false,
                email: true,
                sms: false,
                urgentOnly: false,
                businessHoursOnly: false,
                timezone: 'America/New_York'
              }
            }
          ],
          subject: 'Wedding Update',
          priority: 'normal'
        },
        smsSettings: {
          fromNumber: '+1234567890',
          recipients: [],
          message: 'Wedding update from WedSync',
          shortLinks: true
        },
        filterRules: [
          {
            eventType: 'timeline_update',
            condition: 'equals',
            value: 'timeline_update',
            action: 'include'
          }
        ],
        priority: 'normal'
      };

      await orchestrator.configureChannelNotifications(config.channelName, config);

      // Verify that the configuration was stored
      expect((orchestrator as any).channelConfigs.has(config.channelName)).toBe(true);
    });

    test('validates notification configuration', async () => {
      const invalidConfig = {
        channelName: '', // Invalid empty channel name
        enableWhatsApp: true,
        enableSlack: false,
        enableEmail: false,
        enableSMS: false
      } as NotificationConfig;

      await expect(orchestrator.configureChannelNotifications('', invalidConfig))
        .rejects.toThrow();
    });
  });

  describe('WhatsApp Notifications', () => {
    test('delivers WhatsApp notification successfully', async () => {
      const mockEvent: ChannelEvent = {
        id: 'whatsapp-test-1',
        channelName: 'supplier:photography:org-123',
        eventType: 'timeline_updated',
        payload: {
          coupleName: 'Sarah & Mike',
          ceremonyTime: '3:30 PM',
          receptionTime: '6:00 PM',
          venue: 'Grand Ballroom'
        },
        timestamp: '2024-01-20T15:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-456'
      };

      const recipients = [
        {
          id: 'contact-1',
          name: 'Sarah Smith',
          phone: '+1234567890',
          role: 'couple' as const,
          preferences: {
            whatsapp: true,
            slack: false,
            email: true,
            sms: false,
            urgentOnly: false,
            businessHoursOnly: false,
            timezone: 'America/New_York'
          }
        }
      ];

      // Mock successful WhatsApp API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wa-message-123' }]
        })
      });

      // Mock the config getter
      vi.spyOn(orchestrator as any, 'getChannelConfig').mockReturnValue({
        whatsAppSettings: {
          businessAccountId: 'wa-business-123',
          phoneNumberId: 'phone-456',
          accessToken: 'wa-token-789'
        }
      });

      const result = await orchestrator.deliverWhatsAppNotification(mockEvent, recipients);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
      expect(result.recipientCount).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://graph.facebook.com/v18.0/phone-456/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer wa-token-789'
          })
        })
      );
    });

    test('handles WhatsApp API failures gracefully', async () => {
      const mockEvent: ChannelEvent = {
        id: 'whatsapp-fail-test',
        channelName: 'supplier:photography:org-123',
        eventType: 'booking_cancelled',
        payload: {
          coupleName: 'Emma & James',
          cancellationReason: 'Venue unavailable'
        },
        timestamp: '2024-01-20T16:00:00Z',
        organizationId: 'org-123',
        weddingId: 'wedding-789'
      };

      const recipients = [
        {
          id: 'contact-2',
          name: 'Emma Johnson',
          phone: '+1987654321',
          role: 'couple' as const,
          preferences: {
            whatsapp: true,
            slack: false,
            email: true,
            sms: false,
            urgentOnly: false,
            businessHoursOnly: false,
            timezone: 'America/Los_Angeles'
          }
        }
      ];

      // Mock WhatsApp API failure
      (global.fetch as any).mockRejectedValueOnce(new Error('WhatsApp API Error'));

      vi.spyOn(orchestrator as any, 'getChannelConfig').mockReturnValue({
        whatsAppSettings: {
          businessAccountId: 'wa-business-456',
          phoneNumberId: 'phone-789',
          accessToken: 'wa-token-fail'
        }
      });

      const result = await orchestrator.deliverWhatsAppNotification(mockEvent, recipients);

      expect(result.success).toBe(false);
      expect(result.error).toBe('WhatsApp API Error');
      expect(result.recipientCount).toBe(0);
    });
  });

  describe('Slack Notifications', () => {
    test('delivers Slack notification with proper formatting', async () => {
      const mockEvent: ChannelEvent = {
        id: 'slack-test-1',
        channelName: 'supplier:venue:org-456',
        eventType: 'guest_count_changed',
        payload: {
          coupleName: 'Alex & Jordan',
          guestCount: 175,
          previousCount: 150,
          venue: 'Sunset Gardens'
        },
        timestamp: '2024-01-20T17:00:00Z',
        organizationId: 'org-456',
        weddingId: 'wedding-slack'
      };

      const slackChannels = [
        {
          id: 'slack-channel-1',
          name: '#wedding-coordination',
          webhookUrl: 'https://hooks.slack.com/services/test/webhook',
          teamId: 'team-123'
        }
      ];

      // Mock successful Slack webhook response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => 'ok'
      });

      const result = await orchestrator.deliverSlackNotification(mockEvent, slackChannels);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('slack');
      expect(result.recipientCount).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('Guest Count Changed for *Alex & Jordan*')
        })
      );
    });
  });

  describe('Email Notifications', () => {
    test('delivers email notification with HTML formatting', async () => {
      const mockEvent: ChannelEvent = {
        id: 'email-test-1',
        channelName: 'communications:email:org-789',
        eventType: 'venue_changed',
        payload: {
          coupleName: 'Taylor & Morgan',
          oldVenue: 'City Hall',
          newVenue: 'Beach Resort',
          changeReason: 'Weather contingency'
        },
        timestamp: '2024-01-20T18:00:00Z',
        organizationId: 'org-789',
        weddingId: 'wedding-email'
      };

      const recipients = [
        {
          id: 'email-recipient-1',
          name: 'Taylor Smith',
          email: 'taylor@example.com',
          role: 'couple',
          preferences: {
            whatsapp: false,
            slack: false,
            email: true,
            sms: false,
            urgentOnly: false,
            businessHoursOnly: false,
            timezone: 'America/Chicago'
          }
        }
      ];

      // Mock successful Resend API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'email-123'
        })
      });

      // Mock channel config
      vi.spyOn(orchestrator as any, 'getChannelConfig').mockReturnValue({
        emailSettings: {
          fromAddress: 'noreply@wedsync.com',
          subject: 'Wedding Update: Venue Changed',
          priority: 'high'
        }
      });

      const result = await orchestrator.deliverEmailNotification(mockEvent, recipients);

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.recipientCount).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Event Routing and Filtering', () => {
    test('routes channel event to configured notifications', async () => {
      const mockEvent: ChannelEvent = {
        id: 'routing-test-1',
        channelName: 'supplier:coordination:org-routing',
        eventType: 'payment_received',
        payload: {
          coupleName: 'Sam & Casey',
          amount: '$2,500',
          paymentMethod: 'Credit Card',
          remainingBalance: '$500'
        },
        timestamp: '2024-01-20T19:00:00Z',
        organizationId: 'org-routing',
        weddingId: 'wedding-routing'
      };

      const mockConfig: NotificationConfig = {
        channelName: 'supplier:coordination:org-routing',
        enableWhatsApp: true,
        enableSlack: true,
        enableEmail: false,
        enableSMS: false,
        whatsAppSettings: {} as any,
        slackSettings: {} as any,
        emailSettings: {} as any,
        smsSettings: {} as any,
        filterRules: [
          {
            eventType: 'payment_received',
            condition: 'equals',
            value: 'payment_received',
            action: 'include'
          }
        ],
        priority: 'high'
      };

      // Mock config retrieval
      vi.spyOn(orchestrator as any, 'getChannelConfig').mockReturnValue(mockConfig);

      // Mock notification methods
      vi.spyOn(orchestrator, 'deliverWhatsAppNotification').mockResolvedValue({
        channel: 'whatsapp',
        success: true,
        deliveryTime: 1000,
        recipientCount: 1
      });

      vi.spyOn(orchestrator, 'deliverSlackNotification').mockResolvedValue({
        channel: 'slack',
        success: true,
        deliveryTime: 800,
        recipientCount: 1
      });

      await orchestrator.routeChannelEventToNotifications(mockEvent);

      // Should not call email delivery since it's disabled
      expect(orchestrator.deliverWhatsAppNotification).toHaveBeenCalled();
      expect(orchestrator.deliverSlackNotification).toHaveBeenCalled();
    });

    test('applies filter rules to exclude events', async () => {
      const mockEvent: ChannelEvent = {
        id: 'filter-test-1',
        channelName: 'supplier:test:org-filter',
        eventType: 'low_priority_update',
        payload: {},
        timestamp: '2024-01-20T20:00:00Z',
        organizationId: 'org-filter'
      };

      const mockConfig: NotificationConfig = {
        channelName: 'supplier:test:org-filter',
        enableWhatsApp: true,
        enableSlack: false,
        enableEmail: false,
        enableSMS: false,
        whatsAppSettings: {} as any,
        slackSettings: {} as any,
        emailSettings: {} as any,
        smsSettings: {} as any,
        filterRules: [
          {
            eventType: 'low_priority_update',
            condition: 'equals',
            value: 'low_priority_update',
            action: 'exclude'
          }
        ],
        priority: 'low'
      };

      vi.spyOn(orchestrator as any, 'getChannelConfig').mockReturnValue(mockConfig);
      vi.spyOn(orchestrator, 'deliverWhatsAppNotification').mockResolvedValue({
        channel: 'whatsapp',
        success: true,
        deliveryTime: 500,
        recipientCount: 1
      });

      await orchestrator.routeChannelEventToNotifications(mockEvent);

      // Should not call any delivery methods due to filter exclusion
      expect(orchestrator.deliverWhatsAppNotification).not.toHaveBeenCalled();
    });
  });

  describe('Priority and Wedding Day Handling', () => {
    test('escalates priority for wedding day events', () => {
      const weddingDayEvent: ChannelEvent = {
        id: 'wedding-day-test',
        channelName: 'urgent:wedding-day:org-priority',
        eventType: 'venue_emergency',
        payload: {
          weddingDate: new Date().toISOString().split('T')[0], // Today
          urgentAlert: true,
          message: 'Power outage at venue'
        },
        timestamp: '2024-01-20T21:00:00Z',
        organizationId: 'org-priority',
        weddingId: 'wedding-today'
      };

      const priority = (orchestrator as any).calculateNotificationPriority(weddingDayEvent, { priority: 'normal' });

      expect(priority).toBe('urgent');
    });

    test('generates wedding-appropriate messages', () => {
      const timelineEvent: ChannelEvent = {
        id: 'message-test',
        channelName: 'notifications:whatsapp:org-message',
        eventType: 'timeline_updated',
        payload: {
          coupleName: 'Riley & Avery',
          ceremonyTime: '4:00 PM',
          receptionTime: '7:00 PM',
          specialNote: 'Moved ceremony indoors due to rain'
        },
        timestamp: '2024-01-20T22:00:00Z',
        organizationId: 'org-message',
        weddingId: 'wedding-message'
      };

      const message = (orchestrator as any).generateWhatsAppMessage(timelineEvent);

      expect(message).toContain('🕐 *Timeline Update* for Riley & Avery');
      expect(message).toContain('Ceremony time: 4:00 PM');
      expect(message).toContain('Reception time: 7:00 PM');
    });
  });
});