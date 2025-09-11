/**
 * WS-245 Wedding Budget Optimizer - AI Optimization Validation Tests
 * 
 * CRITICAL: AI recommendations must be accurate, achievable, and respect user constraints.
 * Every optimization must provide measurable cost savings while maintaining wedding quality.
 * 
 * Tests predetermined scenarios with known optimal outcomes to validate AI accuracy.
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  maxE: 9e15,
  minE: -9e15,
  modulo: Decimal.ROUND_DOWN,
  crypto: false
});

// Types for Budget Optimization
interface WeddingBudget {
  id: string;
  organizationId: string;
  totalBudget: Decimal;
  currency: 'GBP' | 'USD' | 'EUR';
  categories: Record<string, Decimal>;
  constraints?: {
    preserveCategories?: string[];
    maxCategoryReduction?: Decimal;
    priorityCategories?: string[];
  };
  weddingDetails?: {
    guestCount: number;
    location: string;
    season: 'peak' | 'shoulder' | 'off-peak';
    style: 'luxury' | 'classic' | 'rustic' | 'modern' | 'intimate';
  };
}

interface OptimizationRecommendation {
  category: string;
  currentAllocation: Decimal;
  recommendedAllocation: Decimal;
  potentialSaving: Decimal;
  reason: string;
  confidenceScore: number;
  alternatives?: {
    vendorName: string;
    price: Decimal;
    quality: 'basic' | 'standard' | 'premium' | 'luxury';
  }[];
  implementationComplexity: 'low' | 'medium' | 'high';
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
}

interface OptimizationResult {
  optimizationId: string;
  totalSavings: Decimal;
  feasibilityScore: number;
  recommendations: OptimizationRecommendation[];
  optimizedCategories: Record<string, Decimal>;
  warnings: string[];
  marketDataUsed: boolean;
  processingTimeMs: number;
}

// Mock AI Budget Optimizer Class
class AIBudgetOptimizer {
  private marketPricingData: Map<string, any> = new Map();
  
  constructor() {
    this.initializeMarketData();
  }

  /**
   * Initialize mock market pricing data for testing
   */
  private initializeMarketData() {
    this.marketPricingData.set('photography-london', {
      category: 'photography',
      region: 'london',
      averagePrice: new Decimal('2800.00'),
      minPrice: new Decimal('800.00'),
      maxPrice: new Decimal('8000.00'),
      qualityTiers: {
        basic: { price: new Decimal('1200.00'), satisfaction: 0.7 },
        standard: { price: new Decimal('2200.00'), satisfaction: 0.85 },
        premium: { price: new Decimal('3500.00'), satisfaction: 0.92 },
        luxury: { price: new Decimal('6000.00'), satisfaction: 0.97 }
      }
    });

    this.marketPricingData.set('venue-london', {
      category: 'venue',
      region: 'london',
      averagePrice: new Decimal('8500.00'),
      minPrice: new Decimal('2000.00'),
      maxPrice: new Decimal('25000.00'),
      qualityTiers: {
        basic: { price: new Decimal('3500.00'), satisfaction: 0.6 },
        standard: { price: new Decimal('6500.00'), satisfaction: 0.8 },
        premium: { price: new Decimal('12000.00'), satisfaction: 0.9 },
        luxury: { price: new Decimal('20000.00'), satisfaction: 0.95 }
      }
    });
  }

  /**
   * Optimize budget with AI recommendations
   */
  async optimizeBudget(
    budget: WeddingBudget, 
    options: {
      targetReduction?: Decimal;
      preserveCategories?: string[];
      maxCategoryReduction?: Decimal;
    } = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // Validate inputs
    if (options.targetReduction && options.targetReduction.isNegative()) {
      throw new Error('Target reduction cannot be negative');
    }

    const recommendations: OptimizationRecommendation[] = [];
    const optimizedCategories = { ...budget.categories };
    let totalSavings = new Decimal('0');
    const warnings: string[] = [];

    // Calculate if budget is too tight
    const minViableBudget = new Decimal('2000.00'); // Minimum for any wedding
    if (budget.totalBudget.lessThan(minViableBudget)) {
      warnings.push('Budget may be insufficient for requirements');
    }

    // Analyze each category for optimization opportunities
    for (const [category, currentAmount] of Object.entries(budget.categories)) {
      if (options.preserveCategories?.includes(category)) {
        continue; // Skip preserved categories
      }

      const marketData = this.getMarketData(category, budget.weddingDetails?.location || 'london');
      if (!marketData) continue;

      const optimizationOpportunity = this.analyzeOptimizationOpportunity(
        category,
        currentAmount,
        marketData,
        budget.weddingDetails
      );

      if (optimizationOpportunity.potentialSaving.greaterThan(new Decimal('0'))) {
        // Ensure we don't exceed max reduction limit
        const maxReduction = options.maxCategoryReduction || new Decimal('0.30');
        const maxSavings = currentAmount.mul(maxReduction);
        
        const actualSaving = Decimal.min(optimizationOpportunity.potentialSaving, maxSavings);
        const newAllocation = currentAmount.minus(actualSaving);

        recommendations.push({
          ...optimizationOpportunity,
          potentialSaving: actualSaving,
          recommendedAllocation: newAllocation
        });

        optimizedCategories[category] = newAllocation;
        totalSavings = totalSavings.plus(actualSaving);
      }
    }

    // Check if we met the target reduction
    const targetReduction = options.targetReduction || new Decimal('0');
    if (targetReduction.greaterThan(totalSavings)) {
      warnings.push(`Could only achieve £${totalSavings.toString()} of £${targetReduction.toString()} target reduction`);
    }

    const processingTime = Date.now() - startTime;

    return {
      optimizationId: 'opt_' + Math.random().toString(36).substr(2, 9),
      totalSavings,
      feasibilityScore: this.calculateFeasibilityScore(budget, totalSavings),
      recommendations,
      optimizedCategories,
      warnings,
      marketDataUsed: true,
      processingTimeMs: processingTime
    };
  }

  /**
   * Generate AI recommendations based on market data
   */
  async generateRecommendations(
    budget: WeddingBudget,
    context: {
      region?: string;
      season?: string;
      guestCount?: number;
      priorities?: string[];
    }
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const [category, amount] of Object.entries(budget.categories)) {
      const marketData = this.getMarketData(category, context.region || 'london');
      if (!marketData) continue;

      // Analyze if current allocation is above market average
      if (amount.greaterThan(marketData.averagePrice)) {
        const potentialSaving = amount.minus(marketData.averagePrice);
        
        recommendations.push({
          category,
          currentAllocation: amount,
          recommendedAllocation: marketData.averagePrice,
          potentialSaving,
          reason: `Current allocation is ${potentialSaving.toString()} above market average`,
          confidenceScore: 0.85,
          alternatives: Object.entries(marketData.qualityTiers).map(([tier, data]: [string, any]) => ({
            vendorName: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${category} Package`,
            price: data.price,
            quality: tier as any
          })),
          implementationComplexity: 'medium',
          qualityImpact: 'minimal'
        });
      }
    }

    return recommendations;
  }

  /**
   * Rebalance budget to prioritize specific categories
   */
  async rebalanceBudget(
    budget: WeddingBudget,
    options: {
      increasePriority: string[];
      decreasePriority: string[];
      maintainTotal: boolean;
    }
  ): Promise<WeddingBudget> {
    const rebalanced = { ...budget };
    const categories = { ...budget.categories };

    if (options.maintainTotal) {
      // Calculate total available from decrease categories
      let totalAvailable = new Decimal('0');
      
      for (const category of options.decreasePriority) {
        if (categories[category]) {
          const reduction = categories[category].mul(new Decimal('0.15')); // 15% reduction
          categories[category] = categories[category].minus(reduction);
          totalAvailable = totalAvailable.plus(reduction);
        }
      }

      // Distribute to increase priority categories
      const increaseCount = options.increasePriority.length;
      const increasePerCategory = totalAvailable.dividedBy(increaseCount);

      for (const category of options.increasePriority) {
        if (categories[category]) {
          categories[category] = categories[category].plus(increasePerCategory);
        }
      }
    }

    rebalanced.categories = categories;
    return rebalanced;
  }

  /**
   * Optimize budget with real-time market data
   */
  async optimizeWithMarketData(
    budget: WeddingBudget,
    context: {
      location: string;
      weddingDate: string;
      guestCount: number;
    }
  ): Promise<OptimizationResult & { regionMultiplier: Decimal; seasonMultiplier: Decimal }> {
    const baseResult = await this.optimizeBudget(budget);
    
    // Add market-specific multipliers
    const regionMultiplier = new Decimal('1.15'); // London premium
    const seasonMultiplier = new Decimal('1.25'); // Peak season
    
    // Apply market adjustments to recommendations
    const adjustedRecommendations = baseResult.recommendations.map(rec => ({
      ...rec,
      marketBasedPricing: {
        averagePrice: rec.recommendedAllocation.mul(regionMultiplier).mul(seasonMultiplier),
        confidence: rec.confidenceScore
      }
    }));

    return {
      ...baseResult,
      recommendations: adjustedRecommendations,
      regionMultiplier,
      seasonMultiplier
    };
  }

  /**
   * Get market data for category and region
   */
  private getMarketData(category: string, region: string = 'london') {
    const key = `${category}-${region.toLowerCase()}`;
    return this.marketPricingData.get(key);
  }

  /**
   * Analyze optimization opportunity for a category
   */
  private analyzeOptimizationOpportunity(
    category: string,
    currentAmount: Decimal,
    marketData: any,
    weddingDetails?: WeddingBudget['weddingDetails']
  ): OptimizationRecommendation {
    // Find best value tier that maintains quality
    const qualityTiers = marketData.qualityTiers;
    let bestTier = 'standard';
    let bestPrice = marketData.averagePrice;
    let reason = 'Market analysis shows competitive alternatives available';

    // Analyze current allocation against market tiers
    for (const [tier, data] of Object.entries(qualityTiers)) {
      const tierData = data as { price: Decimal; satisfaction: number };
      if (currentAmount.greaterThan(tierData.price) && tierData.satisfaction >= 0.8) {
        bestTier = tier;
        bestPrice = tierData.price;
        reason = `${tier.charAt(0).toUpperCase() + tier.slice(1)} tier provides excellent value with ${(tierData.satisfaction * 100).toFixed(0)}% satisfaction`;
      }
    }

    const potentialSaving = currentAmount.minus(bestPrice);
    
    return {
      category,
      currentAllocation: currentAmount,
      recommendedAllocation: bestPrice,
      potentialSaving: potentialSaving.greaterThan(new Decimal('0')) ? potentialSaving : new Decimal('0'),
      reason,
      confidenceScore: 0.89,
      alternatives: Object.entries(qualityTiers).map(([tier, data]: [string, any]) => ({
        vendorName: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${category} Package`,
        price: data.price,
        quality: tier as any
      })),
      implementationComplexity: 'medium',
      qualityImpact: 'minimal'
    };
  }

  /**
   * Calculate feasibility score for optimization
   */
  private calculateFeasibilityScore(budget: WeddingBudget, totalSavings: Decimal): number {
    const savingsPercentage = totalSavings.dividedBy(budget.totalBudget);
    
    // Higher savings = lower feasibility (too good to be true)
    if (savingsPercentage.greaterThan(new Decimal('0.30'))) return 0.3;
    if (savingsPercentage.greaterThan(new Decimal('0.20'))) return 0.6;
    if (savingsPercentage.greaterThan(new Decimal('0.10'))) return 0.8;
    
    return 0.92;
  }
}

// Test Data Factory
const createTestBudget = (overrides: Partial<WeddingBudget> = {}): WeddingBudget => ({
  id: 'test-budget-123',
  organizationId: 'org-123',
  totalBudget: new Decimal('25000.00'),
  currency: 'GBP',
  categories: {
    venue: new Decimal('8000.00'),
    catering: new Decimal('6000.00'),
    photography: new Decimal('3000.00'),
    flowers: new Decimal('1500.00'),
    music: new Decimal('2000.00'),
    dress: new Decimal('1500.00'),
    rings: new Decimal('2000.00'),
    miscellaneous: new Decimal('1000.00')
  },
  weddingDetails: {
    guestCount: 100,
    location: 'london',
    season: 'peak',
    style: 'classic'
  },
  ...overrides
});

describe('WS-245 AI Budget Optimization Validation Tests', () => {
  let optimizer: AIBudgetOptimizer;

  beforeEach(() => {
    optimizer = new AIBudgetOptimizer();
  });

  describe('Predetermined Test Scenarios', () => {
    test('optimizes over-budget scenario with measurable savings', async () => {
      const overBudgetScenario = createTestBudget({
        totalBudget: new Decimal('25000.00'),
        categories: {
          venue: new Decimal('10000.00'), // Over-allocated
          catering: new Decimal('8000.00'), // Over-allocated
          photography: new Decimal('3000.00'),
          flowers: new Decimal('2000.00'),
          music: new Decimal('1500.00'),
          dress: new Decimal('1000.00'),
          rings: new Decimal('1500.00'),
          miscellaneous: new Decimal('500.00')
        }
      });

      const result = await optimizer.optimizeBudget(overBudgetScenario, {
        targetReduction: new Decimal('2000.00'),
        preserveCategories: ['photography'], // Don't touch photography
        maxCategoryReduction: new Decimal('0.20') // Max 20% reduction
      });

      // Validate optimization results
      expect(result.totalSavings.greaterThan(new Decimal('0'))).toBe(true);
      expect(result.totalSavings.lessThanOrEqualTo(new Decimal('2000.00'))).toBe(true);
      
      // Photography should be preserved
      expect(result.optimizedCategories.photography.equals(overBudgetScenario.categories.photography)).toBe(true);
      
      // No category should be reduced by more than 20%
      for (const [category, optimizedAmount] of Object.entries(result.optimizedCategories)) {
        if (category !== 'photography') {
          const originalAmount = overBudgetScenario.categories[category];
          const reduction = originalAmount.minus(optimizedAmount);
          const reductionPercent = reduction.dividedBy(originalAmount);
          
          expect(reductionPercent.lessThanOrEqualTo(new Decimal('0.20'))).toBe(true);
        }
      }

      // Feasibility score should be reasonable
      expect(result.feasibilityScore).toBeGreaterThan(0.5);
      expect(result.feasibilityScore).toBeLessThanOrEqualTo(1.0);
    });

    test('identifies cost-effective alternatives with confidence scores', async () => {
      const budget = createTestBudget({
        categories: {
          venue: new Decimal('12000.00'), // Above market average
          catering: new Decimal('6000.00'),
          photography: new Decimal('4000.00'), // Above market average
          flowers: new Decimal('1500.00'),
          music: new Decimal('2000.00'),
          dress: new Decimal('1500.00'),
          rings: new Decimal('2000.00'),
          miscellaneous: new Decimal('1000.00')
        }
      });

      const recommendations = await optimizer.generateRecommendations(budget, {
        region: 'london',
        season: 'peak',
        guestCount: 100,
        priorities: ['photography', 'venue', 'catering']
      });

      expect(recommendations.length).toBeGreaterThan(0);
      
      recommendations.forEach(rec => {
        // Each recommendation must have valid financial data
        expect(rec.potentialSaving).toBeInstanceOf(Decimal);
        expect(rec.potentialSaving.greaterThan(new Decimal('0'))).toBe(true);
        expect(rec.confidenceScore).toBeGreaterThan(0);
        expect(rec.confidenceScore).toBeLessThanOrEqualTo(1);
        
        // Must have alternatives
        expect(rec.alternatives).toBeDefined();
        expect(rec.alternatives!.length).toBeGreaterThan(0);
        
        // Each alternative must have valid pricing
        rec.alternatives!.forEach(alt => {
          expect(alt.price).toBeInstanceOf(Decimal);
          expect(['basic', 'standard', 'premium', 'luxury']).toContain(alt.quality);
        });
      });
    });

    test('validates budget rebalancing maintains total', async () => {
      const budget = createTestBudget();
      const originalTotal = budget.totalBudget;
      
      const rebalanced = await optimizer.rebalanceBudget(budget, {
        increasePriority: ['photography', 'venue'],
        decreasePriority: ['flowers', 'miscellaneous'],
        maintainTotal: true
      });

      // Photography and venue allocations should increase
      expect(rebalanced.categories.photography.greaterThan(budget.categories.photography)).toBe(true);
      expect(rebalanced.categories.venue.greaterThan(budget.categories.venue)).toBe(true);
      
      // Flowers and misc should decrease
      expect(rebalanced.categories.flowers.lessThan(budget.categories.flowers)).toBe(true);
      expect(rebalanced.categories.miscellaneous.lessThan(budget.categories.miscellaneous)).toBe(true);
      
      // Total budget must remain the same
      const rebalancedTotal = Object.values(rebalanced.categories)
        .reduce((sum, amount) => sum.plus(amount), new Decimal('0'));
      
      expect(rebalancedTotal.equals(originalTotal)).toBe(true);
    });
  });

  describe('Market Data Integration', () => {
    test('incorporates real-time market pricing with regional multipliers', async () => {
      const budget = createTestBudget();
      
      const marketAwareOptimization = await optimizer.optimizeWithMarketData(budget, {
        location: 'london',
        weddingDate: '2025-06-15', // Peak season
        guestCount: 120
      });

      // Verify market data was considered
      expect(marketAwareOptimization.marketDataUsed).toBe(true);
      expect(marketAwareOptimization.regionMultiplier.toString()).toBe('1.15');
      expect(marketAwareOptimization.seasonMultiplier.toString()).toBe('1.25');
      
      // Recommendations should reflect market conditions
      marketAwareOptimization.recommendations.forEach(rec => {
        expect(rec.marketBasedPricing).toBeDefined();
        expect(rec.marketBasedPricing.averagePrice).toBeInstanceOf(Decimal);
        expect(rec.marketBasedPricing.confidence).toBeGreaterThan(0);
      });
    });

    test('adjusts recommendations based on seasonal pricing', async () => {
      const peakSeasonBudget = createTestBudget({
        weddingDetails: {
          guestCount: 100,
          location: 'london',
          season: 'peak',
          style: 'classic'
        }
      });

      const offPeakBudget = createTestBudget({
        weddingDetails: {
          guestCount: 100,
          location: 'london',
          season: 'off-peak',
          style: 'classic'
        }
      });

      const peakRecommendations = await optimizer.generateRecommendations(peakSeasonBudget, {
        region: 'london',
        season: 'peak'
      });

      const offPeakRecommendations = await optimizer.generateRecommendations(offPeakBudget, {
        region: 'london',
        season: 'off-peak'
      });

      // Both should have recommendations (testing market data exists)
      expect(peakRecommendations.length).toBeGreaterThan(0);
      expect(offPeakRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Case Handling', () => {
    test('handles impossible optimization requests gracefully', async () => {
      const tightBudget = createTestBudget({
        totalBudget: new Decimal('1000.00'), // Extremely tight budget
        categories: {
          venue: new Decimal('500.00'),
          catering: new Decimal('300.00'),
          photography: new Decimal('200.00'),
          flowers: new Decimal('0.00'),
          music: new Decimal('0.00'),
          dress: new Decimal('0.00'),
          rings: new Decimal('0.00'),
          miscellaneous: new Decimal('0.00')
        }
      });

      const result = await optimizer.optimizeBudget(tightBudget, {
        targetReduction: new Decimal('0.00'),
        preserveCategories: ['venue', 'catering', 'photography']
      });

      expect(result.warnings).toContain('Budget may be insufficient for requirements');
      expect(result.feasibilityScore).toBeLessThan(0.5);
    });

    test('prevents negative target reductions', async () => {
      const budget = createTestBudget();

      await expect(optimizer.optimizeBudget(budget, {
        targetReduction: new Decimal('-1000.00') // Negative reduction
      })).rejects.toThrow('Target reduction cannot be negative');
    });

    test('handles zero budget categories gracefully', async () => {
      const budgetWithZeros = createTestBudget({
        categories: {
          venue: new Decimal('10000.00'),
          catering: new Decimal('8000.00'),
          photography: new Decimal('7000.00'),
          flowers: new Decimal('0.00'), // Zero allocation
          music: new Decimal('0.00'),   // Zero allocation
          dress: new Decimal('0.00'),   // Zero allocation
          rings: new Decimal('0.00'),   // Zero allocation
          miscellaneous: new Decimal('0.00') // Zero allocation
        }
      });

      const result = await optimizer.optimizeBudget(budgetWithZeros);

      // Should not crash and should provide valid recommendations for non-zero categories
      expect(result.recommendations).toBeDefined();
      expect(result.totalSavings.greaterThanOrEqualTo(new Decimal('0'))).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    test('completes optimization within performance threshold', async () => {
      const budget = createTestBudget();
      const startTime = Date.now();
      
      const result = await optimizer.optimizeBudget(budget);
      
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      
      // Should complete within 2 seconds (2000ms)
      expect(actualDuration).toBeLessThan(2000);
      expect(result.processingTimeMs).toBeLessThan(2000);
    });

    test('handles concurrent optimization requests', async () => {
      const budgets = Array.from({ length: 5 }, (_, i) => 
        createTestBudget({
          id: `test-budget-${i}`,
          totalBudget: new Decimal((20000 + i * 5000).toString())
        })
      );

      const startTime = Date.now();
      
      // Run optimizations concurrently
      const results = await Promise.all(
        budgets.map(budget => optimizer.optimizeBudget(budget))
      );

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // All optimizations should complete
      expect(results).toHaveLength(5);
      
      // Should handle concurrency efficiently (not 5x slower than single)
      expect(totalDuration).toBeLessThan(5000);
      
      // Each result should be valid
      results.forEach(result => {
        expect(result.optimizationId).toBeDefined();
        expect(result.totalSavings).toBeInstanceOf(Decimal);
        expect(result.feasibilityScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Quality Assurance', () => {
    test('validates recommendation quality and implementability', async () => {
      const budget = createTestBudget();
      const recommendations = await optimizer.generateRecommendations(budget, {
        region: 'london',
        priorities: ['photography', 'venue']
      });

      recommendations.forEach(rec => {
        // Confidence should be reasonable (not overconfident)
        expect(rec.confidenceScore).toBeGreaterThanOrEqual(0.5);
        expect(rec.confidenceScore).toBeLessThanOrEqualTo(0.95);
        
        // Potential savings should be realistic (not too good to be true)
        const savingsPercent = rec.potentialSaving.dividedBy(rec.currentAllocation);
        expect(savingsPercent.lessThanOrEqualTo(new Decimal('0.50'))).toBe(true); // Max 50% savings
        
        // Implementation complexity should be assessed
        expect(['low', 'medium', 'high']).toContain(rec.implementationComplexity);
        expect(['none', 'minimal', 'moderate', 'significant']).toContain(rec.qualityImpact);
        
        // Reason should be meaningful
        expect(rec.reason.length).toBeGreaterThan(10);
        expect(rec.reason).not.toMatch(/lorem ipsum|test|placeholder/i);
      });
    });

    test('ensures total budget integrity in all optimizations', async () => {
      const budget = createTestBudget();
      const result = await optimizer.optimizeBudget(budget);
      
      // Calculate total of optimized categories
      const optimizedTotal = Object.values(result.optimizedCategories)
        .reduce((sum, amount) => sum.plus(amount), new Decimal('0'));
      
      // Total savings should equal the reduction
      const expectedTotal = budget.totalBudget.minus(result.totalSavings);
      
      expect(optimizedTotal.equals(expectedTotal)).toBe(true);
    });
  });
});

export { AIBudgetOptimizer, createTestBudget };