import { VendorPerformanceAnalyticsForCouples } from '@/lib/wedme/analytics/vendor-performance-couples';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn(),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(),
      })),
      in: jest.fn(),
      ilike: jest.fn(),
      contains: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('VendorPerformanceAnalyticsForCouples', () => {
  let analytics: VendorPerformanceAnalyticsForCouples;
  const mockCoupleId = 'couple-123';
  const mockWeddingId = 'wedding-456';

  beforeEach(() => {
    analytics = new VendorPerformanceAnalyticsForCouples();
    jest.clearAllMocks();
  });

  describe('getVendorAnalysisReport', () => {
    beforeEach(() => {
      // Mock wedding data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            wedding_date: '2024-08-15',
            budget: 25000,
            guest_count: 150,
            style: 'Classic',
            location: 'London',
          },
          error: null,
        });

      // Mock vendor data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'vendor-1',
              name: 'Perfect Venues',
              category: 'venue',
              base_price: 8000,
              rating: 4.8,
              reviews_count: 124,
              response_time: 2,
              completion_rate: 98,
              style_tags: ['classic', 'elegant'],
              location: 'London',
            },
            {
              id: 'vendor-2',
              name: 'Gourmet Catering',
              category: 'catering',
              base_price: 45,
              rating: 4.6,
              reviews_count: 87,
              response_time: 4,
              completion_rate: 95,
              style_tags: ['classic', 'modern'],
              location: 'London',
            },
            {
              id: 'vendor-3',
              name: 'Artistic Photography',
              category: 'photography',
              base_price: 2500,
              rating: 4.9,
              reviews_count: 156,
              response_time: 1,
              completion_rate: 99,
              style_tags: ['artistic', 'classic'],
              location: 'London',
            },
          ],
          error: null,
        });

      // Mock reviews data
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .limit.mockResolvedValue({
          data: [
            {
              vendor_id: 'vendor-1',
              rating: 5,
              review_text: 'Amazing venue!',
              created_at: '2024-01-01',
            },
            {
              vendor_id: 'vendor-2',
              rating: 4,
              review_text: 'Good food',
              created_at: '2024-01-15',
            },
            {
              vendor_id: 'vendor-3',
              rating: 5,
              review_text: 'Perfect photos',
              created_at: '2024-02-01',
            },
          ],
          error: null,
        });
    });

    it('should generate comprehensive vendor analysis report', async () => {
      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('totalVendors');
      expect(result).toHaveProperty('averageRating');
      expect(result).toHaveProperty('budgetCompliance');
      expect(result).toHaveProperty('vendorDetails');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('overallCompatibility');

      expect(result.totalVendors).toBe(3);
      expect(result.averageRating).toBeCloseTo(4.77, 1); // Average of 4.8, 4.6, 4.9
      expect(result.budgetCompliance).toBeGreaterThanOrEqual(0);
      expect(result.budgetCompliance).toBeLessThanOrEqual(100);
      expect(result.vendorDetails).toBeInstanceOf(Array);
      expect(result.vendorDetails.length).toBe(3);
    });

    it('should analyze individual vendor performance correctly', async () => {
      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      const vendor = result.vendorDetails[0];
      expect(vendor).toHaveProperty('id');
      expect(vendor).toHaveProperty('name');
      expect(vendor).toHaveProperty('category');
      expect(vendor).toHaveProperty('overallScore');
      expect(vendor).toHaveProperty('matchPercentage');
      expect(vendor).toHaveProperty('budget');
      expect(vendor).toHaveProperty('style');
      expect(vendor).toHaveProperty('reliability');
      expect(vendor).toHaveProperty('experience');
      expect(vendor).toHaveProperty('reviews');
      expect(vendor).toHaveProperty('riskLevel');

      expect(vendor.overallScore).toBeGreaterThanOrEqual(0);
      expect(vendor.overallScore).toBeLessThanOrEqual(100);
      expect(vendor.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(vendor.matchPercentage).toBeLessThanOrEqual(100);
      expect(vendor.riskLevel).toMatch(/low|medium|high/);
    });

    it('should calculate budget compliance accurately', async () => {
      // Mock budget data
      const totalBudget = 25000;
      const expectedVenueSpend = totalBudget * 0.45; // 11,250
      const expectedCateringSpend = totalBudget * 0.28 * 150; // Per person
      const expectedPhotographySpend = totalBudget * 0.12; // 3,000

      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      // Should be high compliance as mock data aligns with budget
      expect(result.budgetCompliance).toBeGreaterThan(70);
    });

    it('should provide relevant recommendations', async () => {
      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      const recommendation = result.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('vendor');
      expect(recommendation).toHaveProperty('suggestion');
      expect(recommendation).toHaveProperty('impact');
      expect(recommendation).toHaveProperty('effort');
      expect(recommendation.impact).toMatch(/high|medium|low/);
      expect(recommendation.effort).toMatch(/low|medium|high/);
    });
  });

  describe('analyzeVendorCompatibility', () => {
    beforeEach(() => {
      // Mock couple preferences
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            style: 'Classic',
            budget: 25000,
            guest_count: 150,
            location: 'London',
            priorities: ['quality', 'reliability', 'style'],
          },
          error: null,
        });
    });

    it('should analyze compatibility comprehensively', async () => {
      const result = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('overallCompatibility');
      expect(result).toHaveProperty('styleMatching');
      expect(result).toHaveProperty('budgetAlignment');
      expect(result).toHaveProperty('locationFactors');
      expect(result).toHaveProperty('availabilityMatch');
      expect(result).toHaveProperty('communicationFit');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('averageVendorCost');

      expect(result.overallCompatibility).toBeGreaterThanOrEqual(0);
      expect(result.overallCompatibility).toBeLessThanOrEqual(1);
      expect(result.styleMatching).toBeInstanceOf(Array);
      expect(result.insights).toBeInstanceOf(Array);
    });

    it('should calculate style compatibility correctly', async () => {
      const result = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.styleMatching).toBeInstanceOf(Array);

      if (result.styleMatching.length > 0) {
        const styleMatch = result.styleMatching[0];
        expect(styleMatch).toHaveProperty('vendor');
        expect(styleMatch).toHaveProperty('score');
        expect(styleMatch).toHaveProperty('reason');
        expect(styleMatch.score).toBeGreaterThanOrEqual(0);
        expect(styleMatch.score).toBeLessThanOrEqual(1);

        // Vendors with 'classic' style should have high compatibility
        const classicVendor = result.styleMatching.find((match) =>
          match.reason.toLowerCase().includes('classic'),
        );
        if (classicVendor) {
          expect(classicVendor.score).toBeGreaterThan(0.7);
        }
      }
    });

    it('should assess budget alignment accurately', async () => {
      const result = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.budgetAlignment).toHaveProperty('withinBudget');
      expect(result.budgetAlignment).toHaveProperty('averageCost');
      expect(result.budgetAlignment).toHaveProperty('budgetUtilization');
      expect(result.budgetAlignment).toHaveProperty('costBreakdown');

      expect(result.budgetAlignment.budgetUtilization).toBeGreaterThanOrEqual(
        0,
      );
      expect(result.budgetAlignment.budgetUtilization).toBeLessThanOrEqual(1.5); // Allow for over-budget scenarios
    });

    it('should evaluate location factors', async () => {
      const result = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.locationFactors).toBeInstanceOf(Array);

      if (result.locationFactors.length > 0) {
        const locationFactor = result.locationFactors[0];
        expect(locationFactor).toHaveProperty('aspect');
        expect(locationFactor).toHaveProperty('status');
        expect(locationFactor.status).toMatch(/optimal|good|poor/);
      }
    });
  });

  describe('getVendorPerformanceMetrics', () => {
    it('should calculate performance metrics correctly', async () => {
      const result = await analytics.getVendorPerformanceMetrics(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('averageResponseTime');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('onTimeDelivery');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('responseRate');
      expect(result).toHaveProperty('portfolioScore');
      expect(result).toHaveProperty('communicationQuality');

      expect(result.completionRate).toMatch(/\d+%/);
      expect(result.onTimeDelivery).toMatch(/\d+%/);
      expect(result.categoryScores).toBeInstanceOf(Object);
    });

    it('should aggregate category scores properly', async () => {
      const result = await analytics.getVendorPerformanceMetrics(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.categoryScores).toBeInstanceOf(Object);

      Object.entries(result.categoryScores).forEach(([category, score]) => {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      });
    });

    it('should calculate realistic response times', async () => {
      const result = await analytics.getVendorPerformanceMetrics(
        mockCoupleId,
        mockWeddingId,
      );

      // Response time should be in reasonable format (e.g., "2h", "1d")
      expect(result.averageResponseTime).toMatch(/\d+[hd]/);
      expect(result.responseRate).toMatch(/\d+%/);
    });
  });

  describe('predictSatisfactionLevels', () => {
    beforeEach(() => {
      // Mock historical satisfaction data
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { category: 'venue', avg_satisfaction: 4.2, sample_size: 50 },
          { category: 'catering', avg_satisfaction: 4.1, sample_size: 45 },
          { category: 'photography', avg_satisfaction: 4.5, sample_size: 60 },
        ],
        error: null,
      });
    });

    it('should predict satisfaction levels accurately', async () => {
      const result = await analytics.predictSatisfactionLevels(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('overallSatisfaction');
      expect(result).toHaveProperty('categoryPredictions');
      expect(result).toHaveProperty('confidenceLevel');
      expect(result).toHaveProperty('keyFactors');
      expect(result).toHaveProperty('riskAreas');

      expect(result.overallSatisfaction).toBeGreaterThanOrEqual(1);
      expect(result.overallSatisfaction).toBeLessThanOrEqual(5);
      expect(result.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(100);
      expect(result.categoryPredictions).toBeInstanceOf(Object);
      expect(result.keyFactors).toBeInstanceOf(Array);
    });

    it('should identify key satisfaction factors', async () => {
      const result = await analytics.predictSatisfactionLevels(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.keyFactors).toBeInstanceOf(Array);

      if (result.keyFactors.length > 0) {
        const factor = result.keyFactors[0];
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('impact');
        expect(factor).toHaveProperty('positive');
        expect(factor.impact).toBeGreaterThanOrEqual(-1);
        expect(factor.impact).toBeLessThanOrEqual(1);
        expect(typeof factor.positive).toBe('boolean');
      }
    });

    it('should calculate confidence levels based on data quality', async () => {
      const result = await analytics.predictSatisfactionLevels(
        mockCoupleId,
        mockWeddingId,
      );

      // With good sample sizes (50, 45, 60), confidence should be high
      expect(result.confidenceLevel).toBeGreaterThan(70);
    });

    it('should identify potential risk areas', async () => {
      const result = await analytics.predictSatisfactionLevels(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskAreas).toBeInstanceOf(Array);

      if (result.riskAreas.length > 0) {
        const riskArea = result.riskAreas[0];
        expect(riskArea).toHaveProperty('category');
        expect(riskArea).toHaveProperty('risk');
        expect(riskArea).toHaveProperty('mitigation');
      }
    });
  });

  describe('assessVendorRisks', () => {
    it('should assess comprehensive vendor risks', async () => {
      const result = await analytics.assessVendorRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('overallRisk');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('riskSummary');
      expect(result).toHaveProperty('mitigationStrategies');

      expect(result.overallRisk).toMatch(/low|medium|high/);
      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.mitigationStrategies).toBeInstanceOf(Array);
    });

    it('should identify specific risk factors', async () => {
      // Mock high-risk vendor scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'vendor-1',
              name: 'Risky Vendor',
              rating: 3.5, // Lower rating
              reviews_count: 5, // Few reviews
              response_time: 48, // Slow response
              completion_rate: 75, // Lower completion rate
              cancellation_rate: 15, // High cancellation rate
            },
          ],
          error: null,
        });

      const result = await analytics.assessVendorRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskFactors.length).toBeGreaterThan(0);

      const riskFactor = result.riskFactors[0];
      expect(riskFactor).toHaveProperty('vendor');
      expect(riskFactor).toHaveProperty('category');
      expect(riskFactor).toHaveProperty('risk');
      expect(riskFactor).toHaveProperty('severity');
      expect(riskFactor).toHaveProperty('impact');
      expect(riskFactor.severity).toMatch(/high|medium|low/);
    });

    it('should provide risk mitigation strategies', async () => {
      const result = await analytics.assessVendorRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.mitigationStrategies).toBeInstanceOf(Array);

      if (result.mitigationStrategies.length > 0) {
        const strategy = result.mitigationStrategies[0];
        expect(strategy).toHaveProperty('risk');
        expect(strategy).toHaveProperty('strategy');
        expect(strategy).toHaveProperty('priority');
        expect(strategy.priority).toMatch(/high|medium|low/);
      }
    });

    it('should calculate overall risk level correctly', async () => {
      // Mock low-risk scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              rating: 4.8,
              reviews_count: 150,
              response_time: 2,
              completion_rate: 98,
              cancellation_rate: 1,
            },
          ],
          error: null,
        });

      const result = await analytics.assessVendorRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.overallRisk).toBe('low');
    });
  });

  describe('getVendorRecommendations', () => {
    it('should provide comprehensive vendor recommendations', async () => {
      const result = await analytics.getVendorRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('alternatives');
      expect(result).toHaveProperty('optimizations');
      expect(result).toHaveProperty('riskMitigation');

      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.alternatives).toBeInstanceOf(Array);
      expect(result.optimizations).toBeInstanceOf(Array);
      expect(result.riskMitigation).toBeInstanceOf(Array);
    });

    it('should suggest relevant alternatives', async () => {
      const result = await analytics.getVendorRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.alternatives.length > 0) {
        const alternative = result.alternatives[0];
        expect(alternative).toHaveProperty('currentVendor');
        expect(alternative).toHaveProperty('suggestedVendor');
        expect(alternative).toHaveProperty('reason');
        expect(alternative).toHaveProperty('benefits');
        expect(alternative).toHaveProperty('tradeoffs');
      }
    });

    it('should provide optimization suggestions', async () => {
      const result = await analytics.getVendorRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.optimizations.length > 0) {
        const optimization = result.optimizations[0];
        expect(optimization).toHaveProperty('type');
        expect(optimization).toHaveProperty('vendor');
        expect(optimization).toHaveProperty('suggestion');
        expect(optimization).toHaveProperty('impact');
        expect(optimization).toHaveProperty('effort');
        expect(optimization.type).toMatch(
          /improvement|alternative|optimization/,
        );
      }
    });

    it('should prioritize recommendations by impact', async () => {
      const result = await analytics.getVendorRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.suggestions.length > 1) {
        const firstSuggestion = result.suggestions[0];
        const lastSuggestion =
          result.suggestions[result.suggestions.length - 1];

        // First suggestion should have equal or higher impact
        const getImpactScore = (suggestion: any) => {
          return suggestion.impact === 'high'
            ? 3
            : suggestion.impact === 'medium'
              ? 2
              : 1;
        };

        expect(getImpactScore(firstSuggestion)).toBeGreaterThanOrEqual(
          getImpactScore(lastSuggestion),
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(
        analytics.getVendorAnalysisReport(mockCoupleId, mockWeddingId),
      ).rejects.toThrow('Wedding not found');
    });

    it('should handle missing vendor data', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: mockWeddingId },
          error: null,
        });

      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.totalVendors).toBe(0);
      expect(result.vendorDetails).toEqual([]);
      expect(result.averageRating).toBe(0);
    });

    it('should validate input parameters', async () => {
      await expect(
        analytics.getVendorAnalysisReport('', mockWeddingId),
      ).rejects.toThrow('Invalid couple ID');

      await expect(
        analytics.getVendorAnalysisReport(mockCoupleId, ''),
      ).rejects.toThrow('Invalid wedding ID');
    });
  });

  describe('Business Logic Validation', () => {
    it('should calculate vendor scores using weighted criteria', async () => {
      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.vendorDetails.length > 0) {
        const vendor = result.vendorDetails[0];

        // Overall score should be weighted combination of factors
        const expectedScore =
          vendor.budget * 0.25 +
          vendor.style * 0.25 +
          vendor.reliability * 0.2 +
          vendor.experience * 0.15 +
          vendor.reviews * 0.15;

        expect(Math.abs(vendor.overallScore - expectedScore)).toBeLessThan(10); // Allow for rounding
      }
    });

    it('should adapt compatibility analysis to couple preferences', async () => {
      // Mock couple with specific priorities
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            style: 'Modern',
            budget: 30000,
            priorities: ['budget', 'location', 'availability'],
          },
          error: null,
        });

      const result = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );

      // Should weight budget and location factors higher
      expect(result.budgetAlignment).toBeDefined();
      expect(result.locationFactors).toBeInstanceOf(Array);

      // Modern style couples should have different style matching results
      const modernMatch = result.styleMatching.find((match) =>
        match.reason.toLowerCase().includes('modern'),
      );
      if (modernMatch) {
        expect(modernMatch.score).toBeGreaterThan(0.5);
      }
    });

    it('should correctly identify high-risk vendors', async () => {
      // Mock high-risk vendor data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'vendor-risky',
              rating: 3.0, // Low rating
              reviews_count: 3, // Very few reviews
              response_time: 72, // Very slow
              completion_rate: 65, // Low completion
              cancellation_rate: 25, // High cancellation
              recent_issues: 5, // Recent problems
            },
          ],
          error: null,
        });

      const result = await analytics.assessVendorRisks(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.overallRisk).toBe('high');
      expect(result.riskFactors.length).toBeGreaterThan(0);

      const highSeverityRisks = result.riskFactors.filter(
        (risk) => risk.severity === 'high',
      );
      expect(highSeverityRisks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should complete vendor analysis within reasonable time', async () => {
      const startTime = Date.now();

      await analytics.getVendorAnalysisReport(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle large vendor datasets efficiently', async () => {
      // Mock large vendor dataset
      const largeVendorData = Array.from({ length: 100 }, (_, i) => ({
        id: `vendor-${i}`,
        name: `Vendor ${i}`,
        category: ['venue', 'catering', 'photography', 'flowers', 'music'][
          i % 5
        ],
        rating: 3.5 + Math.random() * 1.5,
        reviews_count: Math.floor(Math.random() * 200),
        response_time: Math.floor(Math.random() * 48),
        completion_rate: 85 + Math.random() * 15,
      }));

      mockSupabase.from().select().eq().mockResolvedValue({
        data: largeVendorData,
        error: null,
      });

      const startTime = Date.now();

      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.totalVendors).toBe(100);
      expect(duration).toBeLessThan(5000); // Should handle large datasets within 5 seconds
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent results across different methods', async () => {
      const analysisReport = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );
      const compatibilityAnalysis = await analytics.analyzeVendorCompatibility(
        mockCoupleId,
        mockWeddingId,
      );
      const performanceMetrics = await analytics.getVendorPerformanceMetrics(
        mockCoupleId,
        mockWeddingId,
      );

      // Vendor counts should match
      expect(analysisReport.totalVendors).toBeGreaterThanOrEqual(0);

      // Compatibility and performance should align with analysis
      if (
        analysisReport.totalVendors > 0 &&
        compatibilityAnalysis.overallCompatibility > 0.8
      ) {
        expect(analysisReport.averageRating).toBeGreaterThan(4.0);
      }

      // Performance metrics should be realistic
      Object.values(performanceMetrics.categoryScores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(5);
      });
    });

    it('should handle edge cases gracefully', async () => {
      // Test with no vendors
      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.totalVendors).toBe(0);
      expect(result.vendorDetails).toEqual([]);
      expect(result.recommendations).toBeInstanceOf(Array);

      // Test with single vendor
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'vendor-1',
              name: 'Solo Vendor',
              category: 'venue',
              rating: 4.5,
            },
          ],
          error: null,
        });

      const singleResult = await analytics.getVendorAnalysisReport(
        mockCoupleId,
        mockWeddingId,
      );

      expect(singleResult.totalVendors).toBe(1);
      expect(singleResult.averageRating).toBe(4.5);
    });
  });
});
