import { BudgetOptimizationSystem } from '@/lib/wedme/analytics/budget-optimization';
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
    })),
  })),
  rpc: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('BudgetOptimizationSystem', () => {
  let system: BudgetOptimizationSystem;
  const mockCoupleId = 'couple-123';
  const mockWeddingId = 'wedding-456';

  beforeEach(() => {
    system = new BudgetOptimizationSystem();
    jest.clearAllMocks();
  });

  describe('analyzeBudgetHealth', () => {
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
            location: 'London',
            guest_count: 150,
          },
          error: null,
        });

      // Mock budget data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 11250, status: 'confirmed' }, // 45% of budget
            { category: 'catering', amount: 7000, status: 'confirmed' }, // 28% of budget
            { category: 'photography', amount: 3000, status: 'confirmed' }, // 12% of budget
            { category: 'flowers', amount: 1250, status: 'pending' }, // 5% of budget
            { category: 'music', amount: 1000, status: 'pending' }, // 4% of budget
          ],
          error: null,
        });
    });

    it('should analyze budget health correctly', async () => {
      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('totalBudget');
      expect(result).toHaveProperty('spentAmount');
      expect(result).toHaveProperty('remainingBudget');
      expect(result).toHaveProperty('healthScore');
      expect(result).toHaveProperty('optimizationScore');
      expect(result).toHaveProperty('riskFactors');
      expect(result).toHaveProperty('quickWins');
      expect(result).toHaveProperty('potentialSavings');
      expect(result).toHaveProperty('savingsOpportunities');

      expect(result.totalBudget).toBe(25000);
      expect(result.spentAmount).toBe(23500); // Sum of all amounts
      expect(result.remainingBudget).toBe(1500);
      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate optimization score correctly', async () => {
      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
      expect(result.optimizationScore).toBeLessThanOrEqual(100);

      // Should be high since spending aligns with industry standards
      expect(result.optimizationScore).toBeGreaterThan(70);
    });

    it('should identify budget risk factors', async () => {
      // Mock over-budget scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 15000, status: 'confirmed' }, // 60% (over recommended 45%)
            { category: 'catering', amount: 10000, status: 'confirmed' }, // 40% (over recommended 28%)
            { category: 'photography', amount: 3000, status: 'confirmed' },
          ],
          error: null,
        });

      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.riskFactors.length).toBeGreaterThan(0);

      const venueRisk = result.riskFactors.find(
        (risk) => risk.category === 'venue',
      );
      expect(venueRisk).toBeDefined();
      if (venueRisk) {
        expect(venueRisk.severity).toBe('high');
      }
    });

    it('should suggest quick wins for optimization', async () => {
      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.quickWins).toBeInstanceOf(Array);
      expect(result.quickWins.length).toBeGreaterThan(0);

      result.quickWins.forEach((win) => {
        expect(typeof win).toBe('string');
        expect(win.length).toBeGreaterThan(0);
      });
    });

    it('should calculate potential savings accurately', async () => {
      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.potentialSavings).toBeGreaterThanOrEqual(0);
      expect(result.savingsOpportunities).toBeInstanceOf(Array);

      if (result.savingsOpportunities.length > 0) {
        const opportunity = result.savingsOpportunities[0];
        expect(opportunity).toHaveProperty('title');
        expect(opportunity).toHaveProperty('description');
        expect(opportunity).toHaveProperty('potentialSaving');
        expect(opportunity).toHaveProperty('effort');
        expect(opportunity.effort).toMatch(/low|medium|high/);
      }
    });
  });

  describe('analyzeSpendingPatterns', () => {
    beforeEach(() => {
      // Mock spending history
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .mockResolvedValue({
          data: [
            {
              amount: 5000,
              category: 'venue',
              created_at: '2024-01-15',
              description: 'Venue deposit',
            },
            {
              amount: 3000,
              category: 'photography',
              created_at: '2024-02-01',
              description: 'Photography package',
            },
            {
              amount: 2000,
              category: 'catering',
              created_at: '2024-02-15',
              description: 'Catering deposit',
            },
            {
              amount: 1500,
              category: 'flowers',
              created_at: '2024-03-01',
              description: 'Floral arrangements',
            },
            {
              amount: 1000,
              category: 'music',
              created_at: '2024-03-15',
              description: 'DJ services',
            },
          ],
          error: null,
        });
    });

    it('should analyze spending patterns correctly', async () => {
      const result = await system.analyzeSpendingPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('monthlySpending');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result).toHaveProperty('spendingTrend');
      expect(result).toHaveProperty('averageTransaction');
      expect(result).toHaveProperty('largestExpenses');

      expect(result.totalSpent).toBe(12500);
      expect(result.monthlySpending).toBeInstanceOf(Array);
      expect(result.categoryBreakdown).toBeInstanceOf(Object);
    });

    it('should calculate monthly spending correctly', async () => {
      const result = await system.analyzeSpendingPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.monthlySpending).toBeInstanceOf(Array);

      const januarySpending = result.monthlySpending.find(
        (month) =>
          month.month.includes('January') || month.month.includes('2024-01'),
      );

      if (januarySpending) {
        expect(januarySpending.amount).toBe(5000);
      }
    });

    it('should identify spending trends', async () => {
      const result = await system.analyzeSpendingPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.spendingTrend).toMatch(/increasing|decreasing|stable/);
      expect(result.averageTransaction).toBeGreaterThan(0);
    });

    it('should identify largest expenses', async () => {
      const result = await system.analyzeSpendingPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.largestExpenses).toBeInstanceOf(Array);
      expect(result.largestExpenses.length).toBeGreaterThan(0);

      const largestExpense = result.largestExpenses[0];
      expect(largestExpense).toHaveProperty('amount');
      expect(largestExpense).toHaveProperty('category');
      expect(largestExpense).toHaveProperty('description');
      expect(largestExpense.amount).toBe(5000); // Venue should be largest
    });
  });

  describe('getSeasonalPricingInsights', () => {
    beforeEach(() => {
      // Mock wedding in peak season (August)
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: '2024-08-15',
            location: 'London',
            style: 'Classic',
          },
          error: null,
        });
    });

    it('should provide seasonal pricing insights', async () => {
      const result = await system.getSeasonalPricingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('weddingMonth');
      expect(result).toHaveProperty('seasonalMultipliers');
      expect(result).toHaveProperty('categoryImpacts');
      expect(result).toHaveProperty('bestSavingMonths');
      expect(result).toHaveProperty('peakSurcharges');

      expect(result.weddingMonth).toBe('august');
      expect(result.seasonalMultipliers).toBeInstanceOf(Object);
      expect(result.categoryImpacts).toBeInstanceOf(Object);
      expect(result.bestSavingMonths).toBeInstanceOf(Array);
    });

    it('should correctly identify peak season pricing', async () => {
      const result = await system.getSeasonalPricingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      // August is peak wedding season
      const augustMultiplier = result.seasonalMultipliers.august;
      expect(augustMultiplier).toBeGreaterThan(1.0);
      expect(augustMultiplier).toBeLessThanOrEqual(1.5);
    });

    it('should suggest best saving months', async () => {
      const result = await system.getSeasonalPricingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.bestSavingMonths).toBeInstanceOf(Array);
      expect(result.bestSavingMonths.length).toBeGreaterThan(0);

      const savingMonth = result.bestSavingMonths[0];
      expect(savingMonth).toHaveProperty('month');
      expect(savingMonth).toHaveProperty('savings');
      expect(savingMonth.savings).toBeGreaterThan(0);
    });

    it('should calculate category-specific seasonal impacts', async () => {
      const result = await system.getSeasonalPricingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.categoryImpacts).toBeInstanceOf(Object);

      const venueImpact = result.categoryImpacts.venue;
      expect(venueImpact).toBeDefined();
      expect(venueImpact).toHaveProperty('multiplier');
      expect(venueImpact).toHaveProperty('reason');
      expect(venueImpact.multiplier).toBeGreaterThan(0);
    });
  });

  describe('getOptimizationRecommendations', () => {
    beforeEach(() => {
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 15000, status: 'pending' }, // Over-budget
            { category: 'catering', amount: 8000, status: 'confirmed' },
            { category: 'photography', amount: 5000, status: 'pending' }, // Over-budget
          ],
          error: null,
        });
    });

    it('should provide optimization recommendations', async () => {
      const result = await system.getOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const recommendation = result[0];
      expect(recommendation).toHaveProperty('category');
      expect(recommendation).toHaveProperty('suggestion');
      expect(recommendation).toHaveProperty('potentialSaving');
      expect(recommendation).toHaveProperty('difficulty');
      expect(recommendation).toHaveProperty('impact');
      expect(recommendation.difficulty).toMatch(/easy|medium|hard/);
      expect(recommendation.impact).toMatch(/high|medium|low/);
    });

    it('should prioritize high-impact recommendations', async () => {
      const result = await system.getOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      const highImpactRecs = result.filter((rec) => rec.impact === 'high');
      const mediumImpactRecs = result.filter((rec) => rec.impact === 'medium');

      // High impact recommendations should come first
      if (result.length > 1) {
        const firstRec = result[0];
        expect(['high', 'medium'].includes(firstRec.impact)).toBe(true);
      }
    });

    it('should suggest realistic savings amounts', async () => {
      const result = await system.getOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((rec) => {
        expect(rec.potentialSaving).toBeGreaterThan(0);
        expect(rec.potentialSaving).toBeLessThan(10000); // Realistic savings
      });
    });
  });

  describe('analyzeCategorySpending', () => {
    it('should analyze category spending distribution', async () => {
      const result = await system.analyzeCategorySpending(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('totalSpent');
      expect(result).toHaveProperty('industryComparison');
      expect(result).toHaveProperty('overBudgetCategories');
      expect(result).toHaveProperty('underBudgetCategories');

      expect(result.categories).toBeInstanceOf(Object);
      expect(result.overBudgetCategories).toBeInstanceOf(Array);
      expect(result.underBudgetCategories).toBeInstanceOf(Array);
    });

    it('should compare against industry standards', async () => {
      const result = await system.analyzeCategorySpending(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.industryComparison).toBeInstanceOf(Object);

      const venueComparison = result.industryComparison.venue;
      if (venueComparison) {
        expect(venueComparison).toHaveProperty('actual');
        expect(venueComparison).toHaveProperty('industry');
        expect(venueComparison).toHaveProperty('variance');
      }
    });

    it('should identify over and under budget categories', async () => {
      // Mock over-budget venue scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 15000, status: 'confirmed' }, // 60% (over 45% standard)
            { category: 'catering', amount: 5000, status: 'confirmed' }, // 20% (under 28% standard)
            { category: 'photography', amount: 3000, status: 'confirmed' },
          ],
          error: null,
        });

      const result = await system.analyzeCategorySpending(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.overBudgetCategories.length).toBeGreaterThan(0);
      expect(result.underBudgetCategories.length).toBeGreaterThan(0);

      const venueOverBudget = result.overBudgetCategories.find(
        (cat) => cat.category === 'venue',
      );
      expect(venueOverBudget).toBeDefined();
    });
  });

  describe('generateBudgetForecast', () => {
    beforeEach(() => {
      // Mock future wedding date
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);

      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: futureDate.toISOString(),
            budget: 25000,
          },
          error: null,
        });

      // Mock pending expenses
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 5000, status: 'pending' },
            { category: 'catering', amount: 3000, status: 'pending' },
            { category: 'photography', amount: 2000, status: 'pending' },
          ],
          error: null,
        });
    });

    it('should generate accurate budget forecast', async () => {
      const result = await system.generateBudgetForecast(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('projectedTotal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('monthlyForecast');
      expect(result).toHaveProperty('monthlyBreakdown');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('dataPoints');

      expect(result.projectedTotal).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.monthlyForecast).toBeInstanceOf(Array);
    });

    it('should assess forecast confidence correctly', async () => {
      const result = await system.generateBudgetForecast(
        mockCoupleId,
        mockWeddingId,
      );

      // With sufficient data points, confidence should be reasonable
      expect(result.confidence).toBeGreaterThan(60);
      expect(result.dataPoints).toBeGreaterThan(0);
    });

    it('should identify budget risks in forecast', async () => {
      // Mock over-budget scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 15000, status: 'pending' },
            { category: 'catering', amount: 12000, status: 'pending' },
            { category: 'photography', amount: 5000, status: 'pending' },
          ],
          error: null,
        });

      const result = await system.generateBudgetForecast(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.riskLevel).toMatch(/high|medium|low/);

      if (result.projectedTotal > 25000) {
        expect(result.riskLevel).toBe('high');
      }
    });
  });

  describe('getIndustryStandards', () => {
    it('should return valid industry standards', () => {
      const standards = system.getIndustryStandards();

      expect(standards).toBeInstanceOf(Object);

      // Check key categories exist
      expect(standards).toHaveProperty('venue');
      expect(standards).toHaveProperty('catering');
      expect(standards).toHaveProperty('photography');
      expect(standards).toHaveProperty('flowers');
      expect(standards).toHaveProperty('music');

      // Validate structure
      Object.values(standards).forEach((standard) => {
        expect(standard).toHaveProperty('typicalPercentage');
        expect(standard).toHaveProperty('seasonalVariation');
        expect(standard.typicalPercentage).toBeGreaterThan(0);
        expect(standard.seasonalVariation).toBeGreaterThan(0);
      });

      // Validate percentages roughly add up to 100%
      const totalPercentage = Object.values(standards).reduce(
        (sum, std) => sum + std.typicalPercentage,
        0,
      );
      expect(totalPercentage).toBeGreaterThan(90);
      expect(totalPercentage).toBeLessThan(110);
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
        system.analyzeBudgetHealth(mockCoupleId, mockWeddingId),
      ).rejects.toThrow('Wedding not found');
    });

    it('should handle missing budget data', async () => {
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

      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.totalBudget).toBe(25000); // Default budget
      expect(result.spentAmount).toBe(0);
      expect(result.remainingBudget).toBe(25000);
    });

    it('should validate input parameters', async () => {
      await expect(
        system.analyzeBudgetHealth('', mockWeddingId),
      ).rejects.toThrow('Invalid couple ID');

      await expect(
        system.analyzeBudgetHealth(mockCoupleId, ''),
      ).rejects.toThrow('Invalid wedding ID');
    });
  });

  describe('Business Logic Validation', () => {
    it('should correctly calculate budget health scores', async () => {
      // Test perfect budget scenario
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { category: 'venue', amount: 11250, status: 'confirmed' }, // Exactly 45%
            { category: 'catering', amount: 7000, status: 'confirmed' }, // Exactly 28%
            { category: 'photography', amount: 3000, status: 'confirmed' }, // Exactly 12%
          ],
          error: null,
        });

      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.healthScore).toBeGreaterThan(80); // Should be high
      expect(result.optimizationScore).toBeGreaterThan(85); // Should be very high
    });

    it('should apply seasonal adjustments correctly', async () => {
      // Test December wedding (off-season)
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            wedding_date: '2024-12-15',
            location: 'London',
          },
          error: null,
        });

      const result = await system.getSeasonalPricingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      const decemberMultiplier = result.seasonalMultipliers.december;
      expect(decemberMultiplier).toBeLessThan(1.0); // Off-season discount
    });

    it('should prioritize recommendations by ROI', async () => {
      const result = await system.getOptimizationRecommendations(
        mockCoupleId,
        mockWeddingId,
      );

      if (result.length > 1) {
        // First recommendation should have good ROI (high impact, easy difficulty)
        const firstRec = result[0];
        const lastRec = result[result.length - 1];

        // Calculate simple ROI score
        const getROIScore = (rec: any) => {
          const impactScore =
            rec.impact === 'high' ? 3 : rec.impact === 'medium' ? 2 : 1;
          const difficultyScore =
            rec.difficulty === 'easy' ? 3 : rec.difficulty === 'medium' ? 2 : 1;
          return impactScore * difficultyScore + rec.potentialSaving / 1000;
        };

        expect(getROIScore(firstRec)).toBeGreaterThanOrEqual(
          getROIScore(lastRec),
        );
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete budget analysis within reasonable time', async () => {
      const startTime = Date.now();

      await system.analyzeBudgetHealth(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle complex budget calculations efficiently', async () => {
      // Mock complex budget with many categories
      const complexBudgetData = Array.from({ length: 50 }, (_, i) => ({
        category: `category-${i}`,
        amount: Math.random() * 2000,
        status: i % 2 === 0 ? 'confirmed' : 'pending',
      }));

      mockSupabase.from().select().eq().mockResolvedValue({
        data: complexBudgetData,
        error: null,
      });

      const startTime = Date.now();

      const result = await system.analyzeBudgetHealth(
        mockCoupleId,
        mockWeddingId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should handle complexity within 3 seconds
    });
  });
});
