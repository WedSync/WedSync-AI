import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'jest';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import { AIRecommendationEngine } from '@/lib/ai/ai-recommendation-engine';
import { DatabaseTestHelper } from '@/test-utils/database-test-helper';
import { SupabaseTestClient } from '@/test-utils/supabase-test-client';
import { ExternalAPITestMocks } from '@/test-utils/external-api-mocks';
import { generateWeddingTestScenarios } from '@/test-utils/wedding-scenario-generator';

describe('AI System Integration Testing', () => {
  let optimizationEngine: WeddingOptimizationEngine;
  let recommendationEngine: AIRecommendationEngine;
  let dbHelper: DatabaseTestHelper;
  let supabaseClient: SupabaseTestClient;
  let apiMocks: ExternalAPITestMocks;

  beforeAll(async () => {
    // Set up test database
    dbHelper = new DatabaseTestHelper();
    await dbHelper.setupTestDatabase();

    // Set up Supabase test client
    supabaseClient = new SupabaseTestClient();
    await supabaseClient.initialize();

    // Set up external API mocks
    apiMocks = new ExternalAPITestMocks();
    await apiMocks.initializeMocks();
  });

  afterAll(async () => {
    await dbHelper.cleanupTestDatabase();
    await supabaseClient.cleanup();
    await apiMocks.cleanup();
  });

  beforeEach(async () => {
    // Initialize AI engines with test configuration
    optimizationEngine = new WeddingOptimizationEngine({
      databaseClient: dbHelper.client,
      supabaseClient: supabaseClient.client,
      testMode: true,
    });

    recommendationEngine = new AIRecommendationEngine({
      databaseClient: dbHelper.client,
      supabaseClient: supabaseClient.client,
      testMode: true,
    });

    await optimizationEngine.initialize();
    await recommendationEngine.initialize();

    // Clear test data
    await dbHelper.clearTestData();
  });

  afterEach(async () => {
    await optimizationEngine.cleanup();
    await recommendationEngine.cleanup();
  });

  describe('Database Integration', () => {
    it('should persist optimization results to database correctly', async () => {
      // Arrange
      const weddingScenario = generateWeddingTestScenarios.standard({
        weddingId: 'test-wedding-123',
      });

      // Act
      const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
      );

      // Assert - Check database persistence
      const savedOptimization = await dbHelper.findOptimizationById(
        optimizationResult.id,
      );
      expect(savedOptimization).toBeDefined();
      expect(savedOptimization.wedding_id).toBe('test-wedding-123');
      expect(savedOptimization.status).toBe('completed');
      expect(savedOptimization.quality_score).toBeGreaterThan(0.8);

      // Check recommendations were saved
      const savedRecommendations =
        await dbHelper.findRecommendationsByOptimizationId(
          optimizationResult.id,
        );
      expect(savedRecommendations.length).toBeGreaterThanOrEqual(4);

      savedRecommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThan(0.7);
        expect(rec.potential_savings).toBeGreaterThan(0);
        expect(rec.title).toBeDefined();
        expect(rec.category).toBeDefined();
      });
    });

    it('should handle database transactions properly during optimization', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();

      // Simulate database failure mid-optimization
      await dbHelper.simulateDatabaseFailure();

      // Act & Assert
      await expect(
        optimizationEngine.optimizeWeddingPlan(weddingScenario.request),
      ).rejects.toThrow();

      // Verify rollback occurred - no partial data should be saved
      const optimizations = await dbHelper.findAllOptimizations();
      const recommendations = await dbHelper.findAllRecommendations();

      expect(optimizations.length).toBe(0);
      expect(recommendations.length).toBe(0);

      // Restore database
      await dbHelper.restoreDatabase();
    });

    it('should sync AI learning data with database', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();
      const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
      );

      // Simulate user feedback
      const feedback = {
        recommendationId: optimizationResult.recommendations[0].id,
        rating: 5,
        outcome: 'accepted',
        actualSavings: 2500,
        satisfactionScore: 0.95,
        userComments: 'Excellent recommendation!',
      };

      // Act
      await optimizationEngine.learnFromFeedback(feedback);

      // Assert - Check feedback was stored
      const storedFeedback = await dbHelper.findFeedbackByRecommendationId(
        feedback.recommendationId,
      );

      expect(storedFeedback).toBeDefined();
      expect(storedFeedback.rating).toBe(5);
      expect(storedFeedback.outcome).toBe('accepted');
      expect(storedFeedback.actual_savings).toBe(2500);
      expect(storedFeedback.satisfaction_score).toBe(0.95);
    });
  });

  describe('Supabase Integration', () => {
    it('should integrate with Supabase Auth for user context', async () => {
      // Create test user
      const testUser = await supabaseClient.createTestUser({
        email: 'test@wedsync.com',
        weddingDate: '2024-08-15',
        preferences: { style: 'modern', budget: 25000 },
      });

      const weddingScenario = generateWeddingTestScenarios.forUser(testUser.id);

      // Act
      const recommendations = await recommendationEngine.recommendVendors(
        weddingScenario.request,
        { userId: testUser.id },
      );

      // Assert - Recommendations should be personalized for user
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach((rec) => {
        expect(rec.personalization.userId).toBe(testUser.id);
        expect(rec.personalizedReasoning).toContain('modern');
        expect(rec.budgetAlignment).toBe(true);
      });

      // Verify user preferences were considered
      const userContext = await supabaseClient.getUserContext(testUser.id);
      expect(userContext.preferences.style).toBe('modern');
    });

    it('should handle Supabase real-time updates during optimization', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();

      // Set up real-time listener
      const progressUpdates = [];
      const subscription = supabaseClient.subscribeToOptimizationProgress(
        (update) => progressUpdates.push(update),
      );

      // Act
      await optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
        { enableRealTimeUpdates: true },
      );

      // Wait for real-time updates to propagate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Assert
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      expect(progressUpdates[0].status).toBe('started');
      expect(progressUpdates[progressUpdates.length - 1].status).toBe(
        'completed',
      );

      // Cleanup
      await subscription.unsubscribe();
    });

    it('should sync with Supabase Storage for AI model artifacts', async () => {
      // Act - Generate optimization that should create model artifacts
      const complexScenario = generateWeddingTestScenarios.complex();
      const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
        complexScenario.request,
        { saveModelArtifacts: true },
      );

      // Assert - Check artifacts were stored
      const artifactPath = `ai-models/optimizations/${optimizationResult.id}`;
      const artifactExists = await supabaseClient.checkStorageFileExists(
        'ai-artifacts',
        artifactPath,
      );

      expect(artifactExists).toBe(true);

      // Verify artifact metadata
      const artifactMetadata = await supabaseClient.getFileMetadata(
        'ai-artifacts',
        artifactPath,
      );

      expect(artifactMetadata.size).toBeGreaterThan(0);
      expect(artifactMetadata.mimetype).toBe('application/json');
    });
  });

  describe('External API Integration', () => {
    it('should integrate with vendor APIs for real-time data', async () => {
      // Mock vendor APIs
      apiMocks.mockVendorAPI('photography', {
        vendors: [
          {
            id: 'photo-1',
            name: 'Elite Photography',
            rating: 4.9,
            price: 2500,
            availability: true,
          },
          {
            id: 'photo-2',
            name: 'Perfect Shots',
            rating: 4.7,
            price: 2200,
            availability: true,
          },
        ],
      });

      const coupleProfile = {
        weddingStyle: 'classic',
        budget: 30000,
        location: 'London',
        weddingDate: '2024-09-15',
      };

      // Act
      const recommendations =
        await recommendationEngine.recommendVendors(coupleProfile);

      // Assert
      const photographyRecommendations = recommendations.filter(
        (rec) => rec.vendor.category === 'photography',
      );

      expect(photographyRecommendations.length).toBeGreaterThanOrEqual(2);
      expect(photographyRecommendations[0].vendor.name).toBe(
        'Elite Photography',
      );
      expect(photographyRecommendations[0].vendor.realTimeData).toBe(true);
      expect(photographyRecommendations[0].vendor.availability).toBe(true);
    });

    it('should handle API failures gracefully', async () => {
      // Simulate API failures
      apiMocks.simulateAPIFailure('catering', { errorRate: 0.5 });

      const coupleProfile = {
        weddingStyle: 'rustic',
        budget: 25000,
        location: 'Manchester',
      };

      // Act
      const recommendations =
        await recommendationEngine.recommendVendors(coupleProfile);

      // Assert - Should still provide recommendations using cached data
      expect(recommendations.length).toBeGreaterThan(0);

      const cateringRecommendations = recommendations.filter(
        (rec) => rec.vendor.category === 'catering',
      );

      // Should have some catering recommendations despite API issues
      expect(cateringRecommendations.length).toBeGreaterThan(0);
      cateringRecommendations.forEach((rec) => {
        expect(rec.dataSource).toBe('cached'); // Should use cached data
        expect(rec.reliability).toBe('medium'); // Should indicate reduced reliability
      });
    });

    it('should integrate with payment processing APIs', async () => {
      // Mock Stripe API for budget optimization
      apiMocks.mockStripeAPI({
        pricing: {
          venue_standard: { min: 3000, max: 8000 },
          catering_premium: { min: 4000, max: 12000 },
        },
      });

      const budgetOptimizationRequest = {
        totalBudget: 25000,
        allocations: {
          venue: 8000,
          catering: 7000,
          photography: 3500,
          flowers: 2500,
          music: 2000,
          miscellaneous: 2000,
        },
      };

      // Act
      const optimization = await recommendationEngine.optimizeBudget(
        budgetOptimizationRequest,
      );

      // Assert
      expect(optimization.paymentIntegration).toBe(true);
      expect(optimization.realTimePricing).toBe(true);
      expect(optimization.optimizedAllocations.venue).toBeLessThan(8000);
      expect(optimization.totalSavings).toBeGreaterThan(2000);
    });
  });

  describe('Cross-Platform Integration', () => {
    it('should synchronize across web and mobile platforms', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();

      // Simulate optimization from web platform
      const webOptimizationResult =
        await optimizationEngine.optimizeWeddingPlan(weddingScenario.request, {
          platform: 'web',
        });

      // Simulate accessing from mobile platform
      const mobileContext = {
        platform: 'mobile',
        deviceCapabilities: { offline: true, storage: 'limited' },
      };

      const mobileOptimizationData =
        await optimizationEngine.getOptimizationForPlatform(
          webOptimizationResult.id,
          mobileContext,
        );

      // Assert
      expect(mobileOptimizationData.id).toBe(webOptimizationResult.id);
      expect(mobileOptimizationData.mobileOptimized).toBe(true);
      expect(mobileOptimizationData.recommendations.length).toBeLessThanOrEqual(
        webOptimizationResult.recommendations.length,
      ); // May be filtered for mobile
      expect(mobileOptimizationData.offlineCapable).toBe(true);
    });

    it('should handle offline-to-online synchronization', async () => {
      // Simulate offline optimization
      const offlineScenario = generateWeddingTestScenarios.standard();
      const offlineOptimization = await optimizationEngine.optimizeWeddingPlan(
        offlineScenario.request,
        { mode: 'offline' },
      );

      // Simulate going back online and syncing
      const syncResult = await optimizationEngine.syncOfflineData([
        offlineOptimization,
      ]);

      // Assert
      expect(syncResult.syncedOptimizations).toBe(1);
      expect(syncResult.conflicts).toBe(0);
      expect(syncResult.success).toBe(true);

      // Verify data was properly synced to database
      const syncedData = await dbHelper.findOptimizationById(
        offlineOptimization.id,
      );
      expect(syncedData).toBeDefined();
      expect(syncedData.sync_status).toBe('completed');
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance with integrated caching systems', async () => {
      const scenarios = Array(10)
        .fill(null)
        .map((_, i) =>
          generateWeddingTestScenarios.standard({
            weddingId: `performance-test-${i}`,
          }),
        );

      // First run - populate caches
      const firstRunStart = Date.now();
      await Promise.all(
        scenarios.map((scenario) =>
          optimizationEngine.optimizeWeddingPlan(scenario.request),
        ),
      );
      const firstRunTime = Date.now() - firstRunStart;

      // Second run - should benefit from caching
      const secondRunStart = Date.now();
      await Promise.all(
        scenarios.map((scenario) =>
          optimizationEngine.optimizeWeddingPlan(scenario.request),
        ),
      );
      const secondRunTime = Date.now() - secondRunStart;

      // Assert - Second run should be significantly faster due to caching
      expect(secondRunTime).toBeLessThan(firstRunTime * 0.6); // At least 40% faster

      // Verify cache hit rates
      const cacheStats = await optimizationEngine.getCacheStatistics();
      expect(cacheStats.hitRate).toBeGreaterThan(0.7); // >70% cache hit rate
    });

    it('should handle load balancing across AI service instances', async () => {
      // Simulate multiple concurrent requests
      const heavyLoadScenarios = Array(50)
        .fill(null)
        .map((_, i) =>
          generateWeddingTestScenarios.standard({
            weddingId: `load-test-${i}`,
          }),
        );

      const startTime = Date.now();
      const results = await Promise.all(
        heavyLoadScenarios.map((scenario) =>
          optimizationEngine.optimizeWeddingPlan(scenario.request),
        ),
      );
      const totalTime = Date.now() - startTime;

      // Assert
      expect(results.length).toBe(50);
      expect(results.every((r) => r.status === 'completed')).toBe(true);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds

      // Verify load was distributed
      const loadDistribution =
        await optimizationEngine.getLoadDistributionStats();
      expect(loadDistribution.instancesUsed).toBeGreaterThan(1);
      expect(loadDistribution.maxInstanceLoad).toBeLessThan(0.9); // No instance overloaded
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from temporary service failures', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();

      // Simulate temporary AI service failure
      apiMocks.simulateServiceFailure('openai', {
        duration: 5000, // 5 seconds
        errorType: 'timeout',
      });

      // Act
      const optimizationPromise = optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
        { enableRetry: true, maxRetries: 3 },
      );

      // Service should recover after 5 seconds
      const result = await optimizationPromise;

      // Assert
      expect(result.status).toBe('completed');
      expect(result.retryCount).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(5000); // Should account for retry delay
    });

    it('should provide graceful degradation when AI services are unavailable', async () => {
      const weddingScenario = generateWeddingTestScenarios.standard();

      // Simulate complete AI service outage
      apiMocks.simulateServiceOutage('openai');

      // Act
      const result = await optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
        { enableFallback: true },
      );

      // Assert - Should provide basic optimization using rule-based system
      expect(result.status).toBe('completed_fallback');
      expect(result.fallbackMode).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.qualityScore).toBeGreaterThan(0.6); // Lower but still useful
      expect(result.confidence).toBeLessThan(0.8); // Should indicate reduced confidence
    });

    it('should handle data consistency during concurrent updates', async () => {
      const weddingId = 'concurrent-test-wedding';
      const scenario = generateWeddingTestScenarios.standard({ weddingId });

      // Simulate multiple concurrent optimization requests for same wedding
      const concurrentOptimizations = Array(5)
        .fill(null)
        .map(() => optimizationEngine.optimizeWeddingPlan(scenario.request));

      const results = await Promise.all(concurrentOptimizations);

      // Assert - Should handle concurrent updates without corruption
      expect(results.length).toBe(5);
      results.forEach((result) => {
        expect(result.status).toBe('completed');
        expect(result.weddingId).toBe(weddingId);
      });

      // Verify database consistency
      const storedOptimizations =
        await dbHelper.findOptimizationsByWeddingId(weddingId);
      expect(storedOptimizations.length).toBe(5);

      // All optimizations should have unique IDs
      const uniqueIds = new Set(storedOptimizations.map((opt) => opt.id));
      expect(uniqueIds.size).toBe(5);
    });
  });
});
