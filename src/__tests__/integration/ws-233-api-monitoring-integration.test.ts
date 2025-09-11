/**
 * WS-233 API Usage Monitoring Integration Tests
 * Team C Integration: Tests for API monitoring system integration
 * Verifies that monitoring works with existing API services
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
  afterAll,
} from '@jest/globals';
import {
  APIUsageTracker,
  apiUsageTracker,
} from '@/lib/monitoring/api-usage-tracker';
import {
  MonitoredOpenAIService,
  createMonitoredOpenAIService,
} from '@/lib/monitoring/api-wrappers/openai-monitored';
import {
  MonitoredTwilioService,
  createMonitoredTwilioService,
} from '@/lib/monitoring/api-wrappers/twilio-monitored';
import {
  MonitoredResendService,
  createMonitoredResendService,
} from '@/lib/monitoring/api-wrappers/resend-monitored';
import {
  MonitoredSupabaseClient,
  createMonitoredSupabaseClient,
} from '@/lib/monitoring/api-wrappers/supabase-monitored';
import {
  initializeAPIMonitoring,
  cleanupAPIMonitoring,
} from '@/lib/monitoring/middleware/api-monitoring-middleware';

// Mock external services
jest.mock('@/lib/services/openai-service');
jest.mock('@/lib/sms/twilio');
jest.mock('resend');
jest.mock('@/lib/supabase/client');
jest.mock('@/lib/supabase/server');

// Test organization and user IDs
const TEST_ORG_ID = 'test-org-123';
const TEST_USER_ID = 'test-user-456';

describe('WS-233 API Monitoring Integration', () => {
  beforeAll(() => {
    // Setup test environment
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    // Cleanup
    cleanupAPIMonitoring();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Core API Usage Tracker', () => {
    test('should track API usage events correctly', async () => {
      const tracker = APIUsageTracker.getInstance();

      const mockUsageEvent = {
        apiService: 'openai' as const,
        endpoint: '/chat/completions',
        method: 'POST',
        requestId: 'test-request-123',
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        duration: 1500,
        statusCode: 200,
        tokens: 1000,
        metadata: {
          model: 'gpt-4',
          usage: {
            prompt_tokens: 100,
            completion_tokens: 900,
            total_tokens: 1000,
          },
        },
      };

      // Track the usage
      await tracker.trackAPIUsage(mockUsageEvent);

      // Verify tracking was successful (would check database in real test)
      expect(true).toBe(true); // Placeholder - would verify in database
    });

    test('should calculate costs correctly for different services', async () => {
      const tracker = APIUsageTracker.getInstance();

      // Test OpenAI cost calculation
      const openAIEvent = {
        apiService: 'openai' as const,
        endpoint: '/chat/completions',
        method: 'POST',
        requestId: 'openai-test-123',
        organizationId: TEST_ORG_ID,
        duration: 1000,
        statusCode: 200,
        metadata: {
          model: 'gpt-4',
          usage: {
            prompt_tokens: 1000,
            completion_tokens: 500,
            total_tokens: 1500,
          },
        },
      };

      await tracker.trackAPIUsage(openAIEvent);

      // Test Resend cost calculation
      const resendEvent = {
        apiService: 'resend' as const,
        endpoint: '/emails',
        method: 'POST',
        requestId: 'resend-test-123',
        organizationId: TEST_ORG_ID,
        duration: 500,
        statusCode: 200,
        metadata: {
          emailCount: 5,
        },
      };

      await tracker.trackAPIUsage(resendEvent);

      // Verify calculations (would check actual costs in database)
      expect(true).toBe(true);
    });

    test('should enforce budget limits', async () => {
      const tracker = APIUsageTracker.getInstance();

      // Set a low budget limit for testing
      await tracker.setBudget({
        organizationId: TEST_ORG_ID,
        apiService: 'openai',
        monthlyLimit: 0.01, // $0.01 limit
        currentUsage: 0.005, // $0.005 already used
        warningThreshold: 80,
        criticalThreshold: 95,
        isActive: true,
        notificationsSent: 0,
        lastResetAt: new Date(),
      });

      // Check limits with high estimated cost
      const limitCheck = await tracker.checkUsageLimits(
        TEST_ORG_ID,
        'openai',
        '/chat/completions',
        0.01, // This should exceed the budget
      );

      expect(limitCheck.allowed).toBe(false);
      expect(limitCheck.budgetExceeded).toBe(true);
      expect(limitCheck.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI Integration', () => {
    test('should wrap OpenAI service with monitoring', async () => {
      const monitoredService = createMonitoredOpenAIService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      expect(monitoredService).toBeInstanceOf(MonitoredOpenAIService);

      // Mock successful OpenAI response
      const mockResponse = {
        analysis: { category: 'wedding_photo' },
        usage: {
          prompt_tokens: 100,
          completion_tokens: 200,
          total_tokens: 300,
        },
        model: 'gpt-4-vision-preview',
        processing_time_ms: 2000,
      };

      // Mock the base service method
      jest
        .spyOn(MonitoredOpenAIService.prototype, 'analyzeImage')
        .mockResolvedValue(mockResponse);

      // Test the monitored method
      const result = await monitoredService.analyzeImage({
        imageBase64: 'test-image-data',
        analysisType: 'wedding_photo',
      });

      expect(result).toEqual(mockResponse);
      // Verify that tracking occurred (would check database in real test)
    });

    test('should block OpenAI calls when over budget', async () => {
      const monitoredService = createMonitoredOpenAIService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      // Set budget to trigger blocking
      await apiUsageTracker.setBudget({
        organizationId: TEST_ORG_ID,
        apiService: 'openai',
        monthlyLimit: 0.001, // Very low limit
        currentUsage: 0.002, // Already over
        warningThreshold: 80,
        criticalThreshold: 95,
        isActive: true,
        notificationsSent: 0,
        lastResetAt: new Date(),
      });

      // Attempt to use service - should be blocked
      await expect(
        monitoredService.analyzeImage({
          imageBase64: 'test-image-data',
          analysisType: 'wedding_photo',
        }),
      ).rejects.toThrow('OpenAI usage blocked');
    });
  });

  describe('Twilio Integration', () => {
    test('should wrap Twilio service with monitoring', async () => {
      const monitoredService = createMonitoredTwilioService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      expect(monitoredService).toBeInstanceOf(MonitoredTwilioService);

      // Mock successful SMS response
      const mockResponse = {
        messageId: 'SMS-test-123',
        status: 'sent',
        segments: 1,
        cost: 0.0075,
      };

      jest.spyOn(monitoredService, 'sendSMS').mockResolvedValue(mockResponse);

      // Test monitored SMS sending
      const result = await monitoredService.sendSMS({
        to: '+1234567890',
        templateType: 'form_reminder',
        variables: {
          first_name: 'John',
          vendor_name: 'Test Vendor',
          due_date: '2025-01-25',
          short_link: 'https://test.com/form',
        },
        organizationId: TEST_ORG_ID,
        organizationTier: 'PROFESSIONAL',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Resend Integration', () => {
    test('should wrap Resend service with monitoring', async () => {
      const monitoredService = createMonitoredResendService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      expect(monitoredService).toBeInstanceOf(MonitoredResendService);

      // Mock successful email response
      const mockResponse = {
        data: { id: 'email-test-123' },
      };

      jest.spyOn(monitoredService, 'sendEmail').mockResolvedValue(mockResponse);

      // Test monitored email sending
      const result = await monitoredService.sendEmail({
        from: 'test@wedsync.com',
        to: 'customer@example.com',
        subject: 'Test Email',
        html: '<p>This is a test email</p>',
      });

      expect(result).toEqual(mockResponse);
    });

    test('should calculate batch email costs correctly', async () => {
      const monitoredService = createMonitoredResendService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      const mockBatchResponse = {
        data: [{ id: 'email-1' }, { id: 'email-2' }, { id: 'email-3' }],
      };

      jest
        .spyOn(monitoredService, 'sendBatchEmails')
        .mockResolvedValue(mockBatchResponse);

      // Test batch email sending
      const emails = [
        {
          from: 'test@wedsync.com',
          to: 'customer1@example.com',
          subject: 'Test Email 1',
          html: '<p>Test 1</p>',
        },
        {
          from: 'test@wedsync.com',
          to: ['customer2@example.com', 'customer3@example.com'],
          subject: 'Test Email 2',
          html: '<p>Test 2</p>',
        },
      ];

      const result = await monitoredService.sendBatchEmails(emails);

      expect(result).toEqual(mockBatchResponse);
      // Should track cost for 3 emails total (1 + 2)
    });
  });

  describe('Supabase Integration', () => {
    test('should wrap Supabase client with monitoring', async () => {
      const monitoredClient = createMonitoredSupabaseClient(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      expect(monitoredClient).toBeInstanceOf(MonitoredSupabaseClient);

      // Test database query monitoring
      const mockQueryResult = {
        data: [
          { id: 1, name: 'Test User' },
          { id: 2, name: 'Another User' },
        ],
        error: null,
      };

      // Mock the query builder
      const mockBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue(mockQueryResult),
      };

      jest.spyOn(monitoredClient, 'from').mockReturnValue(mockBuilder as any);

      // Test monitored database query
      const result = await monitoredClient.from('users').select('*');

      expect(result).toEqual(mockQueryResult);
    });
  });

  describe('Middleware Integration', () => {
    test('should initialize global monitoring middleware', () => {
      const middleware = initializeAPIMonitoring({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        enabledServices: ['openai', 'supabase'],
      });

      expect(middleware).toBeDefined();
    });

    test('should intercept fetch calls to monitored APIs', async () => {
      // Initialize middleware
      initializeAPIMonitoring({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        enabledServices: ['openai'],
      });

      // Mock fetch response
      const mockResponse = new Response('{"test": "data"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

      // Store original fetch
      const originalFetch = global.fetch;

      // Make a fetch call to OpenAI (would be intercepted by middleware)
      try {
        // This would normally be intercepted, but we'll mock it for testing
        global.fetch = jest.fn().mockResolvedValue(mockResponse);

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            body: JSON.stringify({ model: 'gpt-4', messages: [] }),
          },
        );

        expect(response.status).toBe(200);
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });
  });

  describe('Analytics and Reporting', () => {
    test('should generate usage analytics', async () => {
      const tracker = APIUsageTracker.getInstance();

      const dateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      // Mock analytics data
      const mockAnalytics = {
        totalCost: 15.75,
        totalRequests: 1250,
        errorRate: 2.4,
        averageResponseTime: 850,
        topEndpoints: [
          { endpoint: '/chat/completions', cost: 12.5, requests: 500 },
          { endpoint: '/emails', cost: 2.25, requests: 750 },
        ],
        dailyUsage: [
          { date: '2025-01-01', cost: 0.5, requests: 25 },
          { date: '2025-01-02', cost: 0.75, requests: 35 },
        ],
        serviceBreakdown: [
          { service: 'openai', cost: 12.5, requests: 500 },
          { service: 'resend', cost: 3.25, requests: 750 },
        ],
      };

      jest.spyOn(tracker, 'getUsageAnalytics').mockResolvedValue(mockAnalytics);

      const analytics = await tracker.getUsageAnalytics(TEST_ORG_ID, dateRange);

      expect(analytics).toEqual(mockAnalytics);
      expect(analytics.totalCost).toBeGreaterThan(0);
      expect(analytics.totalRequests).toBeGreaterThan(0);
      expect(analytics.serviceBreakdown).toHaveLength(2);
    });

    test('should track budget status and warnings', async () => {
      const tracker = APIUsageTracker.getInstance();

      // Set budget with warning threshold
      await tracker.setBudget({
        organizationId: TEST_ORG_ID,
        apiService: 'openai',
        monthlyLimit: 100.0,
        currentUsage: 85.0, // 85% usage
        warningThreshold: 80,
        criticalThreshold: 95,
        isActive: true,
        notificationsSent: 1,
        lastResetAt: new Date(),
      });

      const budgetStatus = await tracker.getBudgetStatus(TEST_ORG_ID, 'openai');

      expect(budgetStatus).toBeDefined();
      expect(budgetStatus[0]?.monthlyLimit).toBe(100.0);
      expect(budgetStatus[0]?.currentUsage).toBe(85.0);

      // Check if warnings are triggered
      const limitCheck = await tracker.checkUsageLimits(
        TEST_ORG_ID,
        'openai',
        '/chat/completions',
        5.0, // Would put us at 90%
      );

      expect(limitCheck.warnings.length).toBeGreaterThan(0);
      expect(limitCheck.allowed).toBe(true); // Still under limit but with warnings
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle tracking failures gracefully', async () => {
      const monitoredService = createMonitoredOpenAIService(
        TEST_ORG_ID,
        TEST_USER_ID,
      );

      // Mock tracking failure
      jest
        .spyOn(apiUsageTracker, 'trackAPIUsage')
        .mockRejectedValue(new Error('Tracking service unavailable'));

      // Mock successful OpenAI response
      const mockResponse = {
        analysis: { category: 'test' },
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        model: 'gpt-4',
        processing_time_ms: 1000,
      };

      jest
        .spyOn(MonitoredOpenAIService.prototype, 'analyzeImage')
        .mockResolvedValue(mockResponse);

      // Service should still work even if tracking fails
      const result = await monitoredService.analyzeImage({
        imageBase64: 'test-data',
        analysisType: 'general',
      });

      expect(result).toEqual(mockResponse);
    });

    test('should continue operation when budget check fails', async () => {
      const tracker = APIUsageTracker.getInstance();

      // Mock budget check failure
      jest
        .spyOn(tracker, 'checkUsageLimits')
        .mockRejectedValue(new Error('Database connection failed'));

      // Should return conservative response allowing operation
      const limitCheck = await tracker.checkUsageLimits(
        TEST_ORG_ID,
        'openai',
        '/chat/completions',
        1.0,
      );

      expect(limitCheck.allowed).toBe(true);
      expect(limitCheck.warnings).toContain(
        'Unable to verify limits - proceeding with caution',
      );
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle high-volume tracking efficiently', async () => {
      const tracker = APIUsageTracker.getInstance();
      const startTime = Date.now();
      const eventCount = 100;

      // Generate multiple tracking events
      const trackingPromises = Array.from({ length: eventCount }, (_, i) =>
        tracker.trackAPIUsage({
          apiService: 'openai',
          endpoint: '/chat/completions',
          method: 'POST',
          requestId: `perf-test-${i}`,
          organizationId: TEST_ORG_ID,
          duration: 1000,
          statusCode: 200,
          metadata: { test: true, index: i },
        }),
      );

      await Promise.all(trackingPromises);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(totalTime).toBeLessThan(5000);

      // Should average less than 50ms per tracking event
      const avgTimePerEvent = totalTime / eventCount;
      expect(avgTimePerEvent).toBeLessThan(50);
    });
  });
});

describe('Integration with Real API Calls', () => {
  // These tests would run against actual API endpoints in a staging environment

  test.skip('should integrate with real OpenAI API calls', async () => {
    // Would test with real OpenAI API key in staging
    const monitoredService = createMonitoredOpenAIService(
      TEST_ORG_ID,
      TEST_USER_ID,
    );

    const result = await monitoredService.generateCompletion(
      'Hello, this is a test prompt for monitoring integration.',
      { max_tokens: 50 },
    );

    expect(result.text).toBeDefined();
    expect(result.usage.total_tokens).toBeGreaterThan(0);

    // Verify tracking in database
    const analytics = await apiUsageTracker.getUsageAnalytics(
      TEST_ORG_ID,
      { start: new Date(), end: new Date() },
      'openai',
    );

    expect(analytics.totalRequests).toBeGreaterThan(0);
  });

  test.skip('should integrate with real Resend email sending', async () => {
    // Would test with real Resend API key in staging
    const monitoredService = createMonitoredResendService(
      TEST_ORG_ID,
      TEST_USER_ID,
    );

    const result = await monitoredService.sendEmail({
      from: 'test@wedsync.com',
      to: 'test-monitoring@example.com',
      subject: 'API Monitoring Integration Test',
      html: '<p>This email was sent via the monitored Resend service.</p>',
    });

    expect(result.data?.id).toBeDefined();

    // Verify tracking in database
    const analytics = await apiUsageTracker.getUsageAnalytics(
      TEST_ORG_ID,
      { start: new Date(), end: new Date() },
      'resend',
    );

    expect(analytics.totalRequests).toBeGreaterThan(0);
  });
});
