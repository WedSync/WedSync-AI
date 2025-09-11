import { NextRequest } from 'next/server';
import { POST as extractionCompleteHandler } from '@/app/api/webhooks/faq/extraction-complete/route';
import { POST as syncStatusHandler } from '@/app/api/webhooks/faq/sync-status/route';
import { POST as processingStatusHandler } from '@/app/api/webhooks/faq/processing-status/route';
import { GET as healthHandler } from '@/app/api/webhooks/faq/health/route';
import crypto from 'crypto';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}));

// Mock webhook processor
jest.mock('@/lib/integrations/faq-webhook-processor', () => ({
  FAQWebhookProcessor: jest.fn().mockImplementation(() => ({
    processWebhook: jest.fn().mockResolvedValue({
      success: true,
      processingTimeMs: 150,
      eventId: 'test-event-id',
    }),
  })),
}));

// Mock environment variables
process.env.WEBHOOK_SECRET = 'test-webhook-secret';

describe('Webhook API Endpoints', () => {
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockProfile = {
    organization_id: '456e7890-e89b-12d3-a456-426614174001',
  };

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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup successful auth mock
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSupabaseClient.single.mockResolvedValue({
      data: mockProfile,
      error: null,
    });
  });

  describe('/api/webhooks/faq/extraction-complete', () => {
    const validPayload = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: new Date().toISOString(),
      jobId: '789e0123-e89b-12d3-a456-426614174002',
      organizationId: '456e7890-e89b-12d3-a456-426614174001',
      extractionResults: {
        totalFAQs: 15,
        successfulExtractions: 15,
        failedExtractions: 0,
        sources: [
          {
            url: 'https://example.com/faq',
            faqCount: 15,
            status: 'success' as const,
          },
        ],
        extractedFAQs: [
          {
            id: '111e1111-e89b-12d3-a456-426614174111',
            question: 'What is your cancellation policy?',
            answer: 'We require 30 days notice.',
            sourceUrl: 'https://example.com/faq',
            confidence: 0.95,
          },
        ],
      },
      metadata: {
        processingTimeMs: 5000,
        providersUsed: ['provider-1'],
        retryAttempts: 0,
      },
    };

    it('should process valid webhook with correct signature and auth', async () => {
      const body = JSON.stringify(validPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.eventId).toBe(validPayload.eventId);
    });

    it('should reject webhook with missing signature', async () => {
      const body = JSON.stringify(validPayload);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toContain('Missing webhook signature');
    });

    it('should reject webhook with invalid content type', async () => {
      const body = JSON.stringify(validPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'text/plain',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Invalid content type');
    });

    it('should reject webhook with invalid JSON', async () => {
      const invalidBody = 'invalid json';
      const signature = createValidSignature(invalidBody);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body: invalidBody,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Invalid JSON payload');
    });

    it('should validate event data schema', async () => {
      const invalidPayload = {
        eventId: 'invalid-uuid', // Invalid UUID
        timestamp: 'invalid-date', // Invalid date
        organizationId: '456e7890-e89b-12d3-a456-426614174001',
        // Missing required fields
      };

      const body = JSON.stringify(invalidPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Invalid event data');
      expect(responseData.details).toBeDefined();
    });

    it('should reject webhook for organization mismatch', async () => {
      const payloadWithDifferentOrg = {
        ...validPayload,
        organizationId: '999e9999-e89b-12d3-a456-426614174999',
      };

      const body = JSON.stringify(payloadWithDifferentOrg);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toContain('Organization mismatch');
    });

    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      const body = JSON.stringify(validPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await extractionCompleteHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toContain('Unauthorized');
    });
  });

  describe('/api/webhooks/faq/sync-status', () => {
    const validSyncPayload = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: new Date().toISOString(),
      syncJobId: '789e0123-e89b-12d3-a456-426614174002',
      organizationId: '456e7890-e89b-12d3-a456-426614174001',
      syncStatus: {
        status: 'completed' as const,
        targetSystem: 'external-crm',
        syncedItemsCount: 15,
        failedItemsCount: 0,
        totalItemsCount: 15,
        errors: [],
        syncMetrics: {
          startTime: new Date(Date.now() - 10000).toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 10000,
          throughputPerSecond: 1.5,
        },
        conflictsResolved: [],
      },
      webhookRetryAttempt: 0,
      metadata: {
        apiVersion: '1.0',
        sourceSystem: 'wedsync',
      },
    };

    it('should process sync status webhook successfully', async () => {
      const body = JSON.stringify(validSyncPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/sync-status',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await syncStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.syncSummary).toBeDefined();
      expect(responseData.syncSummary.status).toBe('completed');
      expect(responseData.syncSummary.syncedItems).toBe(15);
    });

    it('should handle failed sync status appropriately', async () => {
      const failedSyncPayload = {
        ...validSyncPayload,
        syncStatus: {
          ...validSyncPayload.syncStatus,
          status: 'failed' as const,
          syncedItemsCount: 5,
          failedItemsCount: 10,
          errors: [
            {
              itemId: 'item-1',
              error: 'Sync failed due to API timeout',
              errorCode: 'TIMEOUT',
              retryable: true,
            },
          ],
        },
      };

      const body = JSON.stringify(failedSyncPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/sync-status',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await syncStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toContain('sync failed');
      expect(responseData.syncSummary.failedItems).toBe(10);
    });

    it('should support GET requests for health checks', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/sync-status',
        {
          method: 'GET',
        },
      );

      const response = await syncStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.service).toBe('faq-sync-status-webhook');
    });
  });

  describe('/api/webhooks/faq/processing-status', () => {
    const validProcessingPayload = {
      eventId: '123e4567-e89b-12d3-a456-426614174000',
      timestamp: new Date().toISOString(),
      processingJobId: '789e0123-e89b-12d3-a456-426614174002',
      organizationId: '456e7890-e89b-12d3-a456-426614174001',
      processingStatus: {
        status: 'processing' as const,
        currentStage: 'AI Categorization',
        totalStages: 6,
        completedStages: 2,
        processedFAQs: 5,
        totalFAQs: 15,
        errors: [],
        metrics: {
          startTime: new Date(Date.now() - 30000).toISOString(),
          processingRate: 0.33, // FAQs per minute
          averageProcessingTimePerFAQ: 6000,
          aiTokensUsed: 1500,
          aiCost: 0.05,
        },
        stageResults: [
          {
            stage: 'Content Cleaning',
            status: 'completed' as const,
            processedItems: 15,
            errors: 0,
            duration: 2000,
          },
        ],
      },
      weddingContext: {
        vendorType: 'photographer' as const,
        specializations: ['wedding', 'portrait'],
        primaryRegions: ['London'],
      },
    };

    it('should process AI processing status webhook', async () => {
      const body = JSON.stringify(validProcessingPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/processing-status',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await processingStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.processingProgress).toBeDefined();
      expect(responseData.processingProgress.overallProgress).toBe(33); // 5/15 * 100
      expect(responseData.costs).toBeDefined();
      expect(responseData.costs.aiTokensUsed).toBe(1500);
    });

    it('should handle processing completion', async () => {
      const completedProcessingPayload = {
        ...validProcessingPayload,
        processingStatus: {
          ...validProcessingPayload.processingStatus,
          status: 'completed' as const,
          processedFAQs: 15,
          completedStages: 6,
          metrics: {
            ...validProcessingPayload.processingStatus.metrics,
            endTime: new Date().toISOString(),
          },
        },
      };

      const body = JSON.stringify(completedProcessingPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/processing-status',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await processingStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.message).toContain('completed successfully');
      expect(responseData.processingProgress.overallProgress).toBe(100);
    });

    it('should include wedding context in responses', async () => {
      const body = JSON.stringify(validProcessingPayload);
      const signature = createValidSignature(body);

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/processing-status',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'webhook-signature': signature,
          },
          body,
        },
      );

      const response = await processingStatusHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.processingProgress.currentStage).toBe(
        'AI Categorization',
      );
    });
  });

  describe('/api/webhooks/faq/health', () => {
    it('should return health status without authentication', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/health',
        {
          method: 'GET',
        },
      );

      const response = await healthHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.status).toBe('healthy');
      expect(responseData.services).toBeDefined();
      expect(responseData.services['extraction-complete']).toBeDefined();
      expect(responseData.services['sync-status']).toBeDefined();
      expect(responseData.services['processing-status']).toBeDefined();
    });

    it('should include metrics when requested', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/health?includeMetrics=true',
        {
          method: 'GET',
        },
      );

      const response = await healthHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.systemMetrics).toBeDefined();
      expect(responseData.systemMetrics.overallHealth).toBeDefined();
      expect(responseData.systemMetrics.services).toBeDefined();
    });

    it('should handle webhook testing with authentication', async () => {
      const testRequest = {
        includeMetrics: true,
        checkExternalServices: false,
      };

      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/health',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(testRequest),
        },
      );

      const response = await healthHandler(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.tests).toBeDefined();
      expect(responseData.overallStatus).toBeDefined();
      expect(responseData.totalResponseTime).toBeDefined();
    });
  });

  describe('CORS and OPTIONS handling', () => {
    it('should handle OPTIONS requests correctly', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/webhooks/faq/extraction-complete',
        {
          method: 'OPTIONS',
        },
      );

      // Import OPTIONS handler
      const { OPTIONS } = await import(
        '@/app/api/webhooks/faq/extraction-complete/route'
      );
      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Allow')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
        'POST',
      );
    });
  });
});
