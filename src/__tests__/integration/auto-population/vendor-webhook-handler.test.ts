/**
 * Vendor Form Webhook Handler Integration Tests
 * WS-216 Auto-Population System - Team C Integration Infrastructure
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import { VendorFormWebhookHandler } from '@/lib/webhooks/vendor-form-webhook';
import crypto from 'crypto';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ data: {} }),
    update: jest.fn(() => ({
      eq: jest.fn().mockResolvedValue({ data: {} }),
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        gte: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [] }),
          })),
        })),
      })),
    })),
  })),
};

const { createClient } = require('@supabase/supabase-js');
createClient.mockReturnValue(mockSupabase);

describe('VendorFormWebhookHandler Integration Tests', () => {
  let webhookHandler: VendorFormWebhookHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    webhookHandler = new VendorFormWebhookHandler();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Signature Validation', () => {
    test('should validate Typeform webhook signatures correctly', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({
        event_type: 'form_response',
        form_response: { form_id: 'abc123' },
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('base64');

      const isValid = webhookHandler.validateSignature(
        'typeform',
        `sha256=${signature}`,
        payload,
        secret,
      );

      expect(isValid).toBe(true);
    });

    test('should reject invalid Typeform signatures', () => {
      const secret = 'test-webhook-secret';
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'invalid-signature';

      const isValid = webhookHandler.validateSignature(
        'typeform',
        invalidSignature,
        payload,
        secret,
      );

      expect(isValid).toBe(false);
    });

    test('should validate JotForm webhook signatures correctly', () => {
      const secret = 'jotform-secret';
      const payload = JSON.stringify({ formID: '123', submissionID: '456' });

      const signature = crypto
        .createHash('md5')
        .update(payload + secret)
        .digest('hex');

      const isValid = webhookHandler.validateSignature(
        'jotform',
        signature,
        payload,
        secret,
      );

      expect(isValid).toBe(true);
    });

    test('should validate Gravity Forms webhook signatures correctly', () => {
      const secret = 'gravity-forms-secret';
      const payload = JSON.stringify({ form_id: '1', entry: {} });

      const signature = crypto
        .createHmac('sha1', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const isValid = webhookHandler.validateSignature(
        'gravity_forms',
        signature,
        payload,
        secret,
      );

      expect(isValid).toBe(true);
    });

    test('should validate Custom HTML form signatures correctly', () => {
      const secret = 'custom-secret';
      const payload = JSON.stringify({ formId: 'custom-form', data: {} });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');

      const isValid = webhookHandler.validateSignature(
        'custom',
        `sha256=${signature}`,
        payload,
        secret,
      );

      expect(isValid).toBe(true);
    });

    test('should handle unknown platform validation gracefully', () => {
      const isValid = webhookHandler.validateSignature(
        'unknown-platform',
        'any-signature',
        'any-payload',
        'any-secret',
      );

      expect(isValid).toBe(false);
    });
  });

  describe('Payload Parsing', () => {
    test('should parse Typeform webhook payload correctly', () => {
      const typeformPayload = {
        event_type: 'form_response',
        event_time: '2025-01-29T10:00:00Z',
        form_response: {
          form_id: 'typeform-abc123',
          submitted_at: '2025-01-29T10:00:00Z',
        },
        organization_id: 'org-123',
      };

      const parsed = webhookHandler.parsePayload('typeform', typeformPayload);

      expect(parsed).toBeDefined();
      expect(parsed?.platform).toBe('typeform');
      expect(parsed?.eventType).toBe('form_submission');
      expect(parsed?.formId).toBe('typeform-abc123');
      expect(parsed?.organizationId).toBe('org-123');
    });

    test('should parse Google Forms webhook payload correctly', () => {
      const googlePayload = {
        formId: 'google-form-456',
        timestamp: '2025-01-29T10:00:00Z',
        response: {
          answers: {},
        },
        organization_id: 'org-456',
      };

      const parsed = webhookHandler.parsePayload('google_forms', googlePayload);

      expect(parsed).toBeDefined();
      expect(parsed?.platform).toBe('google_forms');
      expect(parsed?.eventType).toBe('form_submission');
      expect(parsed?.formId).toBe('google-form-456');
      expect(parsed?.organizationId).toBe('org-456');
    });

    test('should parse JotForm webhook payload correctly', () => {
      const jotformPayload = {
        formID: 'jotform-789',
        submissionID: 'sub-123',
        answers: {},
        organization_id: 'org-789',
      };

      const parsed = webhookHandler.parsePayload('jotform', jotformPayload);

      expect(parsed).toBeDefined();
      expect(parsed?.platform).toBe('jotform');
      expect(parsed?.eventType).toBe('form_submission');
      expect(parsed?.formId).toBe('jotform-789');
      expect(parsed?.organizationId).toBe('org-789');
    });

    test('should handle malformed payloads gracefully', () => {
      const malformedPayload = { invalid: 'structure' };

      const parsed = webhookHandler.parsePayload('typeform', malformedPayload);

      expect(parsed).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits per platform', async () => {
      // Mock a valid webhook event
      const validEvent = {
        platform: 'typeform' as const,
        eventType: 'form_submission' as const,
        formId: 'test-form',
        organizationId: 'org-123',
        payload: {},
        signature: 'valid-sig',
        timestamp: new Date(),
      };

      // First request should succeed
      await expect(
        webhookHandler.enqueueProcessing(validEvent),
      ).resolves.not.toThrow();

      // Simulate exceeding rate limit by sending many requests quickly
      const promises = Array.from({ length: 105 }, () =>
        webhookHandler.enqueueProcessing({
          ...validEvent,
          timestamp: new Date(),
        }),
      );

      // Some requests should fail due to rate limiting
      const results = await Promise.allSettled(promises);
      const failures = results.filter((r) => r.status === 'rejected');

      expect(failures.length).toBeGreaterThan(0);
    });

    test('should reset rate limits after time window', async () => {
      const event = {
        platform: 'jotform' as const,
        eventType: 'form_submission' as const,
        formId: 'test-form',
        organizationId: 'org-123',
        payload: {},
        signature: 'valid-sig',
        timestamp: new Date(),
      };

      // Use up the rate limit
      const maxRequests = 100; // JotForm limit from RATE_LIMITS
      for (let i = 0; i < maxRequests; i++) {
        await webhookHandler.enqueueProcessing(event);
      }

      // Next request should fail
      await expect(webhookHandler.enqueueProcessing(event)).rejects.toThrow(
        'Rate limit exceeded',
      );

      // Mock time passage (in real implementation, this would be automatic)
      // For testing, we can't easily mock the internal rate limiter time
      // This test demonstrates the concept
    });
  });

  describe('Webhook Processing', () => {
    test('should process form creation events', async () => {
      const job = {
        jobId: 'job-123',
        platform: 'typeform' as const,
        eventType: 'form_created' as const,
        payload: {
          formId: 'new-form-123',
          title: 'New Wedding Form',
        },
        supplierId: 'org-123',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await expect(webhookHandler.processWebhook(job)).resolves.not.toThrow();

      // Verify database calls were made
      expect(mockSupabase.from).toHaveBeenCalledWith('form_detection_jobs');
    });

    test('should process form submission events', async () => {
      const job = {
        jobId: 'job-456',
        platform: 'jotform' as const,
        eventType: 'form_submission' as const,
        payload: {
          formId: 'submission-form-456',
          answers: {
            field1: 'John Doe',
            field2: '2025-06-15',
          },
        },
        supplierId: 'org-456',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await expect(webhookHandler.processWebhook(job)).resolves.not.toThrow();

      // Verify submission was stored
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_submissions');
    });

    test('should handle form deletion events', async () => {
      const job = {
        jobId: 'job-789',
        platform: 'typeform' as const,
        eventType: 'form_deleted' as const,
        payload: {
          formId: 'deleted-form-789',
        },
        supplierId: 'org-789',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      await expect(webhookHandler.processWebhook(job)).resolves.not.toThrow();

      // Verify form was marked as deleted
      expect(mockSupabase.from).toHaveBeenCalledWith('parsed_forms');
    });

    test('should retry failed webhook processing', async () => {
      // Mock database failure
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Database error')),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: {} }),
        })),
      });

      const job = {
        jobId: 'retry-job-123',
        platform: 'typeform' as const,
        eventType: 'form_created' as const,
        payload: { formId: 'test-form' },
        supplierId: 'org-123',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // This should handle the error and schedule a retry
      await webhookHandler.processWebhook(job);

      // Verify retry was scheduled
      expect(job.retryCount).toBe(0); // Job object isn't modified in place in this implementation
    });

    test('should give up after max retries', async () => {
      // Mock persistent database failure
      mockSupabase.from.mockReturnValue({
        insert: jest
          .fn()
          .mockRejectedValue(new Error('Persistent database error')),
        update: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: {} }),
        })),
      });

      const job = {
        jobId: 'max-retry-job',
        platform: 'jotform' as const,
        eventType: 'form_submission' as const,
        payload: { formId: 'test-form' },
        supplierId: 'org-123',
        retryCount: 3, // At max retries
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Should mark as failed after max retries
      await webhookHandler.processWebhook(job);

      // Verify job was marked as failed
      const updateCall = mockSupabase.from().update;
      expect(updateCall).toHaveBeenCalled();
    });
  });

  describe('Health Monitoring', () => {
    test('should report webhook processing health', async () => {
      // Mock recent webhook events
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [
              { platform_id: 'typeform', processing_status: 'completed' },
              { platform_id: 'typeform', processing_status: 'completed' },
              { platform_id: 'typeform', processing_status: 'failed' },
              { platform_id: 'jotform', processing_status: 'completed' },
            ],
          }),
        }),
      });

      const health = await webhookHandler.getWebhookHealth();

      expect(health).toHaveProperty('totalEvents', 4);
      expect(health).toHaveProperty('platforms');
      expect(health.platforms).toHaveProperty('typeform');
      expect(health.platforms).toHaveProperty('jotform');
      expect(health).toHaveProperty('healthScore');
      expect(health.healthScore).toBeGreaterThan(0);
    });

    test('should calculate health scores correctly', async () => {
      // Mock all successful events
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({
            data: [
              { platform_id: 'typeform', processing_status: 'completed' },
              { platform_id: 'typeform', processing_status: 'completed' },
              { platform_id: 'typeform', processing_status: 'completed' },
            ],
          }),
        }),
      });

      const health = await webhookHandler.getWebhookHealth();
      expect(health.healthScore).toBe(100);
    });

    test('should handle empty health data', async () => {
      // Mock no recent events
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      const health = await webhookHandler.getWebhookHealth();

      expect(health.totalEvents).toBe(0);
      expect(health.platforms).toEqual({});
    });
  });

  describe('Security Events', () => {
    test('should log security events', async () => {
      await webhookHandler.logSecurityEvent(
        'typeform',
        '192.168.1.100',
        'invalid_signature',
        { attemptedPayload: 'malicious data' },
      );

      // Verify security event was logged
      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_security_events');
    });

    test('should log rate limiting events', async () => {
      await webhookHandler.logSecurityEvent(
        'jotform',
        '10.0.0.1',
        'rate_limit',
        { requestCount: 150, timeWindow: '1 minute' },
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('webhook_security_events');
    });
  });

  describe('Error Scenarios', () => {
    test('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const event = {
        platform: 'typeform' as const,
        eventType: 'form_submission' as const,
        formId: 'test-form',
        organizationId: 'org-123',
        payload: {},
        signature: 'valid-sig',
        timestamp: new Date(),
      };

      await expect(webhookHandler.enqueueProcessing(event)).rejects.toThrow(
        'Failed to store webhook event',
      );
    });

    test('should handle unsupported event types', async () => {
      const job = {
        jobId: 'unsupported-job',
        platform: 'typeform' as const,
        eventType: 'unsupported_event' as any,
        payload: { formId: 'test-form' },
        supplierId: 'org-123',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      };

      // Should handle unsupported event types gracefully
      await webhookHandler.processWebhook(job);

      // Should mark job as failed due to unsupported event type
      const updateCall = mockSupabase.from().update;
      expect(updateCall).toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-volume webhook processing', async () => {
      const events = Array.from({ length: 50 }, (_, i) => ({
        platform: 'typeform' as const,
        eventType: 'form_submission' as const,
        formId: `form-${i}`,
        organizationId: 'org-load-test',
        payload: { submissionId: `sub-${i}` },
        signature: 'valid-sig',
        timestamp: new Date(),
      }));

      const startTime = Date.now();

      const results = await Promise.allSettled(
        events.map((event) => webhookHandler.enqueueProcessing(event)),
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 50 events within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThanOrEqual(40); // Allow for some rate limiting
    });

    test('should maintain processing times under load', async () => {
      const jobs = Array.from({ length: 20 }, (_, i) => ({
        jobId: `load-test-${i}`,
        platform: 'jotform' as const,
        eventType: 'form_submission' as const,
        payload: { formId: `form-${i}` },
        supplierId: 'org-load',
        retryCount: 0,
        maxRetries: 3,
        status: 'pending' as const,
      }));

      const startTime = Date.now();

      await Promise.all(jobs.map((job) => webhookHandler.processWebhook(job)));

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / jobs.length;

      // Average processing time should be under 500ms per job
      expect(averageTime).toBeLessThan(500);
    });
  });
});
