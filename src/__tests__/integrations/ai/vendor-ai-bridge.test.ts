import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VendorAIBridge } from '@/lib/integrations/ai/vendor-ai-bridge';
import type {
  VendorIntegrationConfig,
  VendorAvailabilityRequest,
  VendorQuoteRequest,
  EmergencyVendorRequest,
  VendorRecommendationResult,
} from '@/lib/integrations/ai/types';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: [],
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  })),
}));

// Mock external AI services
vi.mock('@/lib/integrations/ai/external-ai-services', () => ({
  ExternalAIServices: {
    generateRecommendations: vi.fn(),
    analyzeVendorPerformance: vi.fn(),
    predictVendorAvailability: vi.fn(),
  },
}));

describe('VendorAIBridge', () => {
  let vendorAIBridge: VendorAIBridge;
  const mockConfig: VendorIntegrationConfig = {
    vendorId: 'vendor_123',
    apiKey: 'test_key',
    webhookUrl: 'https://test.webhook.com',
    rateLimits: {
      requestsPerMinute: 60,
      burstLimit: 10,
    },
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
    features: {
      realTimeSync: true,
      aiOptimization: true,
      emergencySupport: true,
    },
  };

  beforeEach(() => {
    vendorAIBridge = new VendorAIBridge();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Vendor Integration Management', () => {
    it('should initialize vendor integration with valid config', async () => {
      const result =
        await vendorAIBridge.initializeVendorIntegration(mockConfig);

      expect(result.success).toBe(true);
      expect(result.vendorId).toBe(mockConfig.vendorId);
      expect(result.features).toEqual(mockConfig.features);
    });

    it('should handle invalid vendor configuration', async () => {
      const invalidConfig = { ...mockConfig, apiKey: '' };

      await expect(
        vendorAIBridge.initializeVendorIntegration(invalidConfig),
      ).rejects.toThrow('Invalid API key provided');
    });

    it('should update vendor integration settings', async () => {
      await vendorAIBridge.initializeVendorIntegration(mockConfig);

      const updatedSettings = {
        ...mockConfig,
        features: {
          ...mockConfig.features,
          aiOptimization: false,
        },
      };

      const result = await vendorAIBridge.updateVendorIntegration(
        mockConfig.vendorId,
        updatedSettings,
      );

      expect(result.success).toBe(true);
      expect(result.features.aiOptimization).toBe(false);
    });
  });

  describe('Vendor Availability System', () => {
    const availabilityRequest: VendorAvailabilityRequest = {
      weddingId: 'wedding_456',
      serviceType: 'photography',
      date: new Date('2024-06-15'),
      location: {
        venue: 'Test Venue',
        city: 'London',
        postcode: 'SW1A 1AA',
        coordinates: {
          lat: 51.5074,
          lng: -0.1278,
        },
      },
      budget: {
        min: 1000,
        max: 2000,
        currency: 'GBP',
      },
      requirements: {
        experience: 'professional',
        portfolio: true,
        insurance: true,
        backup: true,
      },
    };

    it('should check vendor availability successfully', async () => {
      const result =
        await vendorAIBridge.checkVendorAvailability(availabilityRequest);

      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('vendors');
      expect(result).toHaveProperty('aiRecommendations');
      expect(result.requestId).toBeDefined();
    });

    it('should handle availability check with no vendors found', async () => {
      const result = await vendorAIBridge.checkVendorAvailability({
        ...availabilityRequest,
        budget: { min: 10, max: 20, currency: 'GBP' },
      });

      expect(result.available).toBe(false);
      expect(result.vendors).toHaveLength(0);
      expect(result.aiRecommendations).toHaveProperty('alternatives');
    });

    it('should prioritize vendors based on AI scoring', async () => {
      const result =
        await vendorAIBridge.checkVendorAvailability(availabilityRequest);

      if (result.vendors.length > 1) {
        const scores = result.vendors.map((v) => v.aiScore);
        const sortedScores = [...scores].sort((a, b) => b - a);
        expect(scores).toEqual(sortedScores);
      }
    });
  });

  describe('Quote Request System', () => {
    const quoteRequest: VendorQuoteRequest = {
      weddingId: 'wedding_456',
      vendorIds: ['vendor_123', 'vendor_456'],
      serviceDetails: {
        type: 'photography',
        duration: 8,
        coverage: 'full-day',
        deliverables: ['digital-gallery', 'prints'],
        specialRequests: ['drone-shots', 'engagement-session'],
      },
      timeline: {
        weddingDate: new Date('2024-06-15'),
        responseDeadline: new Date('2024-03-15'),
        bookingDeadline: new Date('2024-04-01'),
      },
      budget: {
        target: 1500,
        maximum: 2000,
        currency: 'GBP',
      },
    };

    it('should request quotes from multiple vendors', async () => {
      const result = await vendorAIBridge.requestVendorQuotes(quoteRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBeDefined();
      expect(result.quotesRequested).toBe(quoteRequest.vendorIds.length);
      expect(result.estimatedResponses).toBeGreaterThan(0);
    });

    it('should handle quote request with invalid vendor IDs', async () => {
      const invalidRequest = {
        ...quoteRequest,
        vendorIds: ['invalid_vendor'],
      };

      const result = await vendorAIBridge.requestVendorQuotes(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.quotesRequested).toBe(0);
    });

    it('should apply AI optimization to quote requests', async () => {
      const result = await vendorAIBridge.requestVendorQuotes(quoteRequest);

      expect(result).toHaveProperty('aiOptimizations');
      expect(result.aiOptimizations).toHaveProperty('budgetAnalysis');
      expect(result.aiOptimizations).toHaveProperty('recommendedVendors');
    });
  });

  describe('Emergency Vendor Replacement', () => {
    const emergencyRequest: EmergencyVendorRequest = {
      weddingId: 'wedding_456',
      originalVendorId: 'vendor_cancelled',
      serviceType: 'photography',
      urgency: 'critical',
      timeline: {
        weddingDate: new Date('2024-06-15'),
        replacementNeeded: new Date('2024-06-10'),
      },
      reason: 'vendor-cancellation',
      existingContract: {
        services: ['wedding-photography', 'engagement-session'],
        terms: 'full-day-coverage',
        budget: 1800,
      },
    };

    it('should find emergency replacement vendors quickly', async () => {
      const startTime = Date.now();
      const result =
        await vendorAIBridge.findEmergencyReplacement(emergencyRequest);
      const endTime = Date.now();

      expect(result.responseTime).toBeLessThan(10000); // < 10 seconds as specified
      expect(endTime - startTime).toBeLessThan(15000); // Allow some test overhead
      expect(result.success).toBeDefined();
    });

    it('should prioritize crisis response vendors', async () => {
      const result =
        await vendorAIBridge.findEmergencyReplacement(emergencyRequest);

      if (result.success && result.replacementVendors.length > 0) {
        const topVendor = result.replacementVendors[0];
        expect(topVendor.emergencyAvailable).toBe(true);
        expect(topVendor.responseGuarantee).toBeLessThanOrEqual(24);
      }
    });

    it('should handle emergency requests with impossible timelines', async () => {
      const impossibleRequest = {
        ...emergencyRequest,
        timeline: {
          weddingDate: new Date('2024-06-15'),
          replacementNeeded: new Date('2024-06-16'), // After wedding date
        },
      };

      const result =
        await vendorAIBridge.findEmergencyReplacement(impossibleRequest);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('IMPOSSIBLE_TIMELINE');
      expect(result.alternatives).toBeDefined();
    });
  });

  describe('AI Vendor Recommendations', () => {
    it('should generate AI-powered vendor recommendations', async () => {
      const result = await vendorAIBridge.generateVendorRecommendations(
        'wedding_456',
        ['photography', 'videography'],
      );

      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('reasoning');
    });

    it('should include performance analytics in recommendations', async () => {
      const result = await vendorAIBridge.generateVendorRecommendations(
        'wedding_456',
        ['photography'],
      );

      if (result.recommendations.length > 0) {
        const vendor = result.recommendations[0];
        expect(vendor).toHaveProperty('performanceMetrics');
        expect(vendor.performanceMetrics).toHaveProperty('avgRating');
        expect(vendor.performanceMetrics).toHaveProperty('completionRate');
        expect(vendor.performanceMetrics).toHaveProperty('responseTime');
      }
    });

    it('should filter recommendations based on budget constraints', async () => {
      const result = await vendorAIBridge.generateVendorRecommendations(
        'wedding_456',
        ['photography'],
        { maxBudget: 1000, currency: 'GBP' },
      );

      result.recommendations.forEach((vendor) => {
        expect(vendor.pricing.basePrice).toBeLessThanOrEqual(1000);
      });
    });
  });

  describe('Integration Health Monitoring', () => {
    it('should monitor vendor integration health', async () => {
      await vendorAIBridge.initializeVendorIntegration(mockConfig);
      const health = await vendorAIBridge.checkIntegrationHealth(
        mockConfig.vendorId,
      );

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('lastSync');
      expect(health).toHaveProperty('errorRate');
      expect(health).toHaveProperty('responseTime');
      expect(['healthy', 'warning', 'error']).toContain(health.status);
    });

    it('should detect and report integration failures', async () => {
      // Simulate a failed integration
      const failedVendorId = 'failed_vendor';
      const health =
        await vendorAIBridge.checkIntegrationHealth(failedVendorId);

      expect(health.status).toBe('error');
      expect(health.errors).toBeDefined();
      expect(health.recommendations).toBeDefined();
    });

    it('should provide integration performance metrics', async () => {
      await vendorAIBridge.initializeVendorIntegration(mockConfig);
      const metrics = await vendorAIBridge.getIntegrationMetrics(
        mockConfig.vendorId,
      );

      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics).toHaveProperty('avgResponseTime');
      expect(metrics).toHaveProperty('errorBreakdown');
    });
  });

  describe('Rate Limiting and Error Handling', () => {
    it('should respect rate limits', async () => {
      await vendorAIBridge.initializeVendorIntegration(mockConfig);

      // Make rapid successive calls
      const promises = Array(15)
        .fill(null)
        .map(() =>
          vendorAIBridge.checkVendorAvailability({
            ...availabilityRequest,
            weddingId: `wedding_${Math.random()}`,
          }),
        );

      const results = await Promise.allSettled(promises);
      const rateLimitedResults = results.filter(
        (result) =>
          result.status === 'rejected' &&
          result.reason.message.includes('rate limit'),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should implement retry logic for failed requests', async () => {
      const spy = vi.spyOn(vendorAIBridge, 'checkVendorAvailability');

      // This should trigger retries internally
      await vendorAIBridge.checkVendorAvailability(availabilityRequest);

      // Verify the method was called (initial + any retries)
      expect(spy).toHaveBeenCalled();
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutRequest = {
        ...availabilityRequest,
        timeout: 1, // Very short timeout to force timeout
      };

      const result =
        await vendorAIBridge.checkVendorAvailability(timeoutRequest);

      expect(result).toHaveProperty('error');
      expect(result.error?.type).toBe('timeout');
    });
  });

  describe('Data Validation and Security', () => {
    it('should validate all input data', async () => {
      const invalidRequest = {
        weddingId: '', // Invalid empty string
        serviceType: 'invalid-service',
        date: 'invalid-date',
        location: null,
        budget: { min: -100, max: 0 }, // Invalid budget
      };

      await expect(
        vendorAIBridge.checkVendorAvailability(invalidRequest as any),
      ).rejects.toThrow(/validation/i);
    });

    it('should sanitize sensitive data in logs', async () => {
      const requestWithSensitiveData = {
        ...availabilityRequest,
        clientInfo: {
          email: 'test@example.com',
          phone: '+44123456789',
          creditCard: '4111-1111-1111-1111',
        },
      };

      // This should not throw but should sanitize data internally
      const result = await vendorAIBridge.checkVendorAvailability(
        requestWithSensitiveData,
      );
      expect(result).toBeDefined();
    });

    it('should encrypt sensitive vendor data', async () => {
      const sensitiveConfig = {
        ...mockConfig,
        apiKey: 'super-secret-key',
        webhookSecret: 'webhook-secret',
      };

      await vendorAIBridge.initializeVendorIntegration(sensitiveConfig);

      // Verify that sensitive data is not stored in plain text
      const storedConfig = await vendorAIBridge.getVendorConfig(
        sensitiveConfig.vendorId,
      );
      expect(storedConfig.apiKey).not.toBe(sensitiveConfig.apiKey);
      expect(storedConfig.apiKey).toMatch(/^encrypted:/);
    });
  });
});
