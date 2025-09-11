import { describe, it, expect, beforeEach, afterEach } from 'jest';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import { MockOpenAI } from '@/test-utils/mock-openai';
import { generateWeddingTestScenarios } from '@/test-utils/wedding-scenario-generator';
import { validateOptimizationQuality } from '@/test-utils/ai-quality-validators';

describe('WeddingOptimizationEngine - Core Functionality', () => {
  let optimizationEngine: WeddingOptimizationEngine;
  let mockOpenAI: MockOpenAI;

  beforeEach(async () => {
    mockOpenAI = new MockOpenAI();
    optimizationEngine = new WeddingOptimizationEngine({
      openaiApiKey: 'test-key',
      aiClient: mockOpenAI,
      testMode: true,
    });
    await optimizationEngine.initialize();
  });

  afterEach(async () => {
    await optimizationEngine.cleanup();
    mockOpenAI.reset();
  });

  describe('Comprehensive Wedding Optimization', () => {
    it('should optimize complete wedding plan with high quality', async () => {
      // Arrange
      const weddingScenario = generateWeddingTestScenarios.comprehensive({
        budget: 25000,
        guestCount: 120,
        location: 'London',
        style: 'modern',
        timeToWedding: 180, // 6 months
      });

      mockOpenAI.mockOptimizationResponse({
        recommendations: 6,
        budgetSavings: 0.25,
        qualityScore: 0.92,
      });

      const startTime = Date.now();

      // Act
      const result = await optimizationEngine.optimizeWeddingPlan(
        weddingScenario.request,
      );
      const processingTime = Date.now() - startTime;

      // Assert - Performance Requirements
      expect(processingTime).toBeLessThan(5000); // <5 seconds
      expect(result.status).toBe('completed');
      expect(result.processingTime).toBeLessThan(5000);

      // Assert - Quality Requirements
      expect(result.qualityScore).toBeGreaterThan(0.85); // >85% quality
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.recommendations).toHaveLength.greaterThanOrEqual(4);

      // Assert - Business Value
      expect(result.potentialSavings).toBeGreaterThan(
        weddingScenario.request.budget.total * 0.15,
      ); // >15% savings
      expect(result.implementationSteps).toHaveLength.greaterThan(0);
      expect(result.alternativeOptions).toHaveLength.greaterThan(0);

      // Validate recommendation quality
      const qualityValidation = await validateOptimizationQuality(
        result,
        weddingScenario,
      );
      expect(qualityValidation.overallScore).toBeGreaterThan(0.85);
      expect(qualityValidation.feasibilityScore).toBeGreaterThan(0.9);
      expect(qualityValidation.alignmentScore).toBeGreaterThan(0.8);
    });

    it('should handle budget-constrained wedding optimization', async () => {
      // Test low-budget wedding optimization
      const constrainedScenario =
        generateWeddingTestScenarios.budgetConstrained({
          budget: 8000,
          guestCount: 80,
          location: 'Manchester',
          priorities: ['photography', 'venue', 'catering'],
        });

      const result = await optimizationEngine.optimizeWeddingPlan(
        constrainedScenario.request,
      );

      expect(result.budgetOptimization).toBeDefined();
      expect(result.budgetOptimization.totalSavings).toBeGreaterThan(0);
      expect(result.budgetOptimization.qualityMaintained).toBe(true);
      expect(result.budgetOptimization.priorityRespected).toBe(true);

      // Ensure all recommendations fit within budget
      const totalRecommendationCost = result.recommendations.reduce(
        (sum, rec) => sum + (rec.costImpact || 0),
        0,
      );
      expect(
        constrainedScenario.request.budget.total + totalRecommendationCost,
      ).toBeLessThanOrEqual(
        constrainedScenario.request.budget.total * 1.05, // Allow 5% budget flexibility
      );
    });

    it('should optimize luxury wedding with quality focus', async () => {
      // Test high-end wedding optimization
      const luxuryScenario = generateWeddingTestScenarios.luxury({
        budget: 75000,
        guestCount: 200,
        location: 'Cotswolds',
        qualityPriority: 'premium',
        uniqueRequirements: [
          'michelin_catering',
          'celebrity_photographer',
          'castle_venue',
        ],
      });

      const result = await optimizationEngine.optimizeWeddingPlan(
        luxuryScenario.request,
      );

      expect(result.vendorOptimization.averageQualityScore).toBeGreaterThan(
        4.5,
      ); // High quality vendors
      expect(
        result.recommendations.every((rec) => rec.qualityTier === 'premium'),
      ).toBe(true);
      expect(result.budgetOptimization.luxuryFactorsMaintained).toBe(true);
    });
  });

  describe('AI Recommendation Quality Validation', () => {
    it('should generate highly relevant recommendations', async () => {
      const scenario = generateWeddingTestScenarios.standard({
        style: 'rustic',
        venue: 'barn',
        season: 'autumn',
      });

      const recommendations = await optimizationEngine.generateRecommendations(
        scenario.context,
      );

      expect(recommendations).toHaveLength.greaterThanOrEqual(5);

      // Validate recommendation relevance
      recommendations.forEach((rec) => {
        expect(rec.confidence).toBeGreaterThan(0.7);
        expect(rec.personalizedReasoning).toBeDefined();
        expect(rec.implementationSteps).toHaveLength.greaterThan(0);
        expect(rec.weddingStyleAlignment).toContain('rustic');
      });

      // Check for style consistency
      const styleAlignmentScores = recommendations.map(
        (rec) => rec.styleAlignmentScore,
      );
      expect(styleAlignmentScores.every((score) => score > 0.8)).toBe(true);
    });

    it('should personalize recommendations based on couple profile', async () => {
      const coupleProfile = {
        ages: [28, 30],
        personalityTypes: ['introverted', 'creative'],
        weddingExperience: 'first_time',
        stressLevel: 'high',
        decisionMakingStyle: 'research_heavy',
        budgetFlexibility: 'low',
      };

      const scenario = generateWeddingTestScenarios.personalized({
        coupleProfile,
      });
      const recommendations = await optimizationEngine.generateRecommendations(
        scenario.context,
      );

      // Validate personalization
      recommendations.forEach((rec) => {
        expect(rec.personalizedReasoning).toContain('stress-reducing');
        expect(rec.implementationComplexity).toBe('low'); // For high-stress couples
        expect(rec.budgetImpact).toBeLessThanOrEqual(0); // No budget increases for low flexibility
      });
    });

    it('should adapt recommendations based on timeline urgency', async () => {
      // Test urgent timeline scenario
      const urgentScenario = generateWeddingTestScenarios.urgent({
        timeToWedding: 30, // 30 days
        completionPercentage: 0.4, // Only 40% planned
      });

      const recommendations = await optimizationEngine.generateRecommendations(
        urgentScenario.context,
      );

      // Validate urgency handling
      recommendations.forEach((rec) => {
        expect(rec.urgency).toBe('high');
        expect(rec.implementationTime).toBeLessThan(7); // <7 days implementation
        expect(rec.priority).toBeGreaterThanOrEqual(8); // High priority
      });

      // Check that critical items are prioritized
      const criticalRecommendations = recommendations.filter((rec) =>
        ['venue', 'catering', 'photography'].includes(rec.category),
      );
      expect(criticalRecommendations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Crisis Management Testing', () => {
    it('should handle vendor cancellation crisis effectively', async () => {
      const vendorCrisis = {
        id: 'crisis-vendor-cancellation',
        type: 'vendor_cancellation',
        severity: 'high',
        weddingDate: new Date('2024-06-15'),
        cancelledVendor: {
          id: 'photographer-123',
          type: 'photography',
          cancellationDate: new Date('2024-05-20'), // 25 days before
          reason: 'medical_emergency',
        },
        weddingContext: generateWeddingTestScenarios.crisis().context,
      };

      const startTime = Date.now();
      const crisisResponse =
        await optimizationEngine.handleCrisisOptimization(vendorCrisis);
      const responseTime = Date.now() - startTime;

      // Performance requirements for crisis
      expect(responseTime).toBeLessThan(10000); // <10 seconds
      expect(crisisResponse.responseTime).toBeLessThan(10000);

      // Quality requirements for crisis response
      expect(crisisResponse.solutions).toHaveLength.greaterThanOrEqual(3);
      expect(crisisResponse.alternativeVendors).toHaveLength.greaterThanOrEqual(
        5,
      );
      expect(
        crisisResponse.actionPlan.immediateActions,
      ).toHaveLength.greaterThan(0);

      // Validate solution quality
      crisisResponse.solutions.forEach((solution) => {
        expect(solution.feasibility).toBeGreaterThan(0.8);
        expect(solution.qualityMaintenance).toBeGreaterThan(0.8);
        expect(solution.timeToImplement).toBeLessThan(7); // <1 week
      });
    });

    it('should handle budget shortfall crisis', async () => {
      const budgetCrisis = {
        id: 'crisis-budget-shortfall',
        type: 'budget_shortfall',
        severity: 'medium',
        shortfall: 8000,
        currentBudget: 20000,
        weddingDate: new Date('2024-07-20'),
        nonNegotiableItems: ['venue', 'photographer', 'wedding_dress'],
      };

      const crisisResponse =
        await optimizationEngine.handleCrisisOptimization(budgetCrisis);

      expect(crisisResponse.solutions).toHaveLength.greaterThan(0);

      // Validate budget crisis solutions
      const budgetSolutions = crisisResponse.solutions.filter(
        (s) => s.type === 'budget_optimization',
      );
      expect(budgetSolutions).toHaveLength.greaterThan(0);

      budgetSolutions.forEach((solution) => {
        expect(solution.savings).toBeGreaterThanOrEqual(
          budgetCrisis.shortfall * 0.8,
        ); // Cover 80% of shortfall
        expect(solution.qualityImpact).toBeLessThan(0.3); // <30% quality impact
        expect(solution.preservedItems).toEqual(
          expect.arrayContaining(budgetCrisis.nonNegotiableItems),
        );
      });
    });
  });

  describe('Performance and Scalability Testing', () => {
    it('should handle concurrent optimization requests', async () => {
      const concurrentRequests = Array(20)
        .fill(null)
        .map(
          (_, i) =>
            generateWeddingTestScenarios.standard({ weddingId: `wedding-${i}` })
              .request,
        );

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentRequests.map((request) =>
          optimizationEngine.optimizeWeddingPlan(request),
        ),
      );
      const totalTime = Date.now() - startTime;

      // Performance validation
      expect(totalTime).toBeLessThan(30000); // <30 seconds for 20 concurrent
      expect(results).toHaveLength(20);
      expect(results.every((r) => r.status === 'completed')).toBe(true);

      // Quality maintained under load
      const averageQuality =
        results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
      expect(averageQuality).toBeGreaterThan(0.8);
    });

    it('should maintain performance under memory pressure', async () => {
      // Create memory-intensive optimization scenario
      const largeScenario = generateWeddingTestScenarios.complex({
        guestCount: 500,
        vendors: 20,
        tasks: 150,
        historicalData: 'extensive',
      });

      const memoryBefore = process.memoryUsage();
      const result = await optimizationEngine.optimizeWeddingPlan(
        largeScenario.request,
      );
      const memoryAfter = process.memoryUsage();

      // Memory usage validation
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB increase

      // Performance maintained
      expect(result.processingTime).toBeLessThan(10000); // <10 seconds even for complex
      expect(result.qualityScore).toBeGreaterThan(0.8);
    });
  });

  describe('AI Learning and Adaptation Testing', () => {
    it('should learn from positive feedback', async () => {
      const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
        generateWeddingTestScenarios.standard().request,
      );

      const positiveFeedback = {
        optimizationId: optimizationResult.id,
        recommendationId: optimizationResult.recommendations[0].id,
        rating: 5,
        outcome: 'accepted',
        userComments: 'Perfect recommendation! Exactly what we needed.',
        actualSavings: 2500,
        satisfactionScore: 0.95,
      };

      await expect(
        optimizationEngine.learnFromFeedback(positiveFeedback),
      ).resolves.not.toThrow();

      // Validate learning impact (would require longer integration test)
      const learningMetrics = await optimizationEngine.getLearningMetrics();
      expect(learningMetrics.totalFeedbackProcessed).toBeGreaterThan(0);
      expect(learningMetrics.averageSatisfaction).toBeGreaterThan(0.8);
    });

    it('should adapt from negative feedback', async () => {
      const optimizationResult = await optimizationEngine.optimizeWeddingPlan(
        generateWeddingTestScenarios.standard().request,
      );

      const negativeFeedback = {
        optimizationId: optimizationResult.id,
        recommendationId: optimizationResult.recommendations[0].id,
        rating: 2,
        outcome: 'rejected',
        userComments: "Recommendation didn't match our style at all.",
        rejectionReason: 'style_mismatch',
        satisfactionScore: 0.2,
      };

      await expect(
        optimizationEngine.learnFromFeedback(negativeFeedback),
      ).resolves.not.toThrow();

      // Validate adaptation
      const adaptationMetrics = await optimizationEngine.getAdaptationMetrics();
      expect(adaptationMetrics.styleMatchingImprovements).toBeDefined();
    });
  });
});
