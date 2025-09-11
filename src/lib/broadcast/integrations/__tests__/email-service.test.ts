import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { EmailBroadcastService } from '../email-service';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('resend');

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

const mockResend = {
  batch: {
    send: vi.fn(),
  },
  emails: {
    send: vi.fn(),
  },
};

describe('EmailBroadcastService', () => {
  let emailService: EmailBroadcastService;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);
    (Resend as Mock).mockImplementation(() => mockResend);
    emailService = new EmailBroadcastService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Wedding-themed Template Generation', () => {
    it('should generate venue reminder template', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Venue Final Check',
        content: 'Please confirm your availability',
        recipient_type: 'venue' as const,
        organization_id: 'org-123',
        metadata: { wedding_date: '2024-06-15', couple_names: 'John & Jane' },
      };

      const template = await emailService.generateTemplate(mockBroadcast);

      expect(template.subject).toContain('Venue Final Check');
      expect(template.html).toContain('John & Jane');
      expect(template.html).toContain('June 15, 2024');
      expect(template.html).toContain('venue');
    });

    it('should generate photographer timeline template', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Photography Timeline Update',
        content: 'Updated timeline attached',
        recipient_type: 'photographer' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: '2024-06-15',
          couple_names: 'Sarah & Mike',
          timeline_changes: [
            'First look moved to 3pm',
            'Reception starts at 6pm',
          ],
        },
      };

      const template = await emailService.generateTemplate(mockBroadcast);

      expect(template.subject).toContain('Photography Timeline Update');
      expect(template.html).toContain('First look moved to 3pm');
      expect(template.html).toContain('Reception starts at 6pm');
      expect(template.html).toContain('Sarah & Mike');
    });

    it('should generate guest communication template', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Guest List Update',
        content: 'Dietary requirements needed',
        recipient_type: 'guest' as const,
        organization_id: 'org-123',
        metadata: {
          wedding_date: '2024-06-15',
          couple_names: 'Alex & Jordan',
          rsvp_deadline: '2024-05-15',
        },
      };

      const template = await emailService.generateTemplate(mockBroadcast);

      expect(template.subject).toContain('Guest List Update');
      expect(template.html).toContain('Alex & Jordan');
      expect(template.html).toContain('May 15, 2024');
      expect(template.html).toContain('dietary');
    });
  });

  describe('Batch Processing', () => {
    it('should process emails in batches of 50', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Broadcast',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = Array.from({ length: 125 }, (_, i) => ({
        id: `recipient-${i}`,
        email: `recipient${i}@example.com`,
        name: `Recipient ${i}`,
        type: 'vendor',
      }));

      mockSupabase.from().select().in.mockResolvedValue({
        data: mockRecipients,
        error: null,
      });

      mockResend.batch.send.mockResolvedValue({
        data: [{ id: 'email-1' }, { id: 'email-2' }],
        error: null,
      });

      const result = await emailService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Should make 3 batch calls (50 + 50 + 25)
      expect(mockResend.batch.send).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.sent_count).toBe(125);
    });

    it('should handle batch failures gracefully', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Broadcast',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = Array.from({ length: 10 }, (_, i) => ({
        id: `recipient-${i}`,
        email: `recipient${i}@example.com`,
        name: `Recipient ${i}`,
        type: 'vendor',
      }));

      mockResend.batch.send.mockRejectedValue(new Error('Rate limit exceeded'));

      const result = await emailService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Rate limit exceeded');
    });
  });

  describe('Personalization Engine', () => {
    it('should personalize content with recipient data', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Hello {{name}}',
        content: 'Your wedding on {{wedding_date}} is approaching, {{name}}!',
        recipient_type: 'couple' as const,
        organization_id: 'org-123',
        metadata: { wedding_date: '2024-06-15' },
      };

      const recipient = {
        id: 'recipient-1',
        email: 'john@example.com',
        name: 'John Smith',
        type: 'couple',
        metadata: { wedding_date: '2024-06-15' },
      };

      const personalizedContent = emailService.personalizeContent(
        mockBroadcast,
        recipient,
      );

      expect(personalizedContent.title).toBe('Hello John Smith');
      expect(personalizedContent.content).toContain(
        'Your wedding on June 15, 2024 is approaching, John Smith!',
      );
    });

    it('should handle missing personalization data', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Hello {{name}}',
        content: 'Wedding date: {{wedding_date}}',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const recipient = {
        id: 'recipient-1',
        email: 'vendor@example.com',
        name: '',
        type: 'vendor',
        metadata: {},
      };

      const personalizedContent = emailService.personalizeContent(
        mockBroadcast,
        recipient,
      );

      expect(personalizedContent.title).toBe('Hello there');
      expect(personalizedContent.content).toContain('Wedding date: [Date TBD]');
    });
  });

  describe('Analytics and Tracking', () => {
    it('should track email opens', async () => {
      const emailId = 'email-123';
      const recipientId = 'recipient-456';

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      await emailService.trackEmailOpen(emailId, recipientId);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_analytics');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        email_id: emailId,
        recipient_id: recipientId,
        event_type: 'open',
        timestamp: expect.any(String),
      });
    });

    it('should track email clicks', async () => {
      const emailId = 'email-123';
      const recipientId = 'recipient-456';
      const clickedUrl = 'https://example.com/rsvp';

      mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });

      await emailService.trackEmailClick(emailId, recipientId, clickedUrl);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_analytics');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        email_id: emailId,
        recipient_id: recipientId,
        event_type: 'click',
        timestamp: expect.any(String),
        metadata: { clicked_url: clickedUrl },
      });
    });

    it('should generate analytics report', async () => {
      const broadcastId = 'broadcast-123';

      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { event_type: 'open', recipient_id: 'r1' },
            { event_type: 'open', recipient_id: 'r2' },
            { event_type: 'click', recipient_id: 'r1' },
            { event_type: 'bounce', recipient_id: 'r3' },
          ],
          error: null,
        });

      const analytics = await emailService.getAnalytics(broadcastId);

      expect(analytics.total_opens).toBe(2);
      expect(analytics.total_clicks).toBe(1);
      expect(analytics.bounce_rate).toBe(0.25); // 1 bounce out of 4 total
      expect(analytics.open_rate).toBe(0.5); // 2 opens out of 4 recipients
    });
  });

  describe('Wedding Day Protocol', () => {
    it('should apply wedding day urgency formatting', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'URGENT: Wedding Day Update',
        content: 'Timeline change required',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {
          is_wedding_day: true,
          wedding_date: new Date().toISOString().split('T')[0],
        },
      };

      const template = await emailService.generateTemplate(mockBroadcast);

      expect(template.subject).toContain('🚨 URGENT');
      expect(template.html).toContain('WEDDING DAY UPDATE');
      expect(template.html).toContain('#ff0000'); // Red color for urgency
    });

    it('should prioritize wedding day emails', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Wedding Day Update',
        content: 'Important change',
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
          email: 'vendor@example.com',
          name: 'Vendor',
          type: 'vendor',
        },
      ];

      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-1' },
        error: null,
      });

      const result = await emailService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      // Wedding day emails should use immediate send, not batch
      expect(mockResend.emails.send).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Resend API errors', async () => {
      const mockBroadcast = {
        id: 'test-id',
        title: 'Test Broadcast',
        content: 'Test content',
        recipient_type: 'vendor' as const,
        organization_id: 'org-123',
        metadata: {},
      };

      const mockRecipients = [
        {
          id: 'recipient-1',
          email: 'invalid-email',
          name: 'Test',
          type: 'vendor',
        },
      ];

      mockResend.batch.send.mockRejectedValue(
        new Error('Invalid email address'),
      );

      const result = await emailService.sendBroadcast(
        mockBroadcast,
        mockRecipients,
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });

    it('should handle database connection errors', async () => {
      mockSupabase
        .from()
        .select()
        .in.mockRejectedValue(new Error('Database connection failed'));

      const result = await emailService.sendBroadcast({} as any, []);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Database connection failed');
    });
  });
});
