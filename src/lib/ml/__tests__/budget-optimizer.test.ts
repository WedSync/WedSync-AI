/**
 * WS-232 Predictive Modeling System - Budget Optimizer Tests
 * Comprehensive test suite for wedding budget optimization accuracy and financial calculations
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  jest,
} from '@jest/globals';
import { BudgetOptimizer } from '../predictors/budget-optimizer';
import {
  TEST_CONFIG,
  WEDDING_TEST_DATA,
  generateTestWedding,
  generateTestDataset,
  measureExecutionTime,
  calculateAccuracy,
  calculateMeanAbsoluteError,
  calculateRootMeanSquareError,
  withinTolerance,
  MOCK_WEDDING_DATA,
} from './test-config';

describe('BudgetOptimizer', () => {
  let optimizer: BudgetOptimizer;
  let testStartTime: number;

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    optimizer = new BudgetOptimizer({
      modelId: 'budget-optimizer-test',
      version: '1.0.0-test',
      cacheEnabled: false,
      loggingEnabled: false,
      precision: 'high', // Use high precision for testing
    });
    testStartTime = Date.now();
  });

  afterEach(() => {
    const testDuration = Date.now() - testStartTime;
    if (testDuration > 15000) {
      // 15 seconds for budget calculations
      console.warn(
        `Budget optimization test took ${testDuration}ms - may need optimization`,
      );
    }
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultOptimizer = new BudgetOptimizer();
      expect(defaultOptimizer).toBeDefined();
      expect(defaultOptimizer.getModelInfo().modelId).toBe(
        'budget-optimizer-v1',
      );
    });

    test('should initialize with custom precision settings', () => {
      const highPrecisionOptimizer = new BudgetOptimizer({
        precision: 'high',
        currencyCode: 'GBP',
        roundingMode: 'nearest',
      });
      expect(highPrecisionOptimizer.getModelInfo().precision).toBe('high');
    });

    test('should validate budget range configuration', () => {
      expect(() => {
        new BudgetOptimizer({
          minBudget: -1000, // Invalid negative budget
        });
      }).toThrow('Minimum budget must be positive');

      expect(() => {
        new BudgetOptimizer({
          minBudget: 50000,
          maxBudget: 10000, // Max less than min
        });
      }).toThrow('Maximum budget must be greater than minimum budget');
    });
  });

  describe('Budget Data Validation', () => {
    test('should validate basic budget input structure', async () => {
      const invalidInput = {
        totalBudget: 'not-a-number',
        guestCount: 100,
      };

      await expect(optimizer.optimize(invalidInput as any)).rejects.toThrow(
        'Invalid budget input: totalBudget must be a positive number',
      );
    });

    test('should validate budget ranges', async () => {
      // Test minimum budget
      await expect(
        optimizer.optimize({
          totalBudget: 500, // Too low
          guestCount: 100,
          region: 'london',
          venueType: 'indoor',
        }),
      ).rejects.toThrow('Budget below minimum threshold');

      // Test maximum budget
      await expect(
        optimizer.optimize({
          totalBudget: 500000, // Too high for standard optimization
          guestCount: 100,
          region: 'london',
          venueType: 'indoor',
        }),
      ).rejects.toThrow('Budget above maximum threshold');
    });

    test('should validate guest count constraints', async () => {
      await expect(
        optimizer.optimize({
          totalBudget: 25000,
          guestCount: 0, // Invalid
          region: 'london',
          venueType: 'indoor',
        }),
      ).rejects.toThrow('Guest count must be positive');

      await expect(
        optimizer.optimize({
          totalBudget: 25000,
          guestCount: 1000, // Unrealistic for most venues
          region: 'london',
          venueType: 'indoor',
        }),
      ).rejects.toThrow('Guest count exceeds reasonable limits');
    });

    test('should validate currency and region compatibility', async () => {
      await expect(
        optimizer.optimize({
          totalBudget: 25000,
          guestCount: 100,
          region: 'invalid-region',
          venueType: 'indoor',
          currency: 'USD',
        }),
      ).rejects.toThrow('Invalid region or unsupported currency combination');
    });

    test('should handle missing optional parameters gracefully', async () => {
      const minimalInput = {
        totalBudget: 25000,
        guestCount: 100,
      };

      const result = await optimizer.optimize(minimalInput);

      expect(result).toBeDefined();
      expect(result.optimizedBudget).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.categories).toHaveLength(8); // Standard categories
    });
  });

  describe('Budget Category Allocation', () => {
    const standardBudgetTest = {
      totalBudget: 30000,
      guestCount: 120,
      region: 'london',
      venueType: 'indoor' as const,
      weddingMonth: 6, // June - peak season
    };

    test('should allocate budget across all standard categories', async () => {
      const result = await optimizer.optimize(standardBudgetTest);

      expect(result.categories).toHaveLength(8);

      const categoryNames = result.categories.map((cat) => cat.category);
      expect(categoryNames).toContain('venue');
      expect(categoryNames).toContain('catering');
      expect(categoryNames).toContain('photography');
      expect(categoryNames).toContain('flowers');
      expect(categoryNames).toContain('music');
      expect(categoryNames).toContain('attire');
      expect(categoryNames).toContain('transport');
      expect(categoryNames).toContain('other');

      // Verify allocation percentages sum to approximately 100%
      const totalPercentage = result.categories.reduce(
        (sum, cat) => sum + cat.percentage,
        0,
      );
      expect(totalPercentage).toBeCloseTo(100, 1);

      // Verify allocated amounts sum to total budget (within rounding tolerance)
      const totalAllocated = result.categories.reduce(
        (sum, cat) => sum + cat.allocated,
        0,
      );
      expect(
        Math.abs(totalAllocated - standardBudgetTest.totalBudget),
      ).toBeLessThan(100);
    });

    test('should prioritize venue allocation correctly', async () => {
      const result = await optimizer.optimize(standardBudgetTest);

      const venueCategory = result.categories.find(
        (cat) => cat.category === 'venue',
      );
      expect(venueCategory).toBeDefined();
      expect(venueCategory!.percentage).toBeGreaterThanOrEqual(25); // Venue should be 25%+ of budget
      expect(venueCategory!.percentage).toBeLessThanOrEqual(45); // But not more than 45%
    });

    test('should scale catering with guest count', async () => {
      const smallWedding = await optimizer.optimize({
        ...standardBudgetTest,
        guestCount: 50,
      });

      const largeWedding = await optimizer.optimize({
        ...standardBudgetTest,
        guestCount: 200,
      });

      const smallCatering = smallWedding.categories.find(
        (cat) => cat.category === 'catering',
      )!;
      const largeCatering = largeWedding.categories.find(
        (cat) => cat.category === 'catering',
      )!;

      // Per-guest catering cost should be similar
      const smallPerGuest = smallCatering.allocated / 50;
      const largePerGuest = largeCatering.allocated / 200;

      expect(Math.abs(smallPerGuest - largePerGuest)).toBeLessThan(20); // Within £20 per guest
    });

    test('should adjust for regional pricing differences', async () => {
      const londonWedding = await optimizer.optimize({
        ...standardBudgetTest,
        region: 'london',
      });

      const northWedding = await optimizer.optimize({
        ...standardBudgetTest,
        region: 'north',
      });

      // London venues should cost more than northern venues
      const londonVenue = londonWedding.categories.find(
        (cat) => cat.category === 'venue',
      )!;
      const northVenue = northWedding.categories.find(
        (cat) => cat.category === 'venue',
      )!;

      expect(londonVenue.allocated).toBeGreaterThan(northVenue.allocated);
      expect(londonWedding.regionalMultiplier).toBeGreaterThan(
        northWedding.regionalMultiplier,
      );
    });

    test('should handle different venue types appropriately', async () => {
      const outdoorWedding = await optimizer.optimize({
        ...standardBudgetTest,
        venueType: 'outdoor',
      });

      const destinationWedding = await optimizer.optimize({
        ...standardBudgetTest,
        venueType: 'destination',
      });

      // Destination weddings should allocate more to transport/accommodation
      const outdoorTransport = outdoorWedding.categories.find(
        (cat) => cat.category === 'transport',
      )!;
      const destinationTransport = destinationWedding.categories.find(
        (cat) => cat.category === 'transport',
      )!;

      expect(destinationTransport.percentage).toBeGreaterThan(
        outdoorTransport.percentage,
      );
    });
  });

  describe('Seasonal Budget Adjustments', () => {
    const baseBudgetTest = {
      totalBudget: 25000,
      guestCount: 100,
      region: 'london',
      venueType: 'outdoor' as const,
    };

    test('should apply peak season multipliers', async () => {
      const peakSeason = await optimizer.optimize({
        ...baseBudgetTest,
        weddingMonth: 6, // June
      });

      const offSeason = await optimizer.optimize({
        ...baseBudgetTest,
        weddingMonth: 1, // January
      });

      expect(peakSeason.seasonalMultiplier).toBeGreaterThan(
        offSeason.seasonalMultiplier,
      );
      expect(peakSeason.seasonalMultiplier).toBeGreaterThanOrEqual(1.1); // At least 10% increase
      expect(offSeason.seasonalMultiplier).toBeLessThanOrEqual(0.9); // At least 10% decrease
    });

    test('should adjust specific categories for seasonality', async () => {
      const summerWedding = await optimizer.optimize({
        ...baseBudgetTest,
        weddingMonth: 7, // July - peak flower season
        venueType: 'outdoor',
      });

      const winterWedding = await optimizer.optimize({
        ...baseBudgetTest,
        weddingMonth: 12, // December - off season
        venueType: 'indoor',
      });

      // Summer outdoor weddings should allocate more to flowers
      const summerFlowers = summerWedding.categories.find(
        (cat) => cat.category === 'flowers',
      )!;
      const winterFlowers = winterWedding.categories.find(
        (cat) => cat.category === 'flowers',
      )!;

      expect(summerFlowers.percentage).toBeGreaterThan(
        winterFlowers.percentage,
      );
    });
  });

  describe('Budget Optimization Algorithms', () => {
    test('should provide meaningful optimization recommendations', async () => {
      const result = await optimizer.optimize({
        totalBudget: 20000, // Lower budget requiring optimization
        guestCount: 100,
        region: 'london',
        venueType: 'indoor',
        priorities: ['photography', 'venue'], // User priorities
      });

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should prioritize user-specified categories
      const photographyRec = result.recommendations.find(
        (rec) => rec.category === 'photography' && rec.type === 'prioritize',
      );
      expect(photographyRec).toBeDefined();

      // Should suggest cost-saving measures for tight budgets
      const costSavingRecs = result.recommendations.filter(
        (rec) => rec.type === 'reduce' || rec.type === 'alternative',
      );
      expect(costSavingRecs.length).toBeGreaterThan(0);
    });

    test('should identify overspending categories', async () => {
      const result = await optimizer.optimize({
        totalBudget: 50000, // Higher budget
        guestCount: 80, // Smaller wedding
        region: 'london',
        venueType: 'luxury',
        currentBudget: {
          venue: 30000, // Overspending on venue
          catering: 15000, // Overspending on catering
          photography: 2000, // Underspending
          flowers: 1500,
          music: 1000,
          attire: 1000,
          transport: 500,
          other: 500,
        },
      });

      // Should identify venue overspend
      const venueWarning = result.recommendations.find(
        (rec) => rec.category === 'venue' && rec.severity === 'high',
      );
      expect(venueWarning).toBeDefined();

      // Should suggest reallocation
      const reallocationRec = result.recommendations.find(
        (rec) => rec.type === 'reallocate',
      );
      expect(reallocationRec).toBeDefined();
    });

    test('should calculate accurate savings potential', async () => {
      const result = await optimizer.optimize({
        totalBudget: 35000,
        guestCount: 150,
        region: 'london',
        venueType: 'indoor',
        includeAlternatives: true,
      });

      expect(result.savingsAnalysis).toBeDefined();
      expect(
        result.savingsAnalysis.totalSavingsPotential,
      ).toBeGreaterThanOrEqual(0);
      expect(result.savingsAnalysis.categories).toBeDefined();

      // Savings should be realistic (not more than 30% of total budget)
      const maxSavings = result.totalBudget * 0.3;
      expect(result.savingsAnalysis.totalSavingsPotential).toBeLessThanOrEqual(
        maxSavings,
      );
    });
  });

  describe('Financial Accuracy Requirements', () => {
    const config = TEST_CONFIG.models.budgetOptimizer;

    test('should meet minimum accuracy for budget allocations', async () => {
      const testCases = generateTestDataset(20, () => ({
        totalBudget: 15000 + Math.random() * 50000,
        guestCount: 50 + Math.floor(Math.random() * 200),
        region:
          WEDDING_TEST_DATA.regions[
            Math.floor(Math.random() * WEDDING_TEST_DATA.regions.length)
          ],
        venueType:
          WEDDING_TEST_DATA.venues[
            Math.floor(Math.random() * WEDDING_TEST_DATA.venues.length)
          ],
      }));

      const results = await Promise.all(
        testCases.map((testCase) => optimizer.optimize(testCase)),
      );

      // Verify all allocations are mathematically correct
      for (const result of results) {
        const totalAllocated = result.categories.reduce(
          (sum, cat) => sum + cat.allocated,
          0,
        );
        const budgetError =
          Math.abs(totalAllocated - result.totalBudget) / result.totalBudget;

        expect(budgetError).toBeLessThan(0.01); // Less than 1% error
      }

      // Calculate allocation accuracy
      const allocationAccuracy =
        (results.filter((result) => {
          const totalAllocated = result.categories.reduce(
            (sum, cat) => sum + cat.allocated,
            0,
          );
          return Math.abs(totalAllocated - result.totalBudget) < 100; // Within £100
        }).length /
          results.length) *
        100;

      expect(allocationAccuracy).toBeGreaterThanOrEqual(
        config.accuracy.minimum,
      );
    });

    test('should handle currency conversion accurately', async () => {
      const gbpBudget = {
        totalBudget: 30000,
        guestCount: 100,
        region: 'london',
        venueType: 'indoor' as const,
        currency: 'GBP',
      };

      const usdBudget = {
        ...gbpBudget,
        totalBudget: 37500, // Approximate USD equivalent
        currency: 'USD',
      };

      const gbpResult = await optimizer.optimize(gbpBudget);
      const usdResult = await optimizer.optimize(usdBudget);

      // Results should be proportionally similar when converted
      const exchangeRate = 1.25; // Approximate GBP to USD

      for (let i = 0; i < gbpResult.categories.length; i++) {
        const gbpCategory = gbpResult.categories[i];
        const usdCategory = usdResult.categories.find(
          (cat) => cat.category === gbpCategory.category,
        )!;

        const convertedGbp = gbpCategory.allocated * exchangeRate;
        const conversionError =
          Math.abs(convertedGbp - usdCategory.allocated) /
          usdCategory.allocated;

        expect(conversionError).toBeLessThan(0.1); // Within 10% (accounting for market differences)
      }
    });

    test('should maintain consistency across multiple runs', async () => {
      const budgetInput = {
        totalBudget: 25000,
        guestCount: 120,
        region: 'london',
        venueType: 'indoor' as const,
        weddingMonth: 6,
      };

      const results = await Promise.all([
        optimizer.optimize(budgetInput),
        optimizer.optimize(budgetInput),
        optimizer.optimize(budgetInput),
      ]);

      // All results should be identical for same input
      for (let i = 1; i < results.length; i++) {
        for (let j = 0; j < results[0].categories.length; j++) {
          const category1 = results[0].categories[j];
          const category2 = results[i].categories.find(
            (cat) => cat.category === category1.category,
          )!;

          expect(
            Math.abs(category1.allocated - category2.allocated),
          ).toBeLessThan(1); // Within £1
          expect(
            Math.abs(category1.percentage - category2.percentage),
          ).toBeLessThan(0.01); // Within 0.01%
        }
      }
    });
  });

  describe('Performance Requirements', () => {
    const config = TEST_CONFIG.models.budgetOptimizer;

    test('should meet response time requirements for complex optimizations', async () => {
      const complexBudget = {
        totalBudget: 75000,
        guestCount: 300,
        region: 'london',
        venueType: 'destination' as const,
        weddingMonth: 6,
        includeAlternatives: true,
        priorities: ['venue', 'photography', 'catering'],
        constraints: {
          maxVenuePercent: 35,
          minPhotographyBudget: 5000,
          preferredVendors: ['vendor1', 'vendor2'],
        },
      };

      const { duration, result } = await measureExecutionTime(() =>
        optimizer.optimize(complexBudget),
      );

      expect(duration).toBeLessThan(config.performance.maxResponseTime);
      expect(result).toBeDefined();
      expect(result.categories).toHaveLength(8);
    });

    test('should handle concurrent optimizations efficiently', async () => {
      const budgets = generateTestDataset(5, () => ({
        totalBudget: 20000 + Math.random() * 30000,
        guestCount: 80 + Math.floor(Math.random() * 120),
        region:
          WEDDING_TEST_DATA.regions[
            Math.floor(Math.random() * WEDDING_TEST_DATA.regions.length)
          ],
        venueType:
          WEDDING_TEST_DATA.venues[
            Math.floor(Math.random() * WEDDING_TEST_DATA.venues.length)
          ],
      }));

      const startTime = performance.now();
      const results = await Promise.all(
        budgets.map((budget) => optimizer.optimize(budget)),
      );
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / budgets.length;

      expect(results).toHaveLength(budgets.length);
      expect(avgTime).toBeLessThan(config.performance.maxResponseTime);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle extreme budget ranges', async () => {
      // Very low budget
      const lowBudgetResult = await optimizer.optimize({
        totalBudget: 3000,
        guestCount: 30,
        region: 'north',
        venueType: 'registry',
      });

      expect(lowBudgetResult.categories).toBeDefined();
      expect(
        lowBudgetResult.recommendations.some((rec) => rec.type === 'warning'),
      ).toBe(true);

      // Very high budget
      const highBudgetResult = await optimizer.optimize({
        totalBudget: 150000,
        guestCount: 200,
        region: 'london',
        venueType: 'luxury',
      });

      expect(highBudgetResult.categories).toBeDefined();
      expect(
        highBudgetResult.recommendations.some((rec) => rec.type === 'premium'),
      ).toBe(true);
    });

    test('should handle malformed current budget data', async () => {
      const result = await optimizer.optimize({
        totalBudget: 25000,
        guestCount: 100,
        region: 'london',
        venueType: 'indoor',
        currentBudget: {
          venue: -1000, // Negative value
          catering: null, // Null value
          photography: 'five thousand', // String value
          flowers: Infinity, // Infinite value
          // Missing other categories
        } as any,
      });

      // Should handle malformed data gracefully
      expect(result).toBeDefined();
      expect(result.categories).toHaveLength(8);

      // Should provide warnings about data quality
      expect(
        result.recommendations.some(
          (rec) => rec.type === 'data-quality' || rec.severity === 'warning',
        ),
      ).toBe(true);
    });

    test('should provide meaningful error messages for invalid inputs', async () => {
      try {
        await optimizer.optimize({
          totalBudget: -5000, // Negative budget
          guestCount: 100,
          region: 'london',
          venueType: 'indoor',
        });
      } catch (error) {
        expect(error.message).toContain('Budget must be positive');
      }

      try {
        await optimizer.optimize({
          totalBudget: 25000,
          guestCount: 100,
          region: 'moon', // Invalid region
          venueType: 'indoor',
        });
      } catch (error) {
        expect(error.message).toContain('Invalid region');
      }
    });
  });

  describe('Integration with Wedding Context', () => {
    test('should incorporate wedding industry knowledge', async () => {
      const result = await optimizer.optimize({
        totalBudget: 40000,
        guestCount: 150,
        region: 'london',
        venueType: 'garden',
        weddingMonth: 5, // May - good weather but still spring
        weddingStyle: 'rustic',
      });

      // Should apply style-specific adjustments
      expect(result.styleFactors).toBeDefined();
      expect(result.styleFactors.style).toBe('rustic');

      // Garden venues in May should consider weather factors
      const flowersCategory = result.categories.find(
        (cat) => cat.category === 'flowers',
      )!;
      expect(flowersCategory.seasonalNotes).toBeDefined();
    });

    test('should provide vendor-specific recommendations', async () => {
      const result = await optimizer.optimize({
        totalBudget: 30000,
        guestCount: 100,
        region: 'london',
        venueType: 'indoor',
        includeVendorRecommendations: true,
      });

      expect(result.vendorInsights).toBeDefined();
      expect(result.vendorInsights.length).toBeGreaterThan(0);

      // Should include budget-appropriate vendor suggestions
      result.vendorInsights.forEach((insight) => {
        expect(insight.category).toBeDefined();
        expect(insight.budgetRange).toBeDefined();
        expect(insight.recommendations).toBeDefined();
      });
    });
  });

  describe('Model Performance Tracking', () => {
    test('should track optimization accuracy over time', async () => {
      // Perform multiple optimizations
      for (let i = 0; i < 10; i++) {
        await optimizer.optimize({
          totalBudget: 25000 + i * 5000,
          guestCount: 100 + i * 10,
          region: 'london',
          venueType: 'indoor',
        });
      }

      const metrics = optimizer.getPerformanceMetrics();

      expect(metrics.totalOptimizations).toBe(10);
      expect(metrics.averageAccuracy).toBeGreaterThanOrEqual(
        config.accuracy.minimum,
      );
      expect(metrics.averageResponseTime).toBeLessThan(
        config.performance.maxResponseTime,
      );
      expect(metrics.errorRate).toBeLessThanOrEqual(
        config.reliability.maxErrorRate,
      );
    });

    test('should provide detailed model metadata', () => {
      const info = optimizer.getModelInfo();

      expect(info.modelId).toBe('budget-optimizer-test');
      expect(info.capabilities).toContain('category-allocation');
      expect(info.capabilities).toContain('seasonal-adjustment');
      expect(info.capabilities).toContain('regional-pricing');
      expect(info.capabilities).toContain('optimization-recommendations');
      expect(info.supportedCurrencies).toContain('GBP');
      expect(info.supportedCurrencies).toContain('USD');
      expect(info.supportedCurrencies).toContain('EUR');
    });
  });
});
