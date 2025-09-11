import { AIRecommendationEngine } from '@/lib/ai/ai-recommendation-engine';
import { RecommendationAccuracyValidator } from '@/test-utils/recommendation-validators';
import { WeddingStyleAnalyzer } from '@/test-utils/style-analyzer';

describe('AI Recommendation Accuracy Testing', () => {
  let recommendationEngine: AIRecommendationEngine;
  let accuracyValidator: RecommendationAccuracyValidator;
  let styleAnalyzer: WeddingStyleAnalyzer;

  beforeEach(() => {
    recommendationEngine = new AIRecommendationEngine({ testMode: true });
    accuracyValidator = new RecommendationAccuracyValidator();
    styleAnalyzer = new WeddingStyleAnalyzer();
  });

  describe('Vendor Recommendation Accuracy', () => {
    it('should recommend vendors matching couple style preferences', async () => {
      const coupleProfile = {
        weddingStyle: 'bohemian',
        colorPalette: ['sage_green', 'cream', 'gold'],
        atmosphere: 'relaxed',
        location: 'countryside',
        budget: 28000,
      };

      const vendorRecommendations =
        await recommendationEngine.recommendVendors(coupleProfile);

      expect(vendorRecommendations).toHaveLength.greaterThanOrEqual(5);

      // Validate style matching accuracy
      for (const recommendation of vendorRecommendations) {
        const styleMatch = await styleAnalyzer.analyzeStyleCompatibility(
          coupleProfile.weddingStyle,
          recommendation.vendor.style,
        );
        expect(styleMatch.compatibility).toBeGreaterThan(0.8);
        expect(styleMatch.reasons).toContain('bohemian');
      }

      // Validate overall recommendation quality
      const accuracyScore =
        await accuracyValidator.validateVendorRecommendations(
          vendorRecommendations,
          coupleProfile,
        );
      expect(accuracyScore.overallAccuracy).toBeGreaterThan(0.9);
      expect(accuracyScore.styleAccuracy).toBeGreaterThan(0.85);
      expect(accuracyScore.budgetAccuracy).toBeGreaterThan(0.95);
    });

    it('should prioritize vendors by quality and fit', async () => {
      const coupleProfile = {
        priorities: ['quality', 'reliability', 'communication'],
        weddingStyle: 'classic',
        budget: 35000,
        qualityImportance: 'very_high',
      };

      const recommendations =
        await recommendationEngine.recommendVendors(coupleProfile);

      // Validate prioritization accuracy
      expect(recommendations[0].vendor.qualityScore).toBeGreaterThan(4.5);
      expect(recommendations[0].vendor.reliabilityScore).toBeGreaterThan(4.5);
      expect(recommendations[0].compatibilityScore).toBeGreaterThan(0.9);

      // Validate descending order by overall score
      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].overallScore).toBeGreaterThanOrEqual(
          recommendations[i].overallScore,
        );
      }
    });
  });

  describe('Budget Optimization Accuracy', () => {
    it('should optimize budget while maintaining quality standards', async () => {
      const weddingBudget = {
        total: 22000,
        allocations: {
          venue: 8000,
          catering: 6000,
          photography: 3500,
          flowers: 2000,
          music: 1500,
          miscellaneous: 1000,
        },
        qualityMinimum: 'good',
        savingsTarget: 0.25, // 25% savings goal
      };

      const optimization =
        await recommendationEngine.optimizeBudget(weddingBudget);

      // Validate savings achievement
      expect(optimization.totalSavings).toBeGreaterThanOrEqual(
        weddingBudget.total * 0.2, // At least 20% savings
      );
      expect(optimization.totalSavings).toBeLessThanOrEqual(
        weddingBudget.total * 0.35, // Not more than 35% (unrealistic)
      );

      // Validate quality maintenance
      expect(optimization.qualityMaintained).toBe(true);
      expect(optimization.averageQualityScore).toBeGreaterThan(3.5); // Above 'good' quality

      // Validate realistic optimizations
      Object.keys(optimization.optimizedAllocations).forEach((category) => {
        const originalAmount = weddingBudget.allocations[category];
        const optimizedAmount = optimization.optimizedAllocations[category];
        const reduction = (originalAmount - optimizedAmount) / originalAmount;

        // No single category reduced by more than 40%
        expect(reduction).toBeLessThan(0.4);
      });
    });

    it('should respect non-negotiable budget items', async () => {
      const weddingBudget = {
        total: 30000,
        allocations: {
          venue: 12000,
          photography: 4000,
          catering: 8000,
          flowers: 3000,
          music: 2000,
          dress: 1000,
        },
        nonNegotiable: ['photography', 'dress'], // Cannot reduce these
        savingsTarget: 0.15,
      };

      const optimization =
        await recommendationEngine.optimizeBudget(weddingBudget);

      // Validate non-negotiable items preserved
      expect(
        optimization.optimizedAllocations.photography,
      ).toBeGreaterThanOrEqual(weddingBudget.allocations.photography);
      expect(optimization.optimizedAllocations.dress).toBeGreaterThanOrEqual(
        weddingBudget.allocations.dress,
      );

      // Validate savings achieved through other categories
      expect(optimization.totalSavings).toBeGreaterThan(0);
      expect(optimization.nonNegotiableItemsPreserved).toBe(true);
    });
  });

  describe('Timeline Optimization Accuracy', () => {
    it('should create conflict-free wedding timeline', async () => {
      const weddingPlanning = {
        weddingDate: new Date('2024-09-14'),
        currentDate: new Date('2024-03-15'), // 6 months to plan
        tasks: [
          { name: 'Book venue', duration: 7, dependencies: [] },
          { name: 'Book catering', duration: 5, dependencies: ['Book venue'] },
          {
            name: 'Send invitations',
            duration: 14,
            dependencies: ['Book venue'],
          },
          { name: 'Order flowers', duration: 3, dependencies: [] },
          {
            name: 'Final headcount',
            duration: 1,
            dependencies: ['Send invitations'],
          },
          {
            name: 'Confirm catering numbers',
            duration: 1,
            dependencies: ['Final headcount'],
          },
        ],
        vendors: [
          { id: 'venue-1', availability: ['weekdays', 'saturdays'] },
          { id: 'caterer-1', leadTime: 14, availability: ['any'] },
          { id: 'florist-1', leadTime: 7, availability: ['weekdays'] },
        ],
      };

      const timeline =
        await recommendationEngine.optimizeTimeline(weddingPlanning);

      // Validate timeline feasibility
      expect(timeline.conflicts).toHaveLength(0);
      expect(timeline.overallFeasibility).toBeGreaterThan(0.95);

      // Validate all tasks scheduled before wedding
      timeline.scheduledTasks.forEach((task) => {
        expect(task.completionDate).toBeLessThanOrEqual(
          weddingPlanning.weddingDate,
        );
      });

      // Validate dependency respect
      const venueTask = timeline.scheduledTasks.find(
        (t) => t.name === 'Book venue',
      );
      const cateringTask = timeline.scheduledTasks.find(
        (t) => t.name === 'Book catering',
      );
      expect(cateringTask.startDate).toBeGreaterThanOrEqual(
        venueTask.completionDate,
      );

      // Validate vendor availability alignment
      const scheduleAccuracy =
        await accuracyValidator.validateTimelineScheduling(
          timeline,
          weddingPlanning,
        );
      expect(scheduleAccuracy.vendorAvailabilityMatch).toBeGreaterThan(0.9);
    });
  });

  describe('Personalization Accuracy', () => {
    it('should personalize recommendations based on couple personality', async () => {
      const introvertedCouple = {
        personalityTraits: ['introverted', 'detail_oriented', 'traditional'],
        socialPreferences: 'intimate',
        planningStyle: 'thorough_research',
        stressResponse: 'needs_clear_guidance',
      };

      const recommendations =
        await recommendationEngine.generatePersonalizedRecommendations(
          introvertedCouple,
        );

      // Validate personality-appropriate recommendations
      recommendations.forEach((rec) => {
        expect(rec.personalizedReasoning).toBeDefined();
        expect(rec.personalizedReasoning).toMatch(
          /intimate|quiet|detailed|traditional/i,
        );

        // Should not suggest high-stress or very public activities
        expect(rec.stressLevel).toBeLessThan(0.5);
        expect(rec.publicityLevel).toBeLessThan(0.4);
      });

      const personalizationScore =
        await accuracyValidator.validatePersonalization(
          recommendations,
          introvertedCouple,
        );
      expect(personalizationScore.alignmentScore).toBeGreaterThan(0.85);
    });
  });
});
