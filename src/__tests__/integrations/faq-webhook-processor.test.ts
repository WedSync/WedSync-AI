import { FAQWebhookProcessor } from '@/lib/integrations/faq-webhook-processor';
import { WebhookEvent, WebhookProcessingResult } from '@/types/faq-integration';
import crypto from 'crypto';

// Mock environment variables
process.env.WEBHOOK_SECRET = 'test-webhook-secret-key';

describe('FAQWebhookProcessor', () => {
  let processor: FAQWebhookProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new FAQWebhookProcessor();
  });

  afterEach(() => {
    processor.destroy();
  });

  const createValidSignature = (payload: string): string => {
    return crypto
      .createHmac(
        'sha256',
        process.env.WEBHOOK_SECRET ||
          (() => {
            throw new Error('Missing environment variable: WEBHOOK_SECRET');
          })(),
      )
      .update(payload, 'utf8')
      .digest('hex');
  };

  const mockEvent: WebhookEvent = {
    type: 'faq.extraction.complete',
    id: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: new Date(),
    organizationId: '456e7890-e89b-12d3-a456-426614174001',
    data: {
      jobId: '789e0123-e89b-12d3-a456-426614174002',
      extractionResults: {
        totalFAQs: 15,
        successfulExtractions: 15,
        failedExtractions: 0,
      },
    },
  };

  describe('processWebhook', () => {
    it('should process valid webhook with correct signature', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        mockEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(true);
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.eventId).toBe(mockEvent.id);
    });

    it('should reject webhook with invalid signature', async () => {
      const invalidSignature = 'invalid-signature';

      const result = await processor.processWebhook(
        mockEvent,
        invalidSignature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
      expect(result.securityViolation).toBe(true);
    });

    it('should enforce rate limits per organization', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      // Send multiple requests rapidly
      const promises = Array(10)
        .fill(null)
        .map(() =>
          processor.processWebhook(
            mockEvent,
            signature,
            mockEvent.organizationId,
            '192.168.1.1',
          ),
        );

      const results = await Promise.all(promises);
      const rateLimitedResults = results.filter(
        (r) => !r.success && r.error?.includes('rate limit'),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should detect replay attacks', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      // Process same event twice
      await processor.processWebhook(
        mockEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      const result = await processor.processWebhook(
        mockEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('duplicate event');
      expect(result.securityViolation).toBe(true);
    });

    it('should handle webhook timeout protection', async () => {
      // Mock a handler that takes too long
      const slowHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 35000)),
          ),
      };

      processor['eventHandlers'].set('faq.extraction.complete', slowHandler);

      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        mockEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should isolate organizations properly', async () => {
      const otherOrgId = '999e9999-e89b-12d3-a456-426614174999';
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        mockEvent,
        signature,
        otherOrgId, // Different organization ID
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Organization mismatch');
      expect(result.securityViolation).toBe(true);
    });

    it('should handle malformed event data gracefully', async () => {
      const malformedEvent = {
        ...mockEvent,
        type: undefined as any,
        data: null,
      };

      const payload = JSON.stringify(malformedEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        malformedEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event data');
    });

    it('should track security metrics', async () => {
      const payload = JSON.stringify(mockEvent);
      const invalidSignature = 'invalid-signature';

      // Multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await processor.processWebhook(
          mockEvent,
          invalidSignature,
          mockEvent.organizationId,
          '192.168.1.1',
        );
      }

      const metrics = processor.getSecurityMetrics();
      expect(metrics.securityViolations).toBeGreaterThan(0);
      expect(metrics.invalidSignatureAttempts).toBe(3);
    });
  });

  describe('event handler registration', () => {
    it('should register and use custom event handlers', async () => {
      const mockHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockResolvedValue({ success: true }),
      };

      processor.registerEventHandler('faq.test.event', mockHandler);

      const testEvent: WebhookEvent = {
        ...mockEvent,
        type: 'faq.test.event',
      };

      const payload = JSON.stringify(testEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        testEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(true);
      expect(mockHandler.canHandle).toHaveBeenCalledWith(testEvent);
      expect(mockHandler.handle).toHaveBeenCalledWith(
        testEvent,
        mockEvent.organizationId,
      );
    });

    it('should handle events without registered handlers', async () => {
      const unknownEvent: WebhookEvent = {
        ...mockEvent,
        type: 'unknown.event.type' as any,
      };

      const payload = JSON.stringify(unknownEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        unknownEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('No handler found');
    });
  });

  describe('dead letter queue', () => {
    it('should send failed events to dead letter queue after max retries', async () => {
      const failingHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockRejectedValue(new Error('Handler failed')),
      };

      processor['eventHandlers'].set('faq.extraction.complete', failingHandler);

      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      // Simulate multiple retry attempts
      for (let i = 0; i < 4; i++) {
        await processor.processWebhook(
          mockEvent,
          signature,
          mockEvent.organizationId,
          '192.168.1.1',
        );
      }

      const dlqEvents = processor.getDeadLetterQueueEvents();
      expect(dlqEvents.length).toBeGreaterThan(0);
      expect(dlqEvents[0].eventId).toBe(mockEvent.id);
    });

    it('should allow reprocessing events from dead letter queue', async () => {
      // First, add event to DLQ
      const failingHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockRejectedValue(new Error('Handler failed')),
      };

      processor['eventHandlers'].set('faq.extraction.complete', failingHandler);

      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      for (let i = 0; i < 4; i++) {
        await processor.processWebhook(
          mockEvent,
          signature,
          mockEvent.organizationId,
          '192.168.1.1',
        );
      }

      // Now fix the handler and reprocess
      const workingHandler = {
        canHandle: jest.fn().mockReturnValue(true),
        handle: jest.fn().mockResolvedValue({ success: true }),
      };

      processor['eventHandlers'].set('faq.extraction.complete', workingHandler);

      const reprocessResult = await processor.reprocessDeadLetterEvent(
        mockEvent.id,
      );
      expect(reprocessResult.success).toBe(true);
    });
  });

  describe('webhook validation', () => {
    it('should validate event timestamp freshness', async () => {
      const oldEvent: WebhookEvent = {
        ...mockEvent,
        timestamp: new Date(Date.now() - 3600000), // 1 hour old
      };

      const payload = JSON.stringify(oldEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        oldEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('stale');
    });

    it('should validate required event fields', async () => {
      const incompleteEvent = {
        type: 'faq.extraction.complete',
        // Missing required fields
      } as any;

      const payload = JSON.stringify(incompleteEvent);
      const signature = createValidSignature(payload);

      const result = await processor.processWebhook(
        incompleteEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event data');
    });
  });

  describe('monitoring and metrics', () => {
    it('should collect processing metrics', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      await processor.processWebhook(
        mockEvent,
        signature,
        mockEvent.organizationId,
        '192.168.1.1',
      );

      const metrics = processor.getProcessingMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should track processing metrics over time', async () => {
      const payload = JSON.stringify(mockEvent);
      const signature = createValidSignature(payload);

      // Process multiple events
      for (let i = 0; i < 5; i++) {
        const event = { ...mockEvent, id: `event-${i}` };
        await processor.processWebhook(
          event,
          signature,
          mockEvent.organizationId,
          '192.168.1.1',
        );
      }

      const metrics = processor.getProcessingMetrics();
      expect(metrics.totalProcessed).toBe(5);
      expect(metrics.last24Hours).toBe(5);
    });
  });
});
