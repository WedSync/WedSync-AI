import { FAQScrapingOrchestrator } from '@/lib/integrations/faq-scraping-orchestrator';
import {
  FAQExtractionRequest,
  OrchestrationResult,
  ScrapingProvider,
} from '@/types/faq-integration';

// Mock dependencies
const mockScrapingProvider: ScrapingProvider = {
  id: 'test-provider',
  name: 'Test Provider',
  isHealthy: jest.fn().mockResolvedValue(true),
  extractFAQs: jest.fn().mockResolvedValue({
    faqs: [
      {
        id: 'faq-1',
        question: 'What is your cancellation policy?',
        answer: 'We require 30 days notice for cancellation.',
        sourceUrl: 'https://example.com/faq',
        confidence: 0.95,
        metadata: { section: 'policies' },
      },
    ],
    metadata: { processingTime: 1500 },
  }),
  getHealthStatus: jest
    .fn()
    .mockResolvedValue({ status: 'healthy', responseTime: 100 }),
};

describe('FAQScrapingOrchestrator', () => {
  let orchestrator: FAQScrapingOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new FAQScrapingOrchestrator();

    // Add test provider
    orchestrator['scrapingProviders'].set(
      'test-provider',
      mockScrapingProvider,
    );
  });

  afterEach(() => {
    orchestrator.destroy();
  });

  describe('orchestrateExtraction', () => {
    const validRequest: FAQExtractionRequest = {
      organizationId: '123e4567-e89b-12d3-a456-426614174000',
      sources: [
        {
          url: 'https://example.com/faq',
          type: 'webpage',
          priority: 1,
        },
      ],
      extractionConfig: {
        maxFAQs: 100,
        minConfidence: 0.7,
        categories: ['general', 'pricing', 'policies'],
        timeout: 30000,
      },
      weddingContext: {
        vendorType: 'photographer',
        specializations: ['wedding', 'portrait'],
        primaryRegions: ['UK'],
      },
    };

    it('should successfully orchestrate FAQ extraction with healthy providers', async () => {
      const result = await orchestrator.orchestrateExtraction(validRequest);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe('processing');
      expect(result.initialResults).toBeDefined();
      expect(result.initialResults!.totalFAQs).toBeGreaterThan(0);
      expect(mockScrapingProvider.extractFAQs).toHaveBeenCalledWith(
        validRequest.sources[0],
        expect.any(Object),
      );
    });

    it('should handle provider failures with fallback strategy', async () => {
      // Mock primary provider failure
      const failingProvider = {
        ...mockScrapingProvider,
        id: 'failing-provider',
        extractFAQs: jest.fn().mockRejectedValue(new Error('Provider failed')),
      };

      orchestrator['scrapingProviders'].set(
        'failing-provider',
        failingProvider,
      );

      const result = await orchestrator.orchestrateExtraction(validRequest);

      expect(result.success).toBe(true);
      expect(result.fallbacksUsed).toBeGreaterThan(0);
      expect(mockScrapingProvider.extractFAQs).toHaveBeenCalled(); // Fallback was used
    });

    it('should validate extraction request before processing', async () => {
      const invalidRequest = {
        ...validRequest,
        organizationId: 'invalid-uuid',
      };

      await expect(
        orchestrator.orchestrateExtraction(invalidRequest),
      ).rejects.toThrow('Invalid organization ID format');
    });

    it('should respect rate limits', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => orchestrator.orchestrateExtraction(validRequest));

      const results = await Promise.allSettled(promises);
      const rateLimitedResults = results.filter(
        (r) =>
          r.status === 'rejected' &&
          (r.reason as Error).message.includes('rate limit'),
      );

      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    it('should handle circuit breaker activation', async () => {
      // Simulate multiple failures to trigger circuit breaker
      mockScrapingProvider.extractFAQs = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      for (let i = 0; i < 6; i++) {
        try {
          await orchestrator.orchestrateExtraction(validRequest);
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should now be open
      const result = await orchestrator.orchestrateExtraction(validRequest);
      expect(result.success).toBe(false);
      expect(result.error).toContain('circuit breaker');
    });

    it('should merge results from multiple providers correctly', async () => {
      const secondProvider: ScrapingProvider = {
        ...mockScrapingProvider,
        id: 'second-provider',
        extractFAQs: jest.fn().mockResolvedValue({
          faqs: [
            {
              id: 'faq-2',
              question: 'What is your pricing structure?',
              answer: 'Our packages start from £500.',
              sourceUrl: 'https://example.com/pricing',
              confidence: 0.9,
              metadata: { section: 'pricing' },
            },
          ],
          metadata: { processingTime: 1200 },
        }),
      };

      orchestrator['scrapingProviders'].set('second-provider', secondProvider);

      const result = await orchestrator.orchestrateExtraction(validRequest);

      expect(result.success).toBe(true);
      expect(result.initialResults!.totalFAQs).toBe(2);
      expect(result.initialResults!.sources.length).toBe(2);
      expect(mockScrapingProvider.extractFAQs).toHaveBeenCalled();
      expect(secondProvider.extractFAQs).toHaveBeenCalled();
    });

    it('should track performance metrics correctly', async () => {
      const result = await orchestrator.orchestrateExtraction(validRequest);

      expect(result.metrics).toBeDefined();
      expect(result.metrics!.totalProcessingTime).toBeGreaterThan(0);
      expect(result.metrics!.providersUsed.length).toBeGreaterThan(0);
      expect(result.metrics!.averageConfidence).toBeGreaterThan(0);
    });
  });

  describe('provider health management', () => {
    it('should check provider health before orchestration', async () => {
      const request: FAQExtractionRequest = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        sources: [{ url: 'https://example.com', type: 'webpage', priority: 1 }],
        extractionConfig: { maxFAQs: 50, minConfidence: 0.7, timeout: 10000 },
        weddingContext: {
          vendorType: 'photographer',
          specializations: [],
          primaryRegions: [],
        },
      };

      await orchestrator.orchestrateExtraction(request);

      expect(mockScrapingProvider.isHealthy).toHaveBeenCalled();
    });

    it('should exclude unhealthy providers from orchestration', async () => {
      mockScrapingProvider.isHealthy = jest.fn().mockResolvedValue(false);

      const request: FAQExtractionRequest = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        sources: [{ url: 'https://example.com', type: 'webpage', priority: 1 }],
        extractionConfig: { maxFAQs: 50, minConfidence: 0.7, timeout: 10000 },
        weddingContext: {
          vendorType: 'photographer',
          specializations: [],
          primaryRegions: [],
        },
      };

      const result = await orchestrator.orchestrateExtraction(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No healthy providers available');
      expect(mockScrapingProvider.extractFAQs).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors gracefully', async () => {
      mockScrapingProvider.extractFAQs = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 35000)),
        );

      const request: FAQExtractionRequest = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        sources: [{ url: 'https://example.com', type: 'webpage', priority: 1 }],
        extractionConfig: { maxFAQs: 50, minConfidence: 0.7, timeout: 5000 },
        weddingContext: {
          vendorType: 'photographer',
          specializations: [],
          primaryRegions: [],
        },
      };

      const result = await orchestrator.orchestrateExtraction(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should aggregate errors from multiple provider failures', async () => {
      const failingProvider1 = {
        ...mockScrapingProvider,
        id: 'failing-1',
        extractFAQs: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const failingProvider2 = {
        ...mockScrapingProvider,
        id: 'failing-2',
        extractFAQs: jest.fn().mockRejectedValue(new Error('API error')),
      };

      orchestrator['scrapingProviders'].clear();
      orchestrator['scrapingProviders'].set('failing-1', failingProvider1);
      orchestrator['scrapingProviders'].set('failing-2', failingProvider2);

      const request: FAQExtractionRequest = {
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        sources: [{ url: 'https://example.com', type: 'webpage', priority: 1 }],
        extractionConfig: { maxFAQs: 50, minConfidence: 0.7, timeout: 10000 },
        weddingContext: {
          vendorType: 'photographer',
          specializations: [],
          primaryRegions: [],
        },
      };

      const result = await orchestrator.orchestrateExtraction(request);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(2);
      expect(
        result.errors!.some((e) => e.error.includes('Network error')),
      ).toBe(true);
      expect(result.errors!.some((e) => e.error.includes('API error'))).toBe(
        true,
      );
    });
  });
});
