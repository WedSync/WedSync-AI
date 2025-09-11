import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { SMSBroadcastService } from '../sms-service';
import { createClient } from '@supabase/supabase-js';
import { Twilio } from 'twilio';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('twilio');

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
      in: vi.fn(),
      order: vi.fn(() => ({
        limit: vi.fn(),
      })),
    })),
    insert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    upsert: vi.fn(),
  })),
  auth: {
    getUser: vi.fn(),
  },
};

const mockTwilioClient = {
  messages: {
    create: vi.fn(),
  },
};

describe('SMSBroadcastService', () => {
  let smsService: SMSBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);
    (Twilio as Mock).mockImplementation(() => mockTwilioClient);
    smsService = new SMSBroadcastService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wedding Day Protocol', () => {
    it('should send urgent wedding day messages immediately', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'URGENT: Venue Change',
        content: 'Wedding venue changed to backup location',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          priority: 'urgent',
          wedding_date: new Date().toISOString().split('T')[0],
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Wedding Vendor',
          type: 'vendor',
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
        errorCode: null,
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('🚨 URGENT'),
        to: '+1234567890',
        from: expect.any(String),
      });
      expect(result.success).toBe(true);
    });

    it('should escalate failed wedding day messages', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Wedding Day Update',
        content: 'Timeline change',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          wedding_date: new Date().toISOString().split('T')[0],
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Wedding Vendor',
          type: 'vendor',
          email: 'vendor@example.com',
        },
      ];

      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Phone number unreachable'),
      );

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should escalate to email when SMS fails on wedding day
      expect(result.escalated_to_email).toBe(true);
      expect(result.errors).toContain('Phone number unreachable');
    });
  });

  describe('Quiet Hours Handling', () => {
    it('should respect quiet hours (10 PM - 8 AM)', async () => {
      // Mock current time as 11 PM
      const lateNightTime = new Date();
      lateNightTime.setHours(23, 0, 0, 0);
      vi.setSystemTime(lateNightTime);

      const mockBroadcast = {
        id: 'test-id',
        title: 'Regular Update',
        content: 'Non-urgent message',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: { priority: 'normal' },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Couple',
          type: 'couple',
        },
      ];

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should queue message for next day
      expect(result.queued_for_morning).toBe(true);
      expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should override quiet hours for urgent wedding day messages', async () => {
      // Mock current time as 2 AM
      const earlyMorningTime = new Date();
      earlyMorningTime.setHours(2, 0, 0, 0);
      vi.setSystemTime(earlyMorningTime);

      const mockBroadcast = {
        id: 'test-id',
        title: 'URGENT: Wedding Emergency',
        content: 'Immediate action required',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          priority: 'urgent',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Vendor',
          type: 'vendor',
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should send immediately despite quiet hours
      expect(mockTwilioClient.messages.create).toHaveBeenCalled();
      expect(result.success).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('WhatsApp Integration', () => {
    it('should format WhatsApp messages with rich content', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Wedding Timeline Update',
        content: 'Your photography timeline has been updated',
        recipient_type: 'photographer' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: '2024-06-15',
          couple_names: 'Sarah & Mike',
          timeline_changes: ['First look at 3 PM', 'Ceremony at 5 PM'],
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: 'whatsapp:+1234567890',
          name: 'Photographer',
          type: 'photographer',
          preferred_channel: 'whatsapp',
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('📸 Wedding Timeline Update'),
        to: 'whatsapp:+1234567890',
        from: expect.stringContaining('whatsapp:'),
        mediaUrl: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should handle WhatsApp template messages', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Appointment Reminder',
        content: 'Your wedding consultation is tomorrow',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: {
          template_name: 'wedding_reminder',
          template_language: 'en',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: 'whatsapp:+1234567890',
          name: 'Couple',
          type: 'couple',
          preferred_channel: 'whatsapp',
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.any(String),
        to: 'whatsapp:+1234567890',
        from: expect.stringContaining('whatsapp:'),
        contentSid: expect.stringContaining('HX'), // WhatsApp template SID
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should respect concurrent message limits', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Mass Update',
        content: 'General announcement',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      // Create 20 recipients to test rate limiting
      const mockRecipients = Array.from({ length: 20 }, (_, i) => ({
        id: `recipient-${i}`,
        phone: `+123456789${i}`,
        name: `Vendor ${i}`,
        type: 'vendor',
      }));

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should process in batches of 5 concurrent messages
      expect(result.success).toBe(true);
      expect(result.sent_count).toBe(20);
      expect(result.processing_time).toBeGreaterThan(0);
    });

    it('should handle rate limit errors from Twilio', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Message',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Vendor',
          type: 'vendor',
        },
      ];

      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).code = 20429;

      mockTwilioClient.messages.create.mockRejectedValue(rateLimitError);

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.success).toBe(false);
      expect(result.queued_for_retry).toBe(true);
      expect(result.errors).toContain('Rate limit exceeded');
    });
  });

  describe('Delivery Status Tracking', () => {
    it('should track successful deliveries', async () => {
      const messageId = 'SM123456789';
      const recipientId = 'recipient-1';
      const status = 'delivered';

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      await smsService.updateDeliveryStatus(messageId, recipientId, status);

      expect(mockSupabase.from).toHaveBeenCalledWith('sms_analytics');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        message_id: messageId,
        recipient_id: recipientId,
        status: status,
        timestamp: expect.any(String),
      });
    });

    it('should track failed deliveries with error codes', async () => {
      const messageId = 'SM123456789';
      const recipientId = 'recipient-1';
      const status = 'failed';
      const errorCode = '30006'; // Landline not supported

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      await smsService.updateDeliveryStatus(
        messageId,
        recipientId,
        status,
        errorCode,
      );

      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        message_id: messageId,
        recipient_id: recipientId,
        status: status,
        error_code: errorCode,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Wedding Context Personalization', () => {
    it('should personalize messages with wedding details', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Wedding Reminder for {{couple_names}}',
        content:
          'Hello {{vendor_name}}, the wedding for {{couple_names}} on {{wedding_date}} is approaching. {{timeline_details}}',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          couple_names: 'Emma & James',
          wedding_date: '2024-06-15',
          timeline_details: 'Setup starts at 2 PM',
        },
      };

      const recipient = {
        id: 'recipient-1',
        phone: '+1234567890',
        name: 'Wedding Florist',
        type: 'vendor',
        metadata: { vendor_type: 'florist' },
      };

      const personalizedMessage = smsService.personalizeMessage(
        mockBroadcast,
        recipient,
      );

      expect(personalizedMessage).toContain(
        'Wedding Reminder for Emma & James',
      );
      expect(personalizedMessage).toContain('Hello Wedding Florist');
      expect(personalizedMessage).toContain('Emma & James on June 15, 2024');
      expect(personalizedMessage).toContain('Setup starts at 2 PM');
    });

    it('should handle vendor-specific message formatting', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Vendor Update',
        content: 'Important update for your services',
        recipient_type: 'photographer' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const photographerRecipient = {
        id: 'recipient-1',
        phone: '+1234567890',
        name: 'John Photography',
        type: 'photographer',
      };

      const personalizedMessage = smsService.personalizeMessage(
        mockBroadcast,
        photographerRecipient,
      );

      expect(personalizedMessage).toContain('📸'); // Photography emoji
      expect(personalizedMessage).toContain('John Photography');
    });
  });

  describe('Emergency Escalation', () => {
    it('should escalate to phone calls for critical wedding day failures', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'CRITICAL: Venue Emergency',
        content: 'Immediate action required',
        recipient_type: 'venue' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          priority: 'critical',
          escalation_level: 'phone_call',
        },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Venue Manager',
          type: 'venue',
          emergency_contact: '+1234567891',
        },
      ];

      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Message failed'),
      );

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.escalated_to_phone_call).toBe(true);
      expect(result.emergency_contacts_called).toEqual(['+1234567891']);
    });
  });

  describe('Compliance and Opt-out Management', () => {
    it('should respect opt-out preferences', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Marketing Update',
        content: 'New features available',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: { message_type: 'promotional' },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Opted Out Couple',
          type: 'couple',
          sms_opted_out: true,
        },
        {
          id: 'recipient-2',
          phone: '+1234567891',
          name: 'Active Couple',
          type: 'couple',
          sms_opted_out: false,
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should only send to one recipient (non-opted-out)
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(1);
      expect(result.skipped_opted_out).toBe(1);
      expect(result.sent_count).toBe(1);
    });

    it('should include opt-out instructions in promotional messages', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Special Offer',
        content: 'Get 20% off your next booking',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: { message_type: 'promotional' },
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Couple',
          type: 'couple',
        },
      ];

      mockTwilioClient.messages.create.mockResolvedValue({
        sid: 'SM123456789',
        status: 'sent',
      });

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: expect.stringContaining('Reply STOP to opt out'),
        to: '+1234567890',
        from: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid phone numbers', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Message',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: 'invalid-phone',
          name: 'Vendor',
          type: 'vendor',
        },
      ];

      const validationError = new Error('Invalid phone number');
      (validationError as any).code = 21211;

      mockTwilioClient.messages.create.mockRejectedValue(validationError);

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.success).toBe(false);
      expect(result.invalid_numbers).toBe(1);
      expect(result.errors).toContain('Invalid phone number');
    });

    it('should handle Twilio service unavailability', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Message',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          phone: '+1234567890',
          name: 'Vendor',
          type: 'vendor',
        },
      ];

      mockTwilioClient.messages.create.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await smsService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.success).toBe(false);
      expect(result.retry_scheduled).toBe(true);
    });
  });
});
