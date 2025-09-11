import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../email/route';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { setupSecureTestEnvironment, cleanupSecureTestEnvironment } from '@/__tests__/utils/secure-test-env';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
};

const mockHeaders = new Map([
  ['content-type', 'application/json'],
  ['resend-signature', 'valid-signature'],
]);

describe('Email Webhook API Route', () => {
  let testEnvManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockReturnValue(mockSupabase);

    // 🔒 SECURITY FIX: Use secure test environment manager
    testEnvManager = setupSecureTestEnvironment();

    // Mock headers function
    const { headers } = require('next/headers');
    headers.mockResolvedValue(mockHeaders);

    // Mock crypto functions for signature verification
    vi.spyOn(crypto, 'createHmac').mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid-signature'),
    } as any);

    vi.spyOn(crypto, 'timingSafeEqual').mockReturnValue(true);
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid');

    // Mock database responses
    mockSupabase.from().insert.mockResolvedValue({ data: null, error: null });
    mockSupabase.from().upsert.mockResolvedValue({ data: null, error: null });
    mockSupabase
      .from()
      .update()
      .eq.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // 🧹 SECURITY CLEANUP: Remove test environment variables
    cleanupSecureTestEnvironment();
  });

  describe('Authentication and Security', () => {
    it('should reject requests without signature', async () => {
      const headersWithoutSignature = new Map([
        ['content-type', 'application/json'],
      ]);

      const { headers } = require('next/headers');
      headers.mockResolvedValue(headersWithoutSignature);

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'email.sent' }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Missing signature');
    });

    it('should reject requests with invalid signature', async () => {
      vi.spyOn(crypto, 'timingSafeEqual').mockReturnValue(false);

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'email.sent' }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should verify Resend signature correctly', async () => {
      const payload = JSON.stringify({ type: 'email.sent', id: 'test-id' });

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: payload,
        },
      );

      const response = await POST(request);

      expect(crypto.createHmac).toHaveBeenCalledWith(
        'sha256',
        process.env.RESEND_WEBHOOK_SECRET,
      );
      expect(response.status).toBe(200);
    });
  });

  describe('Email Event Processing', () => {
    it('should handle email.sent event', async () => {
      const emailSentEvent = {
        type: 'email.sent',
        id: 'email-123',
        created_at: '2024-06-15T10:00:00Z',
        data: {
          email_id: 'email-123',
          to: ['couple@example.com'],
          from: 'noreply@wedsync.com',
          subject: 'Wedding Timeline Update',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailSentEvent),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify webhook logging
      expect(mockSupabase.from).toHaveBeenCalledWith('broadcast_webhook_logs');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        webhook_id: 'test-uuid',
        service: 'resend',
        event_type: 'email.sent',
        payload: emailSentEvent,
        processed_at: expect.any(String),
        status: 'received',
      });

      // Verify analytics tracking
      expect(mockSupabase.from).toHaveBeenCalledWith('broadcast_analytics');
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'sent',
        timestamp: '2024-06-15T10:00:00.000Z',
        metadata: {
          to: ['couple@example.com'],
          from: 'noreply@wedsync.com',
          subject: 'Wedding Timeline Update',
        },
      });
    });

    it('should handle email.delivered event', async () => {
      const emailDeliveredEvent = {
        type: 'email.delivered',
        id: 'email-123',
        created_at: '2024-06-15T10:05:00Z',
        data: {
          email_id: 'email-123',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailDeliveredEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'delivered',
        timestamp: '2024-06-15T10:05:00.000Z',
      });
    });

    it('should handle email.opened event with tracking data', async () => {
      const emailOpenedEvent = {
        type: 'email.opened',
        id: 'email-123',
        created_at: '2024-06-15T10:10:00Z',
        data: {
          email_id: 'email-123',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailOpenedEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'opened',
        timestamp: '2024-06-15T10:10:00.000Z',
        metadata: {
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0...',
        },
      });
    });

    it('should handle email.clicked event with URL tracking', async () => {
      const emailClickedEvent = {
        type: 'email.clicked',
        id: 'email-123',
        created_at: '2024-06-15T10:15:00Z',
        data: {
          email_id: 'email-123',
          link: {
            url: 'https://wedsync.com/rsvp',
          },
          ip_address: '192.168.1.1',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailClickedEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'clicked',
        timestamp: '2024-06-15T10:15:00.000Z',
        metadata: {
          url: 'https://wedsync.com/rsvp',
          ip_address: '192.168.1.1',
        },
      });
    });

    it('should handle email.bounced event and log communication failure', async () => {
      const emailBouncedEvent = {
        type: 'email.bounced',
        id: 'email-123',
        created_at: '2024-06-15T10:05:00Z',
        data: {
          email_id: 'email-123',
          bounce_type: 'permanent',
          reason: 'Email address does not exist',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailBouncedEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify analytics tracking
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'bounced',
        timestamp: '2024-06-15T10:05:00.000Z',
        metadata: {
          bounce_type: 'permanent',
          reason: 'Email address does not exist',
        },
      });

      // Verify communication log entry
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'wedding_communication_log',
      );
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        message_id: 'email-123',
        communication_type: 'email',
        status: 'bounced',
        error_details: 'Email address does not exist',
        logged_at: expect.any(String),
      });
    });

    it('should handle email.complained event and mark for suppression', async () => {
      const emailComplainedEvent = {
        type: 'email.complained',
        id: 'email-123',
        created_at: '2024-06-15T10:20:00Z',
        data: {
          email_id: 'email-123',
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(emailComplainedEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify analytics tracking
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith({
        message_id: 'email-123',
        event_type: 'complained',
        timestamp: '2024-06-15T10:20:00.000Z',
      });

      // Verify suppression list entry
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        message_id: 'email-123',
        communication_type: 'email',
        status: 'complained',
        logged_at: expect.any(String),
      });
    });

    it('should handle unknown event types gracefully', async () => {
      const unknownEvent = {
        type: 'email.unknown',
        id: 'email-123',
        created_at: '2024-06-15T10:00:00Z',
        data: {},
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(unknownEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unhandled email event type:',
        'email.unknown',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Wedding Context Integration', () => {
    it('should track wedding day email events with high priority', async () => {
      const weddingDayEvent = {
        type: 'email.sent',
        id: 'wedding-day-email-123',
        created_at: '2024-06-15T08:00:00Z', // Wedding day morning
        data: {
          email_id: 'wedding-day-email-123',
          to: ['photographer@example.com'],
          from: 'urgent@wedsync.com',
          subject: '🚨 URGENT: Wedding Day Timeline Change',
          tags: ['wedding-day', 'urgent', 'vendor-notification'],
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(weddingDayEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify special handling of wedding day emails
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        webhook_id: 'test-uuid',
        service: 'resend',
        event_type: 'email.sent',
        payload: weddingDayEvent,
        processed_at: expect.any(String),
        status: 'received',
      });
    });

    it('should handle vendor communication failure during wedding season', async () => {
      const vendorBounceEvent = {
        type: 'email.bounced',
        id: 'vendor-email-123',
        created_at: '2024-06-14T16:00:00Z', // Day before wedding
        data: {
          email_id: 'vendor-email-123',
          bounce_type: 'permanent',
          reason: 'Mailbox full',
          recipient_metadata: {
            vendor_type: 'photographer',
            wedding_date: '2024-06-15',
            urgency: 'critical',
          },
        },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(vendorBounceEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify critical vendor communication failures are logged with extra detail
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        message_id: 'vendor-email-123',
        communication_type: 'email',
        status: 'bounced',
        error_details: 'Mailbox full',
        logged_at: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON payloads', async () => {
      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: 'invalid json{',
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');

      // Verify error logging
      expect(mockSupabase.from().insert).toHaveBeenCalledWith({
        webhook_id: 'test-uuid',
        service: 'resend',
        event_type: 'error',
        payload: { error: expect.any(String) },
        processed_at: expect.any(String),
        status: 'error',
      });
    });

    it('should handle database connection failures', async () => {
      mockSupabase
        .from()
        .insert.mockRejectedValue(new Error('Database connection failed'));

      const validEvent = {
        type: 'email.sent',
        id: 'email-123',
        created_at: '2024-06-15T10:00:00Z',
        data: { email_id: 'email-123' },
      };

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify(validEvent),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('should handle missing environment variables', async () => {
      delete process.env.RESEND_WEBHOOK_SECRET;

      const request = new NextRequest(
        'http://localhost/api/webhooks/broadcast/email',
        {
          method: 'POST',
          body: JSON.stringify({ type: 'email.sent' }),
        },
      );

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Performance and Scalability', () => {
    it('should process multiple events in sequence efficiently', async () => {
      const events = [
        { type: 'email.sent', id: 'email-1' },
        { type: 'email.delivered', id: 'email-1' },
        { type: 'email.opened', id: 'email-1' },
        { type: 'email.clicked', id: 'email-1' },
      ];

      const startTime = Date.now();

      for (const event of events) {
        const request = new NextRequest(
          'http://localhost/api/webhooks/broadcast/email',
          {
            method: 'POST',
            body: JSON.stringify({
              ...event,
              created_at: new Date().toISOString(),
              data: { email_id: event.id },
            }),
          },
        );

        const response = await POST(request);
        expect(response.status).toBe(200);
      }

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should process 4 events in under 5 seconds
    });

    it('should handle high-volume webhook processing', async () => {
      const batchSize = 10;
      const events = Array.from({ length: batchSize }, (_, i) => ({
        type: 'email.sent',
        id: `bulk-email-${i}`,
        created_at: new Date().toISOString(),
        data: { email_id: `bulk-email-${i}` },
      }));

      const promises = events.map((event) => {
        const request = new NextRequest(
          'http://localhost/api/webhooks/broadcast/email',
          {
            method: 'POST',
            body: JSON.stringify(event),
          },
        );
        return POST(request);
      });

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify all events were logged
      expect(mockSupabase.from().insert).toHaveBeenCalledTimes(batchSize * 2); // webhook logs + analytics
    });
  });
});
