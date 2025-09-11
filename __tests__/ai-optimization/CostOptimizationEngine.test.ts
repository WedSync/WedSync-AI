/**
 * WS-240: Cost Optimization Engine Test Suite
 * 
 * Comprehensive tests for AI cost optimization algorithms.
 * Target: >90% code coverage with focus on wedding supplier scenarios.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CostOptimizationEngine, AIRequest, OptimizationConfig } from '@/lib/ai/optimization/CostOptimizationEngine';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');
jest.mock('@/lib/cache/redis-client');

describe('CostOptimizationEngine', () => {
  let engine: CostOptimizationEngine;
  let mockSupabase: any;
  let mockOpenAI: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          supplier_id: 'test-supplier-id',
          feature_type: 'photo_ai',
          optimization_level: 'balanced',
          monthly_budget_pounds: '50.00',
          daily_budget_pounds: '5.00',
          alert_threshold_percent: 80,
          auto_disable_at_limit: true,
          cache_strategy: {
            semantic: true,
            exact: true,
            ttl_hours: 24,
            similarity_threshold: 0.85
          },
          batch_processing_enabled: true,
          seasonal_multiplier_enabled: true
        },
        error: null
      })
    };

    // Mock OpenAI client
    mockOpenAI = {
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{
            embedding: new Array(1536).fill(0.1) // Mock embedding vector
          }]
        })
      }
    };

    engine = new CostOptimizationEngine();
    
    // Replace private properties with mocks
    (engine as any).supabase = mockSupabase;
    (engine as any).openai = mockOpenAI;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('optimizeAIRequest', () => {
    test('should optimize photography AI request with semantic caching', async () => {
      // Arrange
      const aiRequest: AIRequest = {
        id: 'test-request-1',
        supplierId: 'supplier-1',
        featureType: 'photo_ai',
        prompt: 'Tag wedding photos with bride smiling, outdoor ceremony',
        qualityLevel: 'high',
        priority: 'normal',
        clientFacing: true,
        maxTokens: 1000,
        temperature: 0.7
      };

      // Act
      const result = await engine.optimizeAIRequest(aiRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.originalRequest).toEqual(aiRequest);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(result.optimizationReasons).toBeInstanceOf(Array);
      expect(result.optimizationReasons.length).toBeGreaterThan(0);
    });

    test('should select GPT-4 for high-quality client-facing content', async () => {
      // Arrange
      const clientFacingRequest: AIRequest = {
        id: 'test-request-2',
        supplierId: 'supplier-1',
        featureType: 'content_generation',
        prompt: 'Write elegant venue description for couple\'s wedding website',
        qualityLevel: 'high',
        priority: 'normal',
        clientFacing: true
      };

      // Act
      const result = await engine.optimizeAIRequest(clientFacingRequest);

      // Assert
      expect(result.optimizedModel).toBe('gpt-4-turbo');
      expect(result.optimizationReasons).toContain(expect.stringContaining('quality'));
    });

    test('should select GPT-3.5 for internal bulk processing', async () => {
      // Arrange
      const bulkRequest: AIRequest = {
        id: 'test-request-3',
        supplierId: 'supplier-1',
        featureType: 'photo_ai',
        prompt: 'Categorize wedding photos by event type',
        qualityLevel: 'medium',
        priority: 'batch',
        clientFacing: false
      };

      const aggressiveConfig: OptimizationConfig = {
        supplierId: 'supplier-1',
        featureType: 'photo_ai',
        optimizationLevel: 'aggressive',
        monthlyBudgetPounds: 50,
        dailyBudgetPounds: 5,
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

      // Act
      const result = await engine.optimizeAIRequest(bulkRequest, aggressiveConfig);

      // Assert
      expect(result.optimizedModel).toBe('gpt-3.5-turbo');
      expect(result.optimizationReasons).toContain(expect.stringContaining('efficient'));
    });

    test('should apply wedding season multiplier during peak months', async () => {
      // Arrange
      const peakSeasonRequest: AIRequest = {
        id: 'test-request-4',
        supplierId: 'supplier-1',
        featureType: 'venue_descriptions',
        prompt: 'Generate venue description for summer wedding',
        qualityLevel: 'high',
        priority: 'normal',
        clientFacing: true,
        weddingDate: new Date('2024-06-15') // Peak season
      };

      // Mock current date to be in peak season
      const mockDate = new Date('2024-06-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = await engine.optimizeAIRequest(peakSeasonRequest);

      // Assert
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.optimizationReasons).toContain(expect.stringContaining('season'));
    });

    test('should recommend batch processing for non-urgent requests', async () => {
      // Arrange
      const batchableRequest: AIRequest = {
        id: 'test-request-5',
        supplierId: 'supplier-1',
        featureType: 'menu_optimization',
        prompt: 'Optimize catering menu for dietary restrictions',
        qualityLevel: 'medium',
        priority: 'batch',
        clientFacing: false
      };

      // Act
      const result = await engine.optimizeAIRequest(batchableRequest);

      // Assert
      expect(result.processingMode).toBe('batch');
      expect(result.optimizationReasons).toContain(expect.stringContaining('batch'));
    });

    test('should throw error when budget limits are exceeded', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Budget limit exceeded'))
          })
        })
      });

      const budgetExceededRequest: AIRequest = {
        id: 'test-request-6',
        supplierId: 'supplier-over-budget',
        featureType: 'photo_ai',
        prompt: 'Process wedding photos',
        qualityLevel: 'high',
        priority: 'urgent',
        clientFacing: true
      };

      // Act & Assert
      await expect(engine.optimizeAIRequest(budgetExceededRequest))
        .rejects.toThrow('Budget limit exceeded');
    });
  });

  describe('calculateCostPrediction', () => {
    test('should calculate accurate cost prediction for photography studio', async () => {
      // Arrange
      const supplierId = 'photo-studio-1';
      const featureType = 'photo_ai';
      const timeframe = 'monthly';

      // Mock usage pattern data
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: [
                { cost_pounds: '25.50', api_calls: 100, cache_hits: 30, cache_misses: 70 }
              ],
              error: null
            })
          })
        })
      });

      // Act
      const prediction = await engine.calculateCostPrediction(supplierId, featureType, timeframe);

      // Assert
      expect(prediction).toBeDefined();
      expect(prediction.supplierId).toBe(supplierId);
      expect(prediction.featureType).toBe(featureType);
      expect(prediction.timeframe).toBe(timeframe);
      expect(prediction.currentSpend).toBeGreaterThan(0);
      expect(prediction.projectedSpend).toBeGreaterThan(prediction.currentSpend);
      expect(prediction.optimizationSavings).toBeGreaterThan(0);
      expect(prediction.seasonalMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(prediction.confidenceScore).toBeBetween(0, 1);
      expect(prediction.recommendations).toBeInstanceOf(Array);
    });

    test('should account for wedding season multiplier in projections', async () => {
      // Arrange
      const supplierId = 'venue-1';
      const featureType = 'venue_descriptions';
      
      // Mock peak season date
      jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-06-01') as any);

      // Act
      const prediction = await engine.calculateCostPrediction(supplierId, featureType, 'monthly');

      // Assert
      expect(prediction.seasonalMultiplier).toBe(1.6); // Peak season multiplier
      expect(prediction.projectedSpend).toBeGreaterThan(prediction.currentSpend);
    });

    test('should provide higher confidence for suppliers with more historical data', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: new Array(100).fill({ cost_pounds: '1.25' }), // Lots of historical data
              error: null
            })
          })
        })
      });

      // Act
      const prediction = await engine.calculateCostPrediction('supplier-with-history', 'photo_ai', 'monthly');

      // Assert
      expect(prediction.confidenceScore).toBeGreaterThan(0.7); // High confidence
    });
  });

  describe('selectOptimalModel', () => {
    test('should select GPT-4 for complex wedding planning requests', async () => {
      // Arrange
      const complexRequest: AIRequest = {
        id: 'complex-1',
        supplierId: 'planner-1',
        featureType: 'timeline_assistance',
        prompt: 'Create detailed wedding day timeline coordinating 15 vendors, accounting for setup times, photo sessions, and guest flow for 200-person outdoor ceremony with indoor reception',
        qualityLevel: 'high',
        priority: 'normal',
        clientFacing: true
      };

      const qualityFirstConfig: OptimizationConfig = {
        supplierId: 'planner-1',
        featureType: 'timeline_assistance',
        optimizationLevel: 'quality_first',
        monthlyBudgetPounds: 100,
        dailyBudgetPounds: 10,
        alertThresholdPercent: 90,
        autoDisableAtLimit: false,
        cacheStrategy: {
          semantic: true,
          exact: true,
          ttlHours: 48,
          similarityThreshold: 0.90
        },
        batchProcessingEnabled: false,
        seasonalMultiplierEnabled: true
      };

      // Act
      const selection = await engine.selectOptimalModel(complexRequest, qualityFirstConfig);

      // Assert
      expect(selection.selectedModel).toBe('gpt-4-turbo');
      expect(selection.qualityScore).toBe(95);
      expect(selection.reason).toContain('quality');
    });

    test('should select GPT-3.5 for simple categorization tasks', async () => {
      // Arrange
      const simpleRequest: AIRequest = {
        id: 'simple-1',
        supplierId: 'photographer-1',
        featureType: 'photo_ai',
        prompt: 'Tag photo: bride, groom, ceremony',
        qualityLevel: 'low',
        priority: 'batch',
        clientFacing: false
      };

      const aggressiveConfig: OptimizationConfig = {
        supplierId: 'photographer-1',
        featureType: 'photo_ai',
        optimizationLevel: 'aggressive',
        monthlyBudgetPounds: 30,
        dailyBudgetPounds: 3,
        alertThresholdPercent: 75,
        autoDisableAtLimit: true,
        cacheStrategy: {
          semantic: true,
          exact: true,
          ttlHours: 12,
          similarityThreshold: 0.75
        },
        batchProcessingEnabled: true,
        seasonalMultiplierEnabled: true
      };

      // Act
      const selection = await engine.selectOptimalModel(simpleRequest, aggressiveConfig);

      // Assert
      expect(selection.selectedModel).toBe('gpt-3.5-turbo');
      expect(selection.optimizationSavings).toBeGreaterThan(0);
    });
  });

  describe('scheduleForBatchProcessing', () => {
    test('should efficiently batch multiple photo tagging requests', async () => {
      // Arrange
      const photoRequests: AIRequest[] = [
        {
          id: 'batch-1',
          supplierId: 'photo-studio-1',
          featureType: 'photo_ai',
          prompt: 'Tag wedding ceremony photos',
          qualityLevel: 'medium',
          priority: 'batch',
          clientFacing: false
        },
        {
          id: 'batch-2',
          supplierId: 'photo-studio-1',
          featureType: 'photo_ai',
          prompt: 'Tag wedding reception photos',
          qualityLevel: 'medium',
          priority: 'batch',
          clientFacing: false
        },
        {
          id: 'batch-3',
          supplierId: 'photo-studio-1',
          featureType: 'photo_ai',
          prompt: 'Tag couples portrait photos',
          qualityLevel: 'medium',
          priority: 'batch',
          clientFacing: false
        }
      ];

      // Act
      const batchSchedule = await engine.scheduleForBatchProcessing(photoRequests);

      // Assert
      expect(batchSchedule).toBeDefined();
      expect(batchSchedule.batchId).toMatch(/^batch-/);
      expect(batchSchedule.requests).toHaveLength(3);
      expect(batchSchedule.estimatedCost).toBeGreaterThan(0);
      expect(batchSchedule.estimatedProcessingTime).toBeGreaterThan(0);
      expect(batchSchedule.priority).toBeGreaterThanOrEqual(1);
    });

    test('should prioritize urgent requests even in batch mode', async () => {
      // Arrange
      const mixedPriorityRequests: AIRequest[] = [
        {
          id: 'urgent-1',
          supplierId: 'planner-1',
          featureType: 'timeline_assistance',
          prompt: 'Emergency timeline adjustment for tomorrow\'s wedding',
          qualityLevel: 'high',
          priority: 'urgent',
          clientFacing: true,
          weddingDate: new Date(Date.now() + 86400000) // Tomorrow
        },
        {
          id: 'normal-1',
          supplierId: 'planner-1',
          featureType: 'venue_descriptions',
          prompt: 'Generate venue description',
          qualityLevel: 'medium',
          priority: 'normal',
          clientFacing: false
        }
      ];

      // Act
      const batchSchedule = await engine.scheduleForBatchProcessing(mixedPriorityRequests);

      // Assert
      expect(batchSchedule.priority).toBe(1); // High priority due to urgent request
      expect(batchSchedule.scheduledFor.getTime()).toBeLessThanOrEqual(Date.now() + 3600000); // Within 1 hour
    });
  });

  describe('Wedding Industry Scenarios', () => {
    test('should handle peak season photography studio workload', async () => {
      // Arrange: Photography studio processing 12,000 photos in June
      const peakSeasonRequests = Array.from({ length: 50 }, (_, i) => ({
        id: `photo-peak-${i}`,
        supplierId: 'capture-moments-studio',
        featureType: 'photo_ai' as const,
        prompt: `Tag and categorize wedding photos batch ${i + 1}`,
        qualityLevel: 'high' as const,
        priority: 'normal' as const,
        clientFacing: true,
        weddingDate: new Date('2024-06-15')
      }));

      // Mock peak season
      jest.spyOn(global, 'Date').mockImplementation(() => new Date('2024-06-01') as any);

      // Act
      const optimizedRequests = await Promise.all(
        peakSeasonRequests.slice(0, 5).map(req => engine.optimizeAIRequest(req))
      );

      // Assert
      const totalSavings = optimizedRequests.reduce((sum, opt) => sum + opt.potentialSavings, 0);
      expect(totalSavings).toBeGreaterThan(0);
      
      // Verify semantic caching is applied
      const cachedRequests = optimizedRequests.filter(opt => opt.cacheStrategy !== 'none');
      expect(cachedRequests.length).toBeGreaterThan(0);
      
      // Verify seasonal optimization is mentioned
      const seasonalOptimizations = optimizedRequests.filter(opt => 
        opt.optimizationReasons.some(reason => reason.includes('season'))
      );
      expect(seasonalOptimizations.length).toBeGreaterThan(0);
    });

    test('should optimize venue coordinator approaching daily budget limit', async () => {
      // Arrange: Venue coordinator at £4.50/£5.00 daily budget
      const nearLimitConfig: OptimizationConfig = {
        supplierId: 'venue-coordinator-1',
        featureType: 'venue_descriptions',
        optimizationLevel: 'balanced',
        monthlyBudgetPounds: 50,
        dailyBudgetPounds: 5,
        alertThresholdPercent: 90, // 90% threshold = £4.50
        autoDisableAtLimit: true,
        cacheStrategy: {
          semantic: true,
          exact: true,
          ttlHours: 24,
          similarityThreshold: 0.80
        },
        batchProcessingEnabled: true,
        seasonalMultiplierEnabled: true
      };

      const venueRequest: AIRequest = {
        id: 'venue-near-limit',
        supplierId: 'venue-coordinator-1',
        featureType: 'venue_descriptions',
        prompt: 'Generate description for rustic barn wedding venue',
        qualityLevel: 'medium',
        priority: 'normal',
        clientFacing: false
      };

      // Act
      const result = await engine.optimizeAIRequest(venueRequest, nearLimitConfig);

      // Assert
      expect(result.processingMode).toBe('batch'); // Should batch to avoid immediate cost
      expect(result.cacheStrategy).not.toBe('none'); // Should enable caching
      expect(result.optimizationReasons).toContain(expect.stringMatching(/batch|cache/i));
    });

    test('should generate cost projections for wedding planner AI timeline assistance', async () => {
      // Arrange: Wedding planner with AI timeline assistance cost spike
      const supplierId = 'elegant-weddings-planner';
      const featureType = 'timeline_assistance';

      // Mock historical data showing cost spike
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              data: [
                { cost_pounds: '45.00', api_calls: 180, cache_hits: 25, cache_misses: 155, date: '2024-03-01' },
                { cost_pounds: '52.00', api_calls: 200, cache_hits: 30, cache_misses: 170, date: '2024-04-01' },
                { cost_pounds: '48.00', api_calls: 190, cache_hits: 28, cache_misses: 162, date: '2024-05-01' }
              ],
              error: null
            })
          })
        })
      });

      // Act
      const prediction = await engine.calculateCostPrediction(supplierId, featureType, 'monthly');

      // Assert
      expect(prediction.projectedSpend).toBeGreaterThan(prediction.currentSpend);
      expect(prediction.seasonalMultiplier).toBe(1.6); // Peak season
      expect(prediction.recommendations).toContain(expect.stringMatching(/budget|optimization|cache/i));
      
      // Should recommend budget adjustment for peak season
      const budgetRecommendation = prediction.recommendations.find(r => 
        r.toLowerCase().includes('budget')
      );
      expect(budgetRecommendation).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      });

      const request: AIRequest = {
        id: 'error-test-1',
        supplierId: 'test-supplier',
        featureType: 'photo_ai',
        prompt: 'Test request',
        qualityLevel: 'medium',
        priority: 'normal',
        clientFacing: false
      };

      // Act & Assert
      await expect(engine.optimizeAIRequest(request))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle OpenAI API failures gracefully', async () => {
      // Arrange
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('OpenAI API rate limit exceeded'));

      const request: AIRequest = {
        id: 'openai-error-test',
        supplierId: 'test-supplier',
        featureType: 'content_generation',
        prompt: 'Generate content requiring embeddings',
        qualityLevel: 'high',
        priority: 'normal',
        clientFacing: true
      };

      // Act
      const result = await engine.optimizeAIRequest(request);

      // Assert
      // Should still provide optimization even if embeddings fail
      expect(result).toBeDefined();
      expect(result.cacheStrategy).toBe('exact'); // Should fall back to exact matching
    });

    test('should validate supplier configuration parameters', async () => {
      // Arrange
      const invalidConfig: OptimizationConfig = {
        supplierId: 'invalid-supplier',
        featureType: 'photo_ai',
        optimizationLevel: 'aggressive',
        monthlyBudgetPounds: -10, // Invalid negative budget
        dailyBudgetPounds: 0, // Invalid zero budget
        alertThresholdPercent: 150, // Invalid percentage over 100
        autoDisableAtLimit: true,
        cacheStrategy: {
          semantic: true,
          exact: true,
          ttlHours: -5, // Invalid negative TTL
          similarityThreshold: 1.5 // Invalid threshold over 1.0
        },
        batchProcessingEnabled: true,
        seasonalMultiplierEnabled: true
      };

      const request: AIRequest = {
        id: 'validation-test',
        supplierId: 'invalid-supplier',
        featureType: 'photo_ai',
        prompt: 'Test validation',
        qualityLevel: 'medium',
        priority: 'normal',
        clientFacing: false
      };

      // Act & Assert
      await expect(engine.optimizeAIRequest(request, invalidConfig))
        .rejects.toThrow(/validation|invalid|configuration/i);
    });
  });

  // Helper function for numeric range assertions
  expect.extend({
    toBeBetween(received: number, min: number, max: number) {
      const pass = received >= min && received <= max;
      if (pass) {
        return {
          message: () => `expected ${received} not to be between ${min} and ${max}`,
          pass: true
        };
      } else {
        return {
          message: () => `expected ${received} to be between ${min} and ${max}`,
          pass: false
        };
      }
    }
  });
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeBetween(min: number, max: number): R;
    }
  }
}