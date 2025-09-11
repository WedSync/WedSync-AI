import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExternalAIServices } from '@/lib/integrations/ai/external-ai-services';
import type {
  AIServiceConfig,
  ContentGenerationRequest,
  ImageAnalysisRequest,
  RecommendationEngineRequest,
  AIServiceUsageMetrics,
} from '@/lib/integrations/ai/types';

// Mock AI Service APIs
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(() => ({
          choices: [{ message: { content: 'Generated content from OpenAI' } }],
          usage: { total_tokens: 150 },
        })),
      },
    },
    images: {
      analyze: vi.fn(() => ({
        data: [
          {
            description: 'A beautiful wedding venue',
            objects: ['bride', 'groom', 'flowers'],
            sentiment: 'positive',
          },
        ],
      })),
    },
  })),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(() => ({
        content: [{ text: 'Generated content from Claude' }],
        usage: { input_tokens: 100, output_tokens: 200 },
      })),
    },
  })),
}));

vi.mock('@google-ai/generativelanguage', () => ({
  GenerativeServiceClient: vi.fn(() => ({
    generateText: vi.fn(() => ({
      candidates: [{ output: 'Generated content from Google' }],
    })),
  })),
}));

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

describe('ExternalAIServices', () => {
  let aiServices: ExternalAIServices;
  const mockConfig: AIServiceConfig = {
    organizationId: 'org_123',
    services: {
      openai: {
        enabled: true,
        apiKey: 'openai_key_123',
        model: 'gpt-4',
        maxTokens: 2000,
        temperature: 0.7,
      },
      anthropic: {
        enabled: true,
        apiKey: 'anthropic_key_123',
        model: 'claude-3-sonnet',
        maxTokens: 4000,
        temperature: 0.5,
      },
      google: {
        enabled: true,
        apiKey: 'google_key_123',
        model: 'gemini-pro',
        maxTokens: 8000,
        temperature: 0.6,
      },
      azure: {
        enabled: false,
        apiKey: 'azure_key_123',
        endpoint: 'https://wedding-ai.openai.azure.com',
        deployment: 'wedding-gpt-4',
      },
    },
    costLimits: {
      monthly: 1000,
      daily: 50,
      perRequest: 5,
    },
    fallbackStrategy: {
      enabled: true,
      order: ['openai', 'anthropic', 'google'],
      retryAttempts: 3,
    },
    monitoring: {
      trackUsage: true,
      alertThresholds: {
        costWarning: 800,
        costCritical: 950,
        errorRate: 0.1,
      },
    },
  };

  beforeEach(() => {
    aiServices = new ExternalAIServices();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AI Service Configuration', () => {
    it('should configure AI services successfully', async () => {
      const result = await aiServices.configureAIServices(mockConfig);

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(mockConfig.organizationId);
      expect(result.enabledServices).toContain('openai');
      expect(result.enabledServices).toContain('anthropic');
      expect(result.enabledServices).toContain('google');
      expect(result.enabledServices).not.toContain('azure');
    });

    it('should validate API credentials', async () => {
      const invalidConfig = {
        ...mockConfig,
        services: {
          ...mockConfig.services,
          openai: { ...mockConfig.services.openai, apiKey: '' },
        },
      };

      await expect(
        aiServices.configureAIServices(invalidConfig),
      ).rejects.toThrow('Invalid OpenAI API key');
    });

    it('should test service connectivity during configuration', async () => {
      const result = await aiServices.configureAIServices(mockConfig);

      expect(result.connectivityTests).toBeDefined();
      expect(result.connectivityTests.openai.status).toBe('connected');
      expect(result.connectivityTests.anthropic.status).toBe('connected');
      expect(result.connectivityTests.google.status).toBe('connected');
    });
  });

  describe('Content Generation System', () => {
    const contentRequest: ContentGenerationRequest = {
      type: 'wedding-description',
      context: {
        weddingId: 'wedding_456',
        venue: 'Elegant Manor House',
        date: new Date('2024-06-15'),
        style: 'classic-elegant',
        guestCount: 120,
        coupleNames: 'Sarah & Michael',
        specialRequests: ['outdoor-ceremony', 'vintage-theme'],
      },
      requirements: {
        tone: 'romantic',
        length: 'medium',
        language: 'en-GB',
        includeSEO: true,
        targetAudience: 'wedding-guests',
      },
      preferences: {
        preferredService: 'openai',
        creativity: 0.8,
        formality: 0.6,
      },
    };

    it('should generate wedding content using AI', async () => {
      await aiServices.configureAIServices(mockConfig);

      const result = await aiServices.generateContent(contentRequest);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(100);
      expect(result.serviceUsed).toBe('openai');
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should personalize content based on couple information', async () => {
      const result = await aiServices.generateContent(contentRequest);

      expect(result.content).toContain('Sarah');
      expect(result.content).toContain('Michael');
      expect(result.content).toContain('Elegant Manor House');
      expect(result.personalizationScore).toBeGreaterThan(0.7);
    });

    it('should respect tone and style requirements', async () => {
      const result = await aiServices.generateContent(contentRequest);

      expect(result.toneAnalysis).toBeDefined();
      expect(result.toneAnalysis.detectedTone).toBe('romantic');
      expect(result.styleCompliance).toBeGreaterThan(0.8);
      expect(result.qualityScore).toBeGreaterThan(0.7);
    });

    it('should generate SEO-optimized content when requested', async () => {
      const seoRequest = {
        ...contentRequest,
        requirements: { ...contentRequest.requirements, includeSEO: true },
      };

      const result = await aiServices.generateContent(seoRequest);

      expect(result.seoOptimization).toBeDefined();
      expect(result.seoOptimization.keywords).toBeInstanceOf(Array);
      expect(result.seoOptimization.metaDescription).toBeDefined();
      expect(result.seoOptimization.readabilityScore).toBeGreaterThan(60);
    });

    it('should support multiple content types', async () => {
      const contentTypes = [
        'wedding-description',
        'vendor-bio',
        'service-listing',
        'email-template',
      ];

      for (const type of contentTypes) {
        const request = { ...contentRequest, type: type as any };
        const result = await aiServices.generateContent(request);

        expect(result.success).toBe(true);
        expect(result.contentType).toBe(type);
      }
    });
  });

  describe('Image Analysis and Processing', () => {
    const imageAnalysisRequest: ImageAnalysisRequest = {
      imageUrl: 'https://example.com/wedding-photo.jpg',
      analysisType: 'comprehensive',
      features: {
        objectDetection: true,
        sceneAnalysis: true,
        emotionDetection: true,
        qualityAssessment: true,
        colorAnalysis: true,
      },
      context: {
        weddingId: 'wedding_456',
        eventType: 'ceremony',
        expectedSubjects: ['bride', 'groom', 'guests'],
        venue: 'garden',
      },
      preferences: {
        confidenceThreshold: 0.8,
        maxObjects: 20,
        detailLevel: 'high',
      },
    };

    it('should analyze wedding images comprehensively', async () => {
      await aiServices.configureAIServices(mockConfig);

      const result = await aiServices.analyzeImage(imageAnalysisRequest);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.objects).toBeInstanceOf(Array);
      expect(result.analysis.scene).toBeDefined();
      expect(result.analysis.emotions).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0.8);
    });

    it('should detect wedding-specific objects and scenes', async () => {
      const result = await aiServices.analyzeImage(imageAnalysisRequest);

      expect(result.analysis.weddingElements).toBeDefined();
      expect(result.analysis.weddingElements.ceremony).toBeDefined();
      expect(result.analysis.weddingElements.participants).toBeInstanceOf(
        Array,
      );
      expect(result.analysis.venueType).toBe('garden');
    });

    it('should assess image quality for wedding use', async () => {
      const result = await aiServices.analyzeImage(imageAnalysisRequest);

      expect(result.qualityAssessment).toBeDefined();
      expect(result.qualityAssessment.overall).toBeGreaterThanOrEqual(1);
      expect(result.qualityAssessment.overall).toBeLessThanOrEqual(10);
      expect(result.qualityAssessment.factors).toHaveProperty('sharpness');
      expect(result.qualityAssessment.factors).toHaveProperty('lighting');
      expect(result.qualityAssessment.factors).toHaveProperty('composition');
    });

    it('should generate image descriptions and alt text', async () => {
      const result = await aiServices.analyzeImage(imageAnalysisRequest);

      expect(result.description).toBeDefined();
      expect(result.description.detailed).toContain('wedding');
      expect(result.description.altText).toBeDefined();
      expect(result.description.altText.length).toBeLessThan(125); // Alt text best practice
      expect(result.description.caption).toBeDefined();
    });

    it('should support batch image processing', async () => {
      const batchRequest = {
        images: [
          {
            ...imageAnalysisRequest,
            imageUrl: 'https://example.com/photo1.jpg',
          },
          {
            ...imageAnalysisRequest,
            imageUrl: 'https://example.com/photo2.jpg',
          },
          {
            ...imageAnalysisRequest,
            imageUrl: 'https://example.com/photo3.jpg',
          },
        ],
        batchSettings: {
          maxConcurrent: 5,
          preserveOrder: true,
          failFast: false,
        },
      };

      const result = await aiServices.analyzeBatchImages(batchRequest);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
    });
  });

  describe('Recommendation Engine', () => {
    const recommendationRequest: RecommendationEngineRequest = {
      userId: 'couple_456',
      context: {
        weddingDetails: {
          date: new Date('2024-06-15'),
          guestCount: 120,
          budget: 25000,
          style: 'classic-elegant',
          venue: 'manor-house',
        },
        preferences: {
          photography: 'documentary',
          catering: 'formal-dinner',
          music: 'live-band',
          flowers: 'seasonal-local',
        },
        location: {
          city: 'London',
          region: 'Greater London',
          country: 'UK',
        },
      },
      recommendationType: 'vendor-matching',
      filters: {
        serviceTypes: ['photography', 'catering', 'flowers'],
        budgetRange: { min: 1000, max: 5000 },
        availability: { date: new Date('2024-06-15') },
        rating: { min: 4.0 },
      },
      aiFeatures: {
        personalizedRanking: true,
        smartFiltering: true,
        budgetOptimization: true,
        styleMatching: true,
      },
    };

    it('should generate personalized vendor recommendations', async () => {
      await aiServices.configureAIServices(mockConfig);

      const result = await aiServices.generateRecommendations(
        recommendationRequest,
      );

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.personalizationScore).toBeGreaterThan(0.7);
      expect(result.totalRecommendations).toBeGreaterThan(0);
    });

    it('should rank recommendations by relevance', async () => {
      const result = await aiServices.generateRecommendations(
        recommendationRequest,
      );

      const scores = result.recommendations.map((r) => r.relevanceScore);
      const sortedScores = [...scores].sort((a, b) => b - a);
      expect(scores).toEqual(sortedScores); // Should be in descending order

      expect(result.recommendations[0].relevanceScore).toBeGreaterThan(0.8);
    });

    it('should provide reasoning for recommendations', async () => {
      const result = await aiServices.generateRecommendations(
        recommendationRequest,
      );

      const topRecommendation = result.recommendations[0];
      expect(topRecommendation.reasoning).toBeDefined();
      expect(topRecommendation.reasoning.factors).toBeInstanceOf(Array);
      expect(topRecommendation.reasoning.factors.length).toBeGreaterThan(0);
      expect(topRecommendation.reasoning.explanation).toBeDefined();
    });

    it('should optimize recommendations for budget constraints', async () => {
      const result = await aiServices.generateRecommendations(
        recommendationRequest,
      );

      expect(result.budgetOptimization).toBeDefined();
      expect(result.budgetOptimization.totalCost).toBeLessThanOrEqual(25000);
      expect(result.budgetOptimization.savings).toBeGreaterThanOrEqual(0);
      expect(result.budgetOptimization.alternatives).toBeDefined();
    });

    it('should support different recommendation types', async () => {
      const recommendationTypes = [
        'vendor-matching',
        'venue-suggestions',
        'package-deals',
        'timeline-optimization',
      ];

      for (const type of recommendationTypes) {
        const request = {
          ...recommendationRequest,
          recommendationType: type as any,
        };
        const result = await aiServices.generateRecommendations(request);

        expect(result.success).toBe(true);
        expect(result.recommendationType).toBe(type);
      }
    });
  });

  describe('Cost Management and Monitoring', () => {
    it('should track AI service usage and costs', async () => {
      await aiServices.configureAIServices(mockConfig);

      const usage = await aiServices.getUsageMetrics('org_123');

      expect(usage.success).toBe(true);
      expect(usage.currentMonth).toBeDefined();
      expect(usage.currentMonth.totalCost).toBeGreaterThanOrEqual(0);
      expect(usage.currentMonth.requestCount).toBeGreaterThanOrEqual(0);
      expect(usage.serviceBreakdown).toBeDefined();
    });

    it('should enforce cost limits per organization', async () => {
      // Simulate high usage
      const highCostRequest = {
        ...contentRequest,
        requirements: { ...contentRequest.requirements, length: 'very-long' },
      };

      const result = await aiServices.generateContent(highCostRequest);

      if (result.costLimitExceeded) {
        expect(result.success).toBe(false);
        expect(result.errorType).toBe('cost-limit-exceeded');
        expect(result.limitInfo).toBeDefined();
      }
    });

    it('should provide cost optimization suggestions', async () => {
      const optimization =
        await aiServices.getCostOptimizationSuggestions('org_123');

      expect(optimization.success).toBe(true);
      expect(optimization.suggestions).toBeInstanceOf(Array);
      expect(optimization.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(optimization.currentEfficiency).toBeGreaterThan(0);
    });

    it('should alert when approaching cost limits', async () => {
      const alerts = await aiServices.getCostAlerts('org_123');

      expect(alerts.success).toBe(true);
      expect(alerts.alerts).toBeInstanceOf(Array);

      if (alerts.alerts.length > 0) {
        const alert = alerts.alerts[0];
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('threshold');
        expect(alert).toHaveProperty('current');
        expect(alert).toHaveProperty('severity');
      }
    });
  });

  describe('Service Reliability and Fallback', () => {
    it('should implement fallback strategy on service failures', async () => {
      await aiServices.configureAIServices(mockConfig);

      // Simulate OpenAI failure
      const failureResult = await aiServices.handleServiceFailure(
        'openai',
        'api-timeout',
      );

      expect(failureResult.fallbackActivated).toBe(true);
      expect(failureResult.fallbackService).toBe('anthropic'); // Next in order
      expect(failureResult.retryScheduled).toBe(true);
    });

    it('should retry failed requests with exponential backoff', async () => {
      const retryResult = await aiServices.retryFailedRequest('request_123', {
        attempt: 2,
        lastError: 'rate-limit-exceeded',
        service: 'openai',
      });

      expect(retryResult.nextAttemptIn).toBeGreaterThan(2000); // Exponential backoff
      expect(retryResult.willRetry).toBe(true);
      expect(retryResult.maxAttemptsReached).toBe(false);
    });

    it('should load balance across available services', async () => {
      const loadBalanceResult = await aiServices.selectOptimalService(
        'content-generation',
        {
          currentLoads: {
            openai: 0.8,
            anthropic: 0.3,
            google: 0.6,
          },
          responseTimeHistory: {
            openai: 1500,
            anthropic: 800,
            google: 1200,
          },
        },
      );

      expect(loadBalanceResult.selectedService).toBe('anthropic'); // Lowest load & fastest
      expect(loadBalanceResult.reasoning).toBeDefined();
      expect(loadBalanceResult.confidence).toBeGreaterThan(0.5);
    });

    it('should maintain service health monitoring', async () => {
      const healthStatus = await aiServices.getServiceHealthStatus('org_123');

      expect(healthStatus.overall).toBeOneOf([
        'healthy',
        'degraded',
        'unhealthy',
      ]);
      expect(healthStatus.services).toBeDefined();
      expect(healthStatus.services.openai).toBeDefined();
      expect(healthStatus.services.anthropic).toBeDefined();
      expect(healthStatus.services.google).toBeDefined();

      const openaiHealth = healthStatus.services.openai;
      expect(openaiHealth.status).toBeOneOf([
        'healthy',
        'degraded',
        'unhealthy',
      ]);
      expect(openaiHealth.responseTime).toBeGreaterThanOrEqual(0);
      expect(openaiHealth.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should cache frequently requested content', async () => {
      const cacheableRequest = {
        ...contentRequest,
        caching: { enabled: true, duration: 3600 },
      };

      // First request
      const result1 = await aiServices.generateContent(cacheableRequest);
      expect(result1.fromCache).toBe(false);

      // Second request (should be cached)
      const result2 = await aiServices.generateContent(cacheableRequest);
      expect(result2.fromCache).toBe(true);
      expect(result2.responseTime).toBeLessThan(result1.responseTime);
    });

    it('should implement request batching for efficiency', async () => {
      const batchRequests = Array(10)
        .fill(null)
        .map((_, i) => ({
          ...contentRequest,
          context: { ...contentRequest.context, weddingId: `wedding_${i}` },
        }));

      const batchResult = await aiServices.processBatchRequests(batchRequests);

      expect(batchResult.success).toBe(true);
      expect(batchResult.processed).toBe(10);
      expect(batchResult.averageResponseTime).toBeLessThan(2000);
      expect(batchResult.totalCost).toBeLessThan(batchRequests.length * 5); // Batch discount
    });

    it('should optimize token usage for cost efficiency', async () => {
      const optimization = await aiServices.optimizeTokenUsage(contentRequest);

      expect(optimization.originalTokens).toBeGreaterThan(0);
      expect(optimization.optimizedTokens).toBeLessThanOrEqual(
        optimization.originalTokens,
      );
      expect(optimization.savings).toBeGreaterThanOrEqual(0);
      expect(optimization.qualityImpact).toBeLessThan(0.1); // Minimal quality impact
    });

    it('should provide performance metrics and insights', async () => {
      const metrics = await aiServices.getPerformanceMetrics('org_123');

      expect(metrics.success).toBe(true);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.throughput).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeLessThan(0.05); // Less than 5%
      expect(metrics.costEfficiency).toBeGreaterThan(0);
    });
  });

  describe('Content Quality and Safety', () => {
    it('should filter inappropriate content', async () => {
      const inappropriateRequest = {
        ...contentRequest,
        context: {
          ...contentRequest.context,
          specialRequests: ['inappropriate-content'],
        },
      };

      const result = await aiServices.generateContent(inappropriateRequest);

      expect(result.contentFiltered).toBe(true);
      expect(result.safetyScore).toBeGreaterThan(0.8);
      expect(result.warnings).toBeDefined();
    });

    it('should validate content accuracy for wedding industry', async () => {
      const result = await aiServices.generateContent(contentRequest);

      expect(result.accuracyValidation).toBeDefined();
      expect(result.accuracyValidation.factChecked).toBe(true);
      expect(result.accuracyValidation.industryCompliance).toBeGreaterThan(0.8);
      expect(result.accuracyValidation.terminology).toBe('correct');
    });

    it('should ensure content originality', async () => {
      const result = await aiServices.generateContent(contentRequest);

      expect(result.originalityScore).toBeGreaterThan(0.9);
      expect(result.plagiarismCheck).toBe(true);
      expect(result.uniqueness).toBeGreaterThan(0.85);
    });

    it('should provide content improvement suggestions', async () => {
      const improvements =
        await aiServices.suggestContentImprovements('content_123');

      expect(improvements.success).toBe(true);
      expect(improvements.suggestions).toBeInstanceOf(Array);
      expect(improvements.suggestions.length).toBeGreaterThan(0);

      const suggestion = improvements.suggestions[0];
      expect(suggestion).toHaveProperty('type');
      expect(suggestion).toHaveProperty('description');
      expect(suggestion).toHaveProperty('impact');
    });
  });
});
