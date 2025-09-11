/**
 * WS-241: AI Caching Strategy System - Comprehensive Test Suite
 * Team D: AI/ML Engineering Implementation
 *
 * Integration and unit tests for the complete AI caching system
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { CachePredictionEngine } from '@/lib/ai/caching/cache-prediction-engine';
import { ContextAwareResponseOptimizer } from '@/lib/ai/caching/context-aware-optimizer';
import { CacheHitPredictor } from '@/lib/ai/caching/cache-hit-predictor';
import { WeddingAIModelTrainer } from '@/lib/ai/caching/wedding-ai-trainer';
import { AIQualityMonitor } from '@/lib/ai/caching/ai-quality-monitor';
import { AICacheOrchestrator } from '@/lib/ai/caching/ai-cache-orchestrator';
import { WeddingContext } from '@/lib/ai/caching/types';

// Mock wedding context for testing
const mockWeddingContext: WeddingContext = {
  wedding_id: 'test-wedding-123',
  couple_id: 'test-couple-456',
  wedding_date: new Date('2024-08-15'),
  location: {
    city: 'San Francisco',
    state: 'California',
    country: 'USA',
    venue: 'Golden Gate Park',
  },
  budget_range: 'high',
  wedding_style: 'modern',
  guest_count: 150,
  current_planning_stage: 'vendor_booking',
  cultural_preferences: ['American', 'Italian'],
  preferences: {
    photography_style: 'candid',
    music_genre: 'jazz',
    catering_style: 'plated',
  },
  timezone: 'America/Los_Angeles',
  season: 'summer',
};

const mockQuery =
  'What are the best photographers for outdoor summer weddings?';
const mockResponse =
  'For outdoor summer weddings, consider photographers who specialize in natural light photography and have experience with golden hour shoots. Look for portfolios featuring outdoor ceremonies and receptions.';

describe('AI Caching Strategy System - WS-241', () => {
  let cachePredictionEngine: CachePredictionEngine;
  let contextOptimizer: ContextAwareResponseOptimizer;
  let hitPredictor: CacheHitPredictor;
  let modelTrainer: WeddingAIModelTrainer;
  let qualityMonitor: AIQualityMonitor;
  let orchestrator: AICacheOrchestrator;

  beforeAll(async () => {
    // Initialize all components
    cachePredictionEngine = new CachePredictionEngine();
    contextOptimizer = new ContextAwareResponseOptimizer();
    hitPredictor = new CacheHitPredictor();
    modelTrainer = new WeddingAIModelTrainer();
    qualityMonitor = new AIQualityMonitor();
    orchestrator = new AICacheOrchestrator();

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  describe('Cache Prediction Engine', () => {
    it('should predict next queries based on wedding context', async () => {
      const predictions = await cachePredictionEngine.predictNextQueries(
        mockWeddingContext,
        [mockQuery],
        5,
      );

      expect(predictions).toHaveLength(5);
      expect(predictions[0]).toHaveProperty('query');
      expect(predictions[0]).toHaveProperty('confidence_score');
      expect(predictions[0]).toHaveProperty('priority');
      expect(predictions[0].confidence_score).toBeGreaterThan(0);
      expect(predictions[0].confidence_score).toBeLessThanOrEqual(1);
    });

    it('should calculate appropriate cache priority for queries', async () => {
      const priority = await cachePredictionEngine.calculateCachePriority(
        mockQuery,
        mockWeddingContext,
      );

      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(1);
      expect(typeof priority).toBe('number');
    });

    it('should handle seasonal cache preloading', async () => {
      await expect(
        cachePredictionEngine.preloadSeasonalCache(
          'summer',
          ['San Francisco', 'Los Angeles'],
          10,
        ),
      ).resolves.not.toThrow();
    });

    it('should encode wedding context into feature vectors', async () => {
      // Test private method through public interface
      const predictions = await cachePredictionEngine.predictNextQueries(
        mockWeddingContext,
        [],
        1,
      );

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
    });
  });

  describe('Context-Aware Response Optimizer', () => {
    it('should optimize AI responses with wedding context', async () => {
      const optimizedResponse = await contextOptimizer.optimizeAiResponse(
        mockQuery,
        mockResponse,
        mockWeddingContext,
      );

      expect(optimizedResponse).toBeDefined();
      expect(typeof optimizedResponse).toBe('string');
      expect(optimizedResponse.length).toBeGreaterThan(mockResponse.length);
      expect(optimizedResponse).toContain(mockResponse);
    });

    it('should calculate response cachability accurately', async () => {
      const cachability = await contextOptimizer.calculateResponseCachability(
        mockQuery,
        mockResponse,
        mockWeddingContext,
      );

      expect(cachability).toHaveProperty('overall_cachability');
      expect(cachability).toHaveProperty('context_sensitivity');
      expect(cachability).toHaveProperty('temporal_stability');
      expect(cachability).toHaveProperty('cache_scope');
      expect(cachability).toHaveProperty('recommended_ttl');
      expect(cachability).toHaveProperty('cache_decision');

      expect(cachability.overall_cachability).toBeGreaterThanOrEqual(0);
      expect(cachability.overall_cachability).toBeLessThanOrEqual(1);
      expect(cachability.recommended_ttl).toBeGreaterThan(0);
    });

    it('should handle different budget ranges appropriately', async () => {
      const lowBudgetContext = {
        ...mockWeddingContext,
        budget_range: 'low' as const,
      };
      const luxuryBudgetContext = {
        ...mockWeddingContext,
        budget_range: 'luxury' as const,
      };

      const lowBudgetResponse = await contextOptimizer.optimizeAiResponse(
        mockQuery,
        mockResponse,
        lowBudgetContext,
      );

      const luxuryBudgetResponse = await contextOptimizer.optimizeAiResponse(
        mockQuery,
        mockResponse,
        luxuryBudgetContext,
      );

      expect(lowBudgetResponse).not.toBe(luxuryBudgetResponse);
      expect(lowBudgetResponse.toLowerCase()).toContain('budget');
      expect(luxuryBudgetResponse.toLowerCase()).toContain('luxury');
    });

    it('should incorporate cultural preferences', async () => {
      const culturalContext = {
        ...mockWeddingContext,
        cultural_preferences: ['Indian', 'Hindu'],
      };

      const culturalResponse = await contextOptimizer.optimizeAiResponse(
        'What traditions should I include in my wedding?',
        'Consider including meaningful traditions in your ceremony.',
        culturalContext,
      );

      expect(culturalResponse.toLowerCase()).toMatch(
        /(indian|hindu|traditional|cultural)/,
      );
    });
  });

  describe('Cache Hit Predictor', () => {
    it('should predict cache hit probability with confidence metrics', async () => {
      const hitPrediction = await hitPredictor.predictCacheHitProbability(
        mockQuery,
        mockWeddingContext,
      );

      expect(hitPrediction).toHaveProperty('hit_probability');
      expect(hitPrediction).toHaveProperty('confidence');
      expect(hitPrediction).toHaveProperty('reasoning');
      expect(hitPrediction).toHaveProperty('similar_cached_queries');

      expect(hitPrediction.hit_probability).toBeGreaterThanOrEqual(0);
      expect(hitPrediction.hit_probability).toBeLessThanOrEqual(1);
      expect(hitPrediction.confidence).toBeGreaterThanOrEqual(0);
      expect(hitPrediction.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(hitPrediction.reasoning)).toBe(true);
      expect(Array.isArray(hitPrediction.similar_cached_queries)).toBe(true);
    });

    it('should optimize cache eviction using ML scoring', async () => {
      const mockCacheEntries = [
        {
          cache_key: 'test-key-1',
          query: mockQuery,
          response: mockResponse,
          context: mockWeddingContext,
          created_at: new Date(Date.now() - 86400000), // 1 day ago
          last_accessed: new Date(Date.now() - 3600000), // 1 hour ago
          access_count: 10,
          quality_score: 0.85,
          original_quality: 0.85,
          ttl: 86400,
          tags: ['photography', 'outdoor'],
          storage_cost: 0.001,
          generation_cost: 0.01,
        },
        {
          cache_key: 'test-key-2',
          query: 'What venues are available?',
          response: 'Here are some venue options...',
          context: mockWeddingContext,
          created_at: new Date(Date.now() - 172800000), // 2 days ago
          last_accessed: new Date(Date.now() - 86400000), // 1 day ago
          access_count: 2,
          quality_score: 0.6,
          original_quality: 0.8,
          ttl: 86400,
          tags: ['venues'],
          storage_cost: 0.001,
          generation_cost: 0.01,
        },
      ];

      const evictionResult = await hitPredictor.optimizeCacheEviction(
        mockCacheEntries,
        1,
      );

      expect(evictionResult).toHaveProperty('entries_to_evict');
      expect(evictionResult).toHaveProperty('entries_to_preserve');
      expect(evictionResult).toHaveProperty('performance_impact');

      expect(Array.isArray(evictionResult.entries_to_evict)).toBe(true);
      expect(Array.isArray(evictionResult.entries_to_preserve)).toBe(true);
      expect(evictionResult.entries_to_evict).toHaveLength(1);
    });

    it('should predict optimal cache size for different seasons', async () => {
      const cacheOptimization = await hitPredictor.predictOptimalCacheSize(
        new Date(),
        {
          daily_queries: 1000,
          peak_season_multiplier: 1.5,
          location_distribution: {
            California: 0.3,
            'New York': 0.2,
            Texas: 0.15,
            Florida: 0.1,
            other: 0.25,
          },
        },
      );

      expect(cacheOptimization).toHaveProperty('recommended_cache_size');
      expect(cacheOptimization).toHaveProperty('seasonal_adjustments');
      expect(cacheOptimization).toHaveProperty('cost_benefit_analysis');

      expect(cacheOptimization.recommended_cache_size).toBeGreaterThan(0);
      expect(cacheOptimization.seasonal_adjustments).toHaveProperty('spring');
      expect(cacheOptimization.seasonal_adjustments).toHaveProperty('summer');
      expect(cacheOptimization.seasonal_adjustments).toHaveProperty('fall');
      expect(cacheOptimization.seasonal_adjustments).toHaveProperty('winter');
    });
  });

  describe('Wedding AI Model Trainer', () => {
    it('should train wedding response model with appropriate metrics', async () => {
      const trainingConfig = {
        model_type: 'response_quality' as const,
        training_data_size: 1000,
        validation_split: 0.2,
        epochs: 10,
        batch_size: 32,
        learning_rate: 0.001,
        early_stopping_patience: 3,
        target_metrics: {
          accuracy: 0.85,
          precision: 0.8,
          recall: 0.8,
          f1_score: 0.8,
        },
      };

      const trainingResults =
        await modelTrainer.trainWeddingResponseModel(trainingConfig);

      expect(trainingResults).toHaveProperty('model_id');
      expect(trainingResults).toHaveProperty('training_metrics');
      expect(trainingResults).toHaveProperty('validation_metrics');
      expect(trainingResults).toHaveProperty('wedding_specific_metrics');
      expect(trainingResults).toHaveProperty('deployment_recommendation');
      expect(trainingResults).toHaveProperty('improvement_suggestions');

      expect(trainingResults.training_metrics.final_accuracy).toBeGreaterThan(
        0,
      );
      expect(trainingResults.validation_metrics.accuracy).toBeGreaterThan(0);
      expect(['deploy', 'retrain', 'abort']).toContain(
        trainingResults.deployment_recommendation,
      );
    });

    it('should perform continuous model improvement', async () => {
      const improvementResults =
        await modelTrainer.continuousModelImprovement();

      expect(improvementResults).toHaveProperty('models_updated');
      expect(improvementResults).toHaveProperty('performance_improvements');
      expect(improvementResults).toHaveProperty('next_training_schedule');

      expect(Array.isArray(improvementResults.models_updated)).toBe(true);
      expect(typeof improvementResults.performance_improvements).toBe('object');
      expect(improvementResults.next_training_schedule instanceof Date).toBe(
        true,
      );
    });

    it('should train seasonal pattern model', async () => {
      const seasonalResults = await modelTrainer.trainSeasonalPatternModel();

      expect(seasonalResults).toHaveProperty('model_id');
      expect(seasonalResults).toHaveProperty('training_metrics');
      expect(seasonalResults).toHaveProperty('validation_metrics');
      expect(seasonalResults.model_id).toContain('seasonal_pattern_model');
    });
  });

  describe('AI Quality Monitor', () => {
    it('should assess response quality comprehensively', async () => {
      const qualityAssessment = await qualityMonitor.assessResponseQuality(
        mockQuery,
        mockResponse,
        mockWeddingContext,
      );

      expect(qualityAssessment).toHaveProperty('overall_quality');
      expect(qualityAssessment).toHaveProperty('accuracy');
      expect(qualityAssessment).toHaveProperty('relevance');
      expect(qualityAssessment).toHaveProperty('completeness');
      expect(qualityAssessment).toHaveProperty('cultural_sensitivity');
      expect(qualityAssessment).toHaveProperty('budget_appropriateness');
      expect(qualityAssessment).toHaveProperty('cache_recommendation');
      expect(qualityAssessment).toHaveProperty('improvements');

      expect(qualityAssessment.overall_quality).toBeGreaterThanOrEqual(0);
      expect(qualityAssessment.overall_quality).toBeLessThanOrEqual(1);
      expect(['cache', 'no_cache', 'cache_with_modification']).toContain(
        qualityAssessment.cache_recommendation,
      );
      expect(Array.isArray(qualityAssessment.improvements)).toBe(true);
    });

    it('should monitor cached response decay', async () => {
      const decayMonitoring = await qualityMonitor.monitorCachedResponseDecay();

      expect(decayMonitoring).toHaveProperty('degraded_responses');
      expect(decayMonitoring).toHaveProperty('overall_cache_health');
      expect(decayMonitoring).toHaveProperty('actions_taken');

      expect(Array.isArray(decayMonitoring.degraded_responses)).toBe(true);
      expect(decayMonitoring.overall_cache_health).toBeGreaterThanOrEqual(0);
      expect(decayMonitoring.overall_cache_health).toBeLessThanOrEqual(1);
      expect(Array.isArray(decayMonitoring.actions_taken)).toBe(true);
    });

    it('should analyze wedding feedback patterns', async () => {
      const feedbackAnalysis =
        await qualityMonitor.analyzeWeddingFeedbackPatterns();

      expect(feedbackAnalysis).toHaveProperty('context_insights');
      expect(feedbackAnalysis).toHaveProperty('quality_issues');
      expect(feedbackAnalysis).toHaveProperty('improvement_recommendations');
      expect(feedbackAnalysis).toHaveProperty('overall_satisfaction');

      expect(typeof feedbackAnalysis.context_insights).toBe('object');
      expect(Array.isArray(feedbackAnalysis.quality_issues)).toBe(true);
      expect(Array.isArray(feedbackAnalysis.improvement_recommendations)).toBe(
        true,
      );
      expect(feedbackAnalysis.overall_satisfaction).toBeGreaterThanOrEqual(0);
      expect(feedbackAnalysis.overall_satisfaction).toBeLessThanOrEqual(1);
    });

    it('should provide quality dashboard data', async () => {
      const dashboardData = await qualityMonitor.getQualityDashboardData();

      expect(dashboardData).toHaveProperty('current_metrics');
      expect(dashboardData).toHaveProperty('active_alerts');
      expect(dashboardData).toHaveProperty('quality_trends');
      expect(dashboardData).toHaveProperty('cache_health_score');
      expect(dashboardData).toHaveProperty('recommendations');
      expect(dashboardData).toHaveProperty('seasonal_patterns');

      expect(typeof dashboardData.current_metrics).toBe('object');
      expect(Array.isArray(dashboardData.active_alerts)).toBe(true);
      expect(Array.isArray(dashboardData.quality_trends)).toBe(true);
      expect(Array.isArray(dashboardData.recommendations)).toBe(true);
    });
  });

  describe('AI Cache Orchestrator - Integration Tests', () => {
    it('should process prediction requests successfully', async () => {
      const request = {
        query: '',
        context: mockWeddingContext,
        operation: 'predict' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);

      expect(response.success).toBe(true);
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('performance_metrics');
      expect(response.data).toHaveProperty('predicted_queries');
      expect(response.performance_metrics?.processing_time).toBeGreaterThan(0);
    });

    it('should process optimization requests successfully', async () => {
      const request = {
        query: mockQuery,
        response: mockResponse,
        context: mockWeddingContext,
        operation: 'optimize' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('optimized_response');
      expect(response.data).toHaveProperty('quality_assessment');
      expect(response.data).toHaveProperty('cache_decision');
      expect(response.data).toHaveProperty('improvements_applied');
    });

    it('should process quality assessment requests successfully', async () => {
      const request = {
        query: mockQuery,
        response: mockResponse,
        context: mockWeddingContext,
        operation: 'assess_quality' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('quality_assessment');
      expect(response.performance_metrics?.quality_score).toBeGreaterThan(0);
    });

    it('should process cache decision requests successfully', async () => {
      const request = {
        query: mockQuery,
        response: mockResponse,
        context: mockWeddingContext,
        operation: 'cache_decision' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('should_cache');
      expect(response.data).toHaveProperty('cache_priority');
      expect(response.data).toHaveProperty('hit_probability');
      expect(response.data).toHaveProperty('reasoning');
      expect(typeof response.data.should_cache).toBe('boolean');
    });

    it('should process metrics requests successfully', async () => {
      const request = {
        query: '',
        context: mockWeddingContext,
        operation: 'get_metrics' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('performance_metrics');
      expect(response.data).toHaveProperty('quality_dashboard');
      expect(response.data).toHaveProperty('system_health');
    });

    it('should get comprehensive performance metrics', async () => {
      const metrics = await orchestrator.getCachePerformanceMetrics();

      expect(metrics).toHaveProperty('hit_rate');
      expect(metrics).toHaveProperty('miss_rate');
      expect(metrics).toHaveProperty('avg_response_time');
      expect(metrics).toHaveProperty('quality_score');
      expect(metrics).toHaveProperty('ai_specific_metrics');

      expect(metrics.ai_specific_metrics).toHaveProperty('prediction_accuracy');
      expect(metrics.ai_specific_metrics).toHaveProperty('quality_trends');
      expect(metrics.ai_specific_metrics).toHaveProperty(
        'seasonal_performance',
      );
      expect(metrics.ai_specific_metrics).toHaveProperty('model_performance');
    });

    it('should trigger model improvement successfully', async () => {
      const improvementResult = await orchestrator.triggerModelImprovement();

      expect(improvementResult).toHaveProperty('models_updated');
      expect(improvementResult).toHaveProperty('performance_improvements');
      expect(improvementResult).toHaveProperty('next_training_schedule');
      expect(improvementResult).toHaveProperty('quality_impact');

      expect(Array.isArray(improvementResult.models_updated)).toBe(true);
      expect(typeof improvementResult.performance_improvements).toBe('object');
      expect(improvementResult.next_training_schedule instanceof Date).toBe(
        true,
      );
      expect(typeof improvementResult.quality_impact).toBe('number');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid wedding contexts gracefully', async () => {
      const invalidContext = { ...mockWeddingContext } as any;
      delete invalidContext.wedding_date;

      const request = {
        query: mockQuery,
        context: invalidContext,
        operation: 'predict' as const,
      };

      const response = await orchestrator.processAICacheRequest(request);
      // Should handle gracefully without throwing
      expect(response).toHaveProperty('success');
    });

    it('should handle empty queries appropriately', async () => {
      const predictions = await cachePredictionEngine.predictNextQueries(
        mockWeddingContext,
        [],
        5,
      );

      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
    });

    it('should handle very long responses in optimization', async () => {
      const longResponse = mockResponse.repeat(100);

      const optimizedResponse = await contextOptimizer.optimizeAiResponse(
        mockQuery,
        longResponse,
        mockWeddingContext,
      );

      expect(optimizedResponse).toBeDefined();
      expect(typeof optimizedResponse).toBe('string');
    });

    it('should handle extreme budget ranges', async () => {
      const extremeContext = {
        ...mockWeddingContext,
        budget_range: 'luxury' as const,
      };

      const qualityAssessment = await qualityMonitor.assessResponseQuality(
        "What's the most expensive wedding venue?",
        'Consider luxury venues with premium services.',
        extremeContext,
      );

      expect(qualityAssessment).toBeDefined();
      expect(qualityAssessment.budget_appropriateness).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should process multiple predictions efficiently', async () => {
      const startTime = Date.now();

      const promises = Array(10)
        .fill(null)
        .map(() =>
          cachePredictionEngine.predictNextQueries(
            mockWeddingContext,
            [mockQuery],
            3,
          ),
        );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(results.every((result) => Array.isArray(result))).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle batch optimization requests', async () => {
      const batchRequests = Array(5)
        .fill(null)
        .map((_, i) => ({
          query: `Test query ${i}`,
          response: `Test response ${i}`,
          context: mockWeddingContext,
        }));

      const startTime = Date.now();

      const optimizationPromises = batchRequests.map((req) =>
        contextOptimizer.optimizeAiResponse(
          req.query,
          req.response,
          req.context,
        ),
      );

      const results = await Promise.all(optimizationPromises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results.every((result) => typeof result === 'string')).toBe(true);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
    });
  });

  afterAll(async () => {
    // Cleanup if needed
    jest.clearAllMocks();
  });
});
