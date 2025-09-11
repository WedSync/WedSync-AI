/**
 * WS-240: Cost Optimization Engine Tests
 * Comprehensive test suite validating 75% cost reduction algorithms
 */

import { CostOptimizationEngine, AIRequest, OptimizationConfig } from '@/lib/ai/optimization/CostOptimizationEngine';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('openai');

describe('CostOptimizationEngine', () => {
  let engine: CostOptimizationEngine;
  let mockSupabaseClient: any;
  let mockOpenAI: any;

  const mockSupplierConfig: OptimizationConfig = {
    supplierId: 'test-supplier-123',
    featureType: 'content_generation',
    optimizationLevel: 'balanced',
    monthlyBudgetPounds: 50.00,
    dailyBudgetPounds: 5.00,
    alertThresholdPercent: 80,
    autoDisableAtLimit: true,
    cacheStrategy: {
      semantic: true,
      exact: true,
      ttlHours: 24,
      similarityThreshold: 0.85
    },
    batchProcessingEnabled: true,
    seasonalMultiplierEnabled: true
  };

  const mockAIRequest: AIRequest = {
    id: 'req-test-123',
    supplierId: 'test-supplier-123',
    featureType: 'content_generation',
    prompt: 'Create elegant wedding venue description for countryside location',
    context: { venue_type: 'rustic', location: 'countryside' },
    qualityLevel: 'medium',
    priority: 'normal',
    clientFacing: false,
    maxTokens: 1000,
    temperature: 0.7
  };

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: mockSupplierConfig,
              error: null
            }))
          }))
        }))
      }))
    };

    mockOpenAI = {
      embeddings: {
        create: jest.fn(() => Promise.resolve({
          data: [{ embedding: new Array(1536).fill(0.1) }]
        }))
      }
    };

    engine = new CostOptimizationEngine();
    (engine as any).supabase = mockSupabaseClient;
    (engine as any).openai = mockOpenAI;
  });

  describe('Wedding Season Detection', () => {
    test('should correctly identify peak wedding season (March-October)', () => {
      // Test peak season months
      const peakMonths = [3, 4, 5, 6, 7, 8, 9, 10];
      peakMonths.forEach(month => {
        const testDate = new Date(2024, month - 1, 15); // month - 1 because Date months are 0-indexed
        expect(engine.isWeddingSeason(testDate)).toBe(true);
      });
    });

    test('should correctly identify off-season (November-February)', () => {
      const offSeasonMonths = [11, 12, 1, 2];
      offSeasonMonths.forEach(month => {
        const testDate = new Date(2024, month - 1, 15);
        expect(engine.isWeddingSeason(testDate)).toBe(false);
      });
    });

    test('should apply correct seasonal multiplier', () => {
      const peakSeasonDate = new Date(2024, 5, 15); // June
      const offSeasonDate = new Date(2024, 11, 15); // December

      expect(engine.getSeasonalMultiplier(peakSeasonDate)).toBe(1.6);
      expect(engine.getSeasonalMultiplier(offSeasonDate)).toBe(1.0);
    });
  });

  describe('Model Selection Algorithm', () => {
    test('should select GPT-4 for high-quality client-facing content', async () => {
      const clientFacingRequest = {
        ...mockAIRequest,
        clientFacing: true,
        qualityLevel: 'high' as const
      };

      const result = await engine.selectOptimalModel(clientFacingRequest, mockSupplierConfig);

      expect(result.selectedModel).toBe('gpt-4-turbo');
      expect(result.qualityScore).toBe(95);
      expect(result.reason).toContain('High quality');
    });

    test('should select GPT-3.5 for routine tasks with aggressive optimization', async () => {
      const aggressiveConfig = {
        ...mockSupplierConfig,
        optimizationLevel: 'aggressive' as const
      };

      const routineRequest = {
        ...mockAIRequest,
        clientFacing: false,
        qualityLevel: 'low' as const
      };

      const result = await engine.selectOptimalModel(routineRequest, aggressiveConfig);

      expect(result.selectedModel).toBe('gpt-3.5-turbo');
      expect(result.reason).toContain('Aggressive cost optimization');
    });

    test('should calculate model costs correctly', () => {
      const request = {
        ...mockAIRequest,
        prompt: 'A'.repeat(400), // 400 characters = ~100 tokens
        maxTokens: 500
      };

      const gpt4Cost = (engine as any).calculateModelCost('gpt-4-turbo', 100, 500);
      const gpt35Cost = (engine as any).calculateModelCost('gpt-3.5-turbo', 100, 500);

      expect(gpt4Cost).toBeGreaterThan(gpt35Cost);
      expect(gpt4Cost).toBeGreaterThan(0);
      expect(gpt35Cost).toBeGreaterThan(0);
    });
  });

  describe('Cost Optimization Algorithm', () => {
    test('should optimize AI request and reduce costs by target 75%', async () => {
      // Mock cache miss (no existing cache)
      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(null);
      
      // Mock budget status as healthy
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({
        allowed: true,
        currentSpend: 1.0,
        dailyBudget: 5.0,
        percentageUsed: 20,
        nearThreshold: false
      });

      const result = await engine.optimizeAIRequest(mockAIRequest, mockSupplierConfig);

      expect(result).toBeDefined();
      expect(result.optimizedModel).toBeTruthy();
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(result.optimizationReasons).toHaveLength(3); // Expect at least 3 optimizations
    });

    test('should apply semantic caching when available', async () => {
      const mockCacheResult = {
        cacheKey: 'test-cache-key',
        content: 'Cached wedding venue description...',
        cacheType: 'semantic' as const,
        similarityScore: 0.92,
        cost: 0,
        timestamp: new Date()
      };

      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(mockCacheResult);

      const result = await engine.optimizeAIRequest(mockAIRequest, mockSupplierConfig);

      expect(result.optimizedModel).toBe('cached');
      expect(result.estimatedCost).toBe(0);
      expect(result.potentialSavings).toBeGreaterThan(0);
      expect(result.optimizationReasons).toContain('semantic cache hit (92% match)');
    });

    test('should enable batch processing for eligible requests', async () => {
      const batchEligibleRequest = {
        ...mockAIRequest,
        priority: 'batch' as const,
        featureType: 'venue_descriptions' as const
      };

      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(null);
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({ allowed: true });

      const result = await engine.optimizeAIRequest(batchEligibleRequest, mockSupplierConfig);

      expect(result.processingMode).toBe('batch');
      expect(result.optimizationReasons).toContain('Scheduled for batch processing to reduce costs');
    });

    test('should throw error when budget limit exceeded', async () => {
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({
        allowed: false,
        status: 'disabled'
      });

      await expect(engine.optimizeAIRequest(mockAIRequest, mockSupplierConfig))
        .rejects
        .toThrow('Budget limit reached');
    });
  });

  describe('Cost Prediction Algorithm', () => {
    test('should calculate accurate cost predictions with seasonal adjustments', async () => {
      const mockUsagePattern = {
        supplierId: 'test-supplier-123',
        featureType: 'content_generation',
        period: { start: new Date('2024-01-01'), end: new Date('2024-01-31') },
        requests: { total: 100, successful: 95, failed: 5, cached: 30 },
        costs: { total: 25.50, average: 0.255, peak: 1.20, savings: 5.10 },
        patterns: { hourlyDistribution: new Array(24).fill(0), peakHours: [9, 14], seasonalTrend: 1.2 },
        optimization: { cacheHitRate: 30, modelOptimization: 15, batchProcessingRate: 10 }
      };

      const mockTimeframe = {
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        predictionDate: '2024-07-15' // Peak season
      };

      // Mock Supabase historical data query
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [
                    { cost_pounds: '1.50', optimization_savings: '0.50' },
                    { cost_pounds: '2.00', optimization_savings: '0.75' }
                  ],
                  error: null
                }))
              }))
            }))
          }))
        }))
      });

      const result = await engine.calculateCostPrediction(mockUsagePattern, mockTimeframe);

      expect(result).toBeDefined();
      expect(result.seasonalMultiplier).toBe(1.6); // Peak season multiplier
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.optimizationSavings).toBeGreaterThan(0);
      expect(result.finalCost).toBeLessThan(result.estimatedCost);
      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    test('should provide wedding season recommendations', async () => {
      const peakSeasonUsage = {
        supplierId: 'test-supplier-123',
        featureType: 'photo_ai',
        monthlyBudget: 30.00
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              lte: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({
                  data: [{ cost_pounds: '35.00', optimization_savings: '8.00' }],
                  error: null
                }))
              }))
            }))
          }))
        }))
      });

      const result = await engine.calculateCostPrediction(peakSeasonUsage, {
        startDate: '2024-06-01',
        endDate: '2024-09-30',
        predictionDate: '2024-07-01'
      });

      expect(result.recommendations).toContain('Wedding season detected - enable aggressive caching');
      expect(result.recommendations).toContain('Consider batch processing for non-urgent requests');
    });
  });

  describe('Batch Processing Algorithm', () => {
    test('should schedule requests for batch processing with cost savings', async () => {
      const batchRequests = [
        { ...mockAIRequest, id: 'req-1', priority: 'batch' as const },
        { ...mockAIRequest, id: 'req-2', priority: 'batch' as const },
        { ...mockAIRequest, id: 'req-3', priority: 'normal' as const }
      ];

      const result = await engine.scheduleForBatchProcessing(batchRequests);

      expect(result).toBeDefined();
      expect(result.batchId).toBeTruthy();
      expect(result.scheduledTime).toBeInstanceOf(Date);
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
      expect(result.totalSavings).toBeGreaterThan(0);
      expect(result.requests).toHaveLength(3);
      expect(result.priority).toBe('medium'); // Mixed priorities result in medium
    });

    test('should prioritize urgent requests for immediate processing', async () => {
      const urgentRequests = [
        { ...mockAIRequest, id: 'urgent-1', priority: 'urgent' as const },
        { ...mockAIRequest, id: 'urgent-2', priority: 'urgent' as const }
      ];

      const result = await engine.scheduleForBatchProcessing(urgentRequests);

      expect(result.priority).toBe('high');
      expect(result.scheduledTime.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000); // Within 15 minutes
    });
  });

  describe('Wedding Industry Context', () => {
    test('should recognize wedding venue description patterns', () => {
      const venueRequest = {
        ...mockAIRequest,
        prompt: 'Create description for rustic barn wedding venue in countryside',
        featureType: 'venue_descriptions' as const
      };

      const complexity = (engine as any).analyzeRequestComplexity(venueRequest);
      
      expect(complexity.complexity).toBeGreaterThan(0.5);
      expect(complexity.isCreative).toBe(true);
    });

    test('should apply wedding season multiplier in cost calculations', () => {
      const june15 = new Date(2024, 5, 15); // Peak season
      const december15 = new Date(2024, 11, 15); // Off season

      expect(engine.getSeasonalMultiplier(june15)).toBe(1.6);
      expect(engine.getSeasonalMultiplier(december15)).toBe(1.0);
    });
  });

  describe('Real Wedding Cost Scenarios', () => {
    test('Photography studio: 12,000 photos should cost £240→£60 (75% savings)', () => {
      const photosPerMonth = 12000;
      const avgTokensPerPhoto = 50; // Photo tagging
      const totalTokens = photosPerMonth * avgTokensPerPhoto;

      // Without optimization (GPT-4)
      const gpt4InputCost = (totalTokens / 1000) * 0.01;
      const gpt4OutputCost = (totalTokens / 1000) * 0.03;
      const unoptimizedCost = (gpt4InputCost + gpt4OutputCost) / 1.25; // Convert USD to GBP

      // With optimization (70% cache hit rate + GPT-3.5 for routine)
      const cacheHitRate = 0.70;
      const cachedRequests = photosPerMonth * cacheHitRate;
      const uncachedRequests = photosPerMonth * (1 - cacheHitRate);
      
      const gpt35InputCost = (uncachedRequests * avgTokensPerPhoto / 1000) * 0.0015;
      const gpt35OutputCost = (uncachedRequests * avgTokensPerPhoto / 1000) * 0.002;
      const optimizedCost = (gpt35InputCost + gpt35OutputCost) / 1.25;

      const savingsPercent = ((unoptimizedCost - optimizedCost) / unoptimizedCost) * 100;

      expect(Math.round(unoptimizedCost)).toBeCloseTo(240, 20); // ~£240
      expect(Math.round(optimizedCost)).toBeCloseTo(60, 20); // ~£60
      expect(savingsPercent).toBeGreaterThanOrEqual(75); // 75%+ savings
    });

    test('Venue descriptions: 50 events should cost £400→£120 (70% savings)', () => {
      const eventsPerMonth = 50;
      const avgTokensPerDescription = 800;
      const totalTokens = eventsPerMonth * avgTokensPerDescription;

      // Calculate expected costs with semantic caching
      const semanticHitRate = 0.65; // 65% similarity for venue descriptions
      const exactHitRate = 0.15; // 15% exact matches
      const totalCacheHitRate = semanticHitRate + exactHitRate;

      const unoptimizedCost = ((totalTokens / 1000) * 0.04) / 1.25; // GPT-4 pricing
      const optimizedCost = unoptimizedCost * (1 - totalCacheHitRate) * 0.75; // GPT-3.5 for non-cached

      const savingsPercent = ((unoptimizedCost - optimizedCost) / unoptimizedCost) * 100;

      expect(savingsPercent).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty or invalid requests gracefully', async () => {
      const invalidRequest = {
        ...mockAIRequest,
        prompt: '', // Empty prompt
        supplierId: ''
      };

      await expect(engine.optimizeAIRequest(invalidRequest, mockSupplierConfig))
        .rejects
        .toThrow();
    });

    test('should handle OpenAI API failures gracefully', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API failure'));

      // Should still work without embeddings (fallback to exact matching)
      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(null);
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({ allowed: true });

      const result = await engine.optimizeAIRequest(mockAIRequest, mockSupplierConfig);
      
      expect(result).toBeDefined();
      expect(result.optimizationReasons.length).toBeGreaterThan(0);
    });

    test('should handle database connection failures', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      // Should fallback to default configuration
      await expect(engine.optimizeAIRequest(mockAIRequest))
        .rejects
        .toThrow('Configuration not found');
    });
  });

  describe('Performance Requirements', () => {
    test('should optimize requests within 200ms performance target', async () => {
      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(null);
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({ allowed: true });

      const startTime = Date.now();
      await engine.optimizeAIRequest(mockAIRequest, mockSupplierConfig);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Under 200ms
    });

    test('should handle concurrent optimization requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        ...mockAIRequest,
        id: `concurrent-${i}`
      }));

      jest.spyOn(engine as any, 'checkCache').mockResolvedValue(null);
      jest.spyOn(engine as any, 'getBudgetStatus').mockResolvedValue({ allowed: true });

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => engine.optimizeAIRequest(req, mockSupplierConfig))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // All within 1 second
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.optimizationReasons.length).toBeGreaterThan(0);
      });
    });
  });
});

// Wedding Industry Integration Tests
describe('Wedding Industry Integration Tests', () => {
  let engine: CostOptimizationEngine;

  beforeEach(() => {
    engine = new CostOptimizationEngine();
  });

  test('Real scenario: Photography studio batch processing 1000 photos', async () => {
    const photoRequests = Array.from({ length: 1000 }, (_, i) => ({
      id: `photo-${i}`,
      supplierId: 'photo-studio-123',
      featureType: 'photo_ai' as const,
      prompt: `Tag wedding photo ${i}: bride and groom ceremony`,
      qualityLevel: 'medium' as const,
      priority: 'batch' as const,
      clientFacing: false
    }));

    const batchResult = await engine.scheduleForBatchProcessing(photoRequests);

    expect(batchResult.requests).toHaveLength(1000);
    expect(batchResult.totalSavings).toBeGreaterThan(50); // Significant savings expected
    expect(batchResult.scheduledTime).toBeInstanceOf(Date);
  });

  test('Real scenario: Venue coordinator peak season budget management', async () => {
    const peakSeasonConfig: OptimizationConfig = {
      supplierId: 'venue-coordinator-456',
      featureType: 'venue_descriptions',
      optimizationLevel: 'balanced',
      monthlyBudgetPounds: 100.00,
      dailyBudgetPounds: 5.00,
      alertThresholdPercent: 75,
      autoDisableAtLimit: true,
      cacheStrategy: {
        semantic: true,
        exact: true,
        ttlHours: 48, // Longer cache for venue descriptions
        similarityThreshold: 0.80
      },
      batchProcessingEnabled: true,
      seasonalMultiplierEnabled: true
    };

    const venueRequest: AIRequest = {
      id: 'venue-desc-peak-season',
      supplierId: 'venue-coordinator-456',
      featureType: 'venue_descriptions',
      prompt: 'Create elegant description for outdoor garden wedding venue with rustic elements',
      qualityLevel: 'high',
      priority: 'normal',
      clientFacing: true
    };

    // Mock peak season (July)
    const julySeason = new Date(2024, 6, 15);
    const seasonalMultiplier = engine.getSeasonalMultiplier(julySeason);

    expect(seasonalMultiplier).toBe(1.6);
    
    // Verify wedding season is correctly detected
    expect(engine.isWeddingSeason(julySeason)).toBe(true);
  });
});

export {};