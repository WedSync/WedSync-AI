/**
 * WS-232 Predictive Modeling System - Wedding Trend Predictor Tests
 * Comprehensive test suite for wedding trend prediction accuracy and performance
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
import { WeddingTrendPredictor } from '../predictors/wedding-trend-predictor';
import {
  TEST_CONFIG,
  WEDDING_TEST_DATA,
  generateTestWedding,
  generateTestDataset,
  measureExecutionTime,
  calculateAccuracy,
  calculateMeanAbsoluteError,
  withinTolerance,
  MOCK_WEDDING_DATA,
} from './test-config';

describe('WeddingTrendPredictor', () => {
  let predictor: WeddingTrendPredictor;
  let testStartTime: number;

  beforeAll(() => {
    // Mock console to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  beforeEach(() => {
    predictor = new WeddingTrendPredictor({
      modelId: 'wedding-trends-test',
      version: '1.0.0-test',
      cacheEnabled: false, // Disable cache for testing
      loggingEnabled: false, // Disable logging for testing
    });
    testStartTime = Date.now();
  });

  afterEach(() => {
    // Clean up any test resources
    const testDuration = Date.now() - testStartTime;
    if (testDuration > 10000) {
      // 10 seconds
      console.warn(`Test took ${testDuration}ms - may need optimization`);
    }
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      const defaultPredictor = new WeddingTrendPredictor();
      expect(defaultPredictor).toBeDefined();
      expect(defaultPredictor.getModelInfo().modelId).toBe('wedding-trends-v1');
    });

    test('should initialize with custom configuration', () => {
      const config = {
        modelId: 'custom-wedding-trends',
        version: '2.0.0',
        cacheEnabled: true,
        cacheTTL: 3600000,
      };
      const customPredictor = new WeddingTrendPredictor(config);
      expect(customPredictor.getModelInfo().modelId).toBe(
        'custom-wedding-trends',
      );
      expect(customPredictor.getModelInfo().version).toBe('2.0.0');
    });

    test('should validate required configuration parameters', () => {
      expect(() => {
        new WeddingTrendPredictor({ modelId: '' });
      }).toThrow('Model ID cannot be empty');
    });
  });

  describe('Data Validation', () => {
    test('should validate input data structure', async () => {
      const invalidInput = {
        // Missing required fields
        region: 'london',
      };

      await expect(predictor.predict(invalidInput as any)).rejects.toThrow(
        'Invalid input: missing required fields',
      );
    });

    test('should validate wedding date range', async () => {
      const futureWedding = generateTestWedding({
        date: new Date(2030, 5, 15), // Too far in future
      });

      await expect(
        predictor.predict({
          weddingData: futureWedding,
          timeRange: '1y',
          includeSeasonality: true,
        }),
      ).rejects.toThrow('Wedding date is outside supported range');
    });

    test('should validate guest count limits', async () => {
      const invalidWedding = generateTestWedding({
        guestCount: -5, // Invalid negative count
      });

      await expect(
        predictor.predict({
          weddingData: invalidWedding,
          timeRange: '1y',
          includeSeasonality: true,
        }),
      ).rejects.toThrow('Guest count must be positive');
    });

    test('should validate budget ranges', async () => {
      const invalidWedding = generateTestWedding({
        budget: 0, // Invalid zero budget
      });

      await expect(
        predictor.predict({
          weddingData: invalidWedding,
          timeRange: '1y',
          includeSeasonality: true,
        }),
      ).rejects.toThrow('Budget must be greater than zero');
    });

    test('should validate region codes', async () => {
      const invalidWedding = generateTestWedding({
        region: 'invalid-region',
      });

      await expect(
        predictor.predict({
          weddingData: invalidWedding,
          timeRange: '1y',
          includeSeasonality: true,
        }),
      ).rejects.toThrow('Invalid region code');
    });

    test('should validate venue types', async () => {
      const invalidWedding = generateTestWedding({
        venue: 'space-station', // Invalid venue type
      });

      await expect(
        predictor.predict({
          weddingData: invalidWedding,
          timeRange: '1y',
          includeSeasonality: true,
        }),
      ).rejects.toThrow('Invalid venue type');
    });
  });

  describe('Seasonality Analysis', () => {
    test('should apply correct seasonal factors', async () => {
      // Test peak season (June)
      const juneWedding = generateTestWedding({
        date: new Date(2024, 5, 15), // June 15th
        region: 'london',
        venue: 'outdoor',
      });

      const { result: juneResult } = await measureExecutionTime(() =>
        predictor.predict({
          weddingData: juneWedding,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      );

      // Test low season (January)
      const januaryWedding = generateTestWedding({
        date: new Date(2024, 0, 15), // January 15th
        region: 'london',
        venue: 'outdoor',
      });

      const { result: januaryResult } = await measureExecutionTime(() =>
        predictor.predict({
          weddingData: januaryWedding,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      );

      // June should have higher demand multiplier than January
      expect(juneResult.trends.demandMultiplier).toBeGreaterThan(
        januaryResult.trends.demandMultiplier,
      );

      // Verify seasonal factors are within expected ranges
      expect(
        juneResult.trends.seasonalFactors.demandLevel,
      ).toBeGreaterThanOrEqual(0.9);
      expect(
        januaryResult.trends.seasonalFactors.demandLevel,
      ).toBeLessThanOrEqual(0.5);
    });

    test('should handle seasonal data for all months', async () => {
      const monthlyResults = [];

      for (let month = 0; month < 12; month++) {
        const wedding = generateTestWedding({
          date: new Date(2024, month, 15),
          region: 'london',
        });

        const result = await predictor.predict({
          weddingData: wedding,
          timeRange: '3m',
          includeSeasonality: true,
        });

        monthlyResults.push({
          month: month + 1,
          demandMultiplier: result.trends.demandMultiplier,
          seasonalFactor: result.trends.seasonalFactors.demandLevel,
        });
      }

      // Verify peak months (April-September) have higher demand
      const peakMonths = monthlyResults.filter(
        (m) => m.month >= 4 && m.month <= 9,
      );
      const offSeasonMonths = monthlyResults.filter(
        (m) => m.month < 4 || m.month > 9,
      );

      const avgPeakDemand =
        peakMonths.reduce((sum, m) => sum + m.demandMultiplier, 0) /
        peakMonths.length;
      const avgOffSeasonDemand =
        offSeasonMonths.reduce((sum, m) => sum + m.demandMultiplier, 0) /
        offSeasonMonths.length;

      expect(avgPeakDemand).toBeGreaterThan(avgOffSeasonDemand);
    });

    test('should disable seasonality when requested', async () => {
      const wedding = generateTestWedding({
        date: new Date(2024, 5, 15), // June (peak season)
        region: 'london',
      });

      const withSeasonality = await predictor.predict({
        weddingData: wedding,
        timeRange: '6m',
        includeSeasonality: true,
      });

      const withoutSeasonality = await predictor.predict({
        weddingData: wedding,
        timeRange: '6m',
        includeSeasonality: false,
      });

      // Without seasonality, factors should be closer to 1.0
      expect(
        Math.abs(withoutSeasonality.trends.seasonalFactors.demandLevel - 1.0),
      ).toBeLessThan(
        Math.abs(withSeasonality.trends.seasonalFactors.demandLevel - 1.0),
      );
    });
  });

  describe('Regional Analysis', () => {
    test('should apply correct regional factors', async () => {
      const baseWedding = {
        date: new Date(2024, 5, 15),
        venue: 'indoor' as const,
        guestCount: 100,
        budget: 25000,
      };

      const londonResult = await predictor.predict({
        weddingData: { ...baseWedding, region: 'london' },
        timeRange: '6m',
        includeSeasonality: true,
      });

      const northResult = await predictor.predict({
        weddingData: { ...baseWedding, region: 'north' },
        timeRange: '6m',
        includeSeasonality: true,
      });

      // London should have higher cost multiplier
      expect(
        londonResult.trends.regionalFactors.costMultiplier,
      ).toBeGreaterThan(northResult.trends.regionalFactors.costMultiplier);

      // Verify regional factors are reasonable
      expect(
        londonResult.trends.regionalFactors.costMultiplier,
      ).toBeGreaterThanOrEqual(1.0);
      expect(
        northResult.trends.regionalFactors.costMultiplier,
      ).toBeGreaterThanOrEqual(0.7);
    });

    test('should handle all supported regions', async () => {
      const baseWedding = generateTestWedding();
      const results = [];

      for (const region of WEDDING_TEST_DATA.regions) {
        const result = await predictor.predict({
          weddingData: { ...baseWedding, region },
          timeRange: '6m',
          includeSeasonality: true,
        });
        results.push({ region, result });
      }

      // All regions should return valid results
      expect(results).toHaveLength(WEDDING_TEST_DATA.regions.length);
      results.forEach(({ region, result }) => {
        expect(result.trends.regionalFactors).toBeDefined();
        expect(result.trends.regionalFactors.costMultiplier).toBeGreaterThan(0);
        expect(result.metadata.region).toBe(region);
      });
    });
  });

  describe('Venue Type Analysis', () => {
    test('should differentiate between venue types', async () => {
      const baseWedding = {
        date: new Date(2024, 5, 15),
        region: 'london' as const,
        guestCount: 100,
        budget: 25000,
      };

      const outdoorResult = await predictor.predict({
        weddingData: { ...baseWedding, venue: 'outdoor' },
        timeRange: '6m',
        includeSeasonality: true,
      });

      const indoorResult = await predictor.predict({
        weddingData: { ...baseWedding, venue: 'indoor' },
        timeRange: '6m',
        includeSeasonality: true,
      });

      // Outdoor weddings should be more seasonal
      expect(
        Math.abs(outdoorResult.trends.seasonalFactors.weatherImpact),
      ).toBeGreaterThan(
        Math.abs(indoorResult.trends.seasonalFactors.weatherImpact),
      );
    });

    test('should handle all venue types', async () => {
      const baseWedding = generateTestWedding();

      for (const venue of WEDDING_TEST_DATA.venues) {
        const result = await predictor.predict({
          weddingData: { ...baseWedding, venue },
          timeRange: '6m',
          includeSeasonality: true,
        });

        expect(result.trends.venueFactors).toBeDefined();
        expect(result.metadata.venue).toBe(venue);
      }
    });
  });

  describe('Performance Requirements', () => {
    const config = TEST_CONFIG.models.weddingTrends;

    test('should meet response time requirements', async () => {
      const wedding = generateTestWedding();

      const { duration } = await measureExecutionTime(() =>
        predictor.predict({
          weddingData: wedding,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      );

      expect(duration).toBeLessThan(config.performance.maxResponseTime);
    });

    test('should handle concurrent predictions efficiently', async () => {
      const weddings = generateTestDataset(10, generateTestWedding);

      const startTime = performance.now();

      const promises = weddings.map((wedding) =>
        predictor.predict({
          weddingData: wedding,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / weddings.length;

      expect(results).toHaveLength(weddings.length);
      expect(avgTime).toBeLessThan(config.performance.maxResponseTime);
    });

    test('should handle large datasets without memory issues', async () => {
      const largeDataset = generateTestDataset(100, generateTestWedding);

      for (let i = 0; i < largeDataset.length; i += 10) {
        const batch = largeDataset.slice(i, i + 10);
        const batchPromises = batch.map((wedding) =>
          predictor.predict({
            weddingData: wedding,
            timeRange: '6m',
            includeSeasonality: true,
          }),
        );

        const batchResults = await Promise.all(batchPromises);
        expect(batchResults).toHaveLength(batch.length);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Accuracy Requirements', () => {
    const config = TEST_CONFIG.models.weddingTrends;

    test('should meet minimum accuracy for trend predictions', async () => {
      const testDataset = MOCK_WEDDING_DATA.slice(0, 50); // Use subset for testing
      const predictions = [];
      const actualTrends = [];

      for (const wedding of testDataset) {
        const prediction = await predictor.predict({
          weddingData: wedding,
          timeRange: '6m',
          includeSeasonality: true,
        });

        predictions.push(prediction.trends.popularityScore);

        // Mock actual trend data based on known patterns
        const month = wedding.date.getMonth();
        const isPeakSeason = month >= 3 && month <= 8;
        const isPopularVenue = ['outdoor', 'garden', 'manor'].includes(
          wedding.venue,
        );
        actualTrends.push(isPeakSeason && isPopularVenue ? 0.8 : 0.4);
      }

      const accuracy = calculateAccuracy(
        predictions,
        actualTrends,
        (pred, actual) => Math.abs(pred - actual) < 0.3,
      );

      expect(accuracy).toBeGreaterThanOrEqual(config.accuracy.minimum);
    });

    test('should provide confidence scores for predictions', async () => {
      const wedding = generateTestWedding();
      const result = await predictor.predict({
        weddingData: wedding,
        timeRange: '6m',
        includeSeasonality: true,
      });

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata.confidenceLevel).toBeDefined();
    });

    test('should handle edge cases gracefully', async () => {
      // Test minimum values
      const minWedding = {
        date: new Date(2024, 0, 1),
        region: 'wales' as const,
        venue: 'registry' as const,
        guestCount: 2,
        budget: 1000,
      };

      const minResult = await predictor.predict({
        weddingData: minWedding,
        timeRange: '3m',
        includeSeasonality: true,
      });

      expect(minResult.trends.popularityScore).toBeGreaterThanOrEqual(0);
      expect(minResult.trends.popularityScore).toBeLessThanOrEqual(1);

      // Test maximum values
      const maxWedding = {
        date: new Date(2024, 5, 15),
        region: 'london' as const,
        venue: 'destination' as const,
        guestCount: 500,
        budget: 150000,
      };

      const maxResult = await predictor.predict({
        weddingData: maxWedding,
        timeRange: '1y',
        includeSeasonality: true,
      });

      expect(maxResult.trends.popularityScore).toBeGreaterThanOrEqual(0);
      expect(maxResult.trends.popularityScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      // Mock a slow operation
      const slowPredictor = new WeddingTrendPredictor({
        ...predictor.getModelInfo(),
        timeout: 100, // Very short timeout
      });

      const wedding = generateTestWedding();

      await expect(
        slowPredictor.predict({
          weddingData: wedding,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      ).rejects.toThrow(/timeout/i);
    });

    test('should handle malformed data', async () => {
      const malformedData = {
        date: 'invalid-date',
        region: null,
        venue: undefined,
        guestCount: 'not-a-number',
        budget: Infinity,
      };

      await expect(
        predictor.predict({
          weddingData: malformedData as any,
          timeRange: '6m',
          includeSeasonality: true,
        }),
      ).rejects.toThrow();
    });

    test('should provide meaningful error messages', async () => {
      try {
        await predictor.predict({
          weddingData: { date: new Date(1990, 0, 1) } as any,
          timeRange: '6m',
          includeSeasonality: true,
        });
      } catch (error) {
        expect(error.message).toContain('Invalid input');
        expect(error.message).toContain('missing required fields');
      }
    });
  });

  describe('Caching Behavior', () => {
    test('should cache results when enabled', async () => {
      const cachedPredictor = new WeddingTrendPredictor({
        modelId: 'cached-trends',
        version: '1.0.0',
        cacheEnabled: true,
        cacheTTL: 300000, // 5 minutes
      });

      const wedding = generateTestWedding();
      const input = {
        weddingData: wedding,
        timeRange: '6m' as const,
        includeSeasonality: true,
      };

      // First call
      const { duration: firstDuration } = await measureExecutionTime(() =>
        cachedPredictor.predict(input),
      );

      // Second call (should be cached)
      const { duration: secondDuration } = await measureExecutionTime(() =>
        cachedPredictor.predict(input),
      );

      // Cached call should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration * 0.5);
    });

    test('should respect cache TTL', async () => {
      const shortCachePredictor = new WeddingTrendPredictor({
        modelId: 'short-cache-trends',
        version: '1.0.0',
        cacheEnabled: true,
        cacheTTL: 100, // 100ms
      });

      const wedding = generateTestWedding();
      const input = {
        weddingData: wedding,
        timeRange: '6m' as const,
        includeSeasonality: true,
      };

      // First call
      await shortCachePredictor.predict(input);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third call (cache should be expired)
      const { duration: thirdDuration } = await measureExecutionTime(() =>
        shortCachePredictor.predict(input),
      );

      // Should take normal time again
      expect(thirdDuration).toBeGreaterThan(50); // Not instant
    });
  });

  describe('Model Metadata', () => {
    test('should provide comprehensive model information', () => {
      const info = predictor.getModelInfo();

      expect(info.modelId).toBeDefined();
      expect(info.version).toBeDefined();
      expect(info.description).toBeDefined();
      expect(info.capabilities).toBeDefined();
      expect(info.capabilities).toContain('seasonality');
      expect(info.capabilities).toContain('regional-analysis');
      expect(info.inputSchema).toBeDefined();
      expect(info.outputSchema).toBeDefined();
    });

    test('should track model performance metrics', async () => {
      const wedding = generateTestWedding();

      await predictor.predict({
        weddingData: wedding,
        timeRange: '6m',
        includeSeasonality: true,
      });

      const metrics = predictor.getPerformanceMetrics();

      expect(metrics.totalPredictions).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
