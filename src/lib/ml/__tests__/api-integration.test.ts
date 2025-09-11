/**
 * WS-232 Predictive Modeling System - API Integration Tests
 * Comprehensive test suite for ML prediction API endpoints and real-world data flows
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { createServer } from 'http';
import request from 'supertest';
import {
  TEST_CONFIG,
  WEDDING_TEST_DATA,
  generateTestWedding,
  generateTestUser,
  generateTestVendor,
  measureExecutionTime,
  withinTolerance,
} from './test-config';

// Mock Next.js API environment
const mockNextApiRequest = {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer test-token',
  },
  body: {},
  query: {},
};

describe('ML Prediction API Integration Tests', () => {
  let server: any;
  let baseURL: string;

  beforeAll(async () => {
    // Set up test server environment
    process.env.NODE_ENV = 'test';
    process.env.ML_API_ENABLED = 'true';
    process.env.ML_CACHE_ENABLED = 'false'; // Disable cache for testing

    baseURL = 'http://localhost:3001';
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all ML endpoints', async () => {
      const endpoints = [
        '/api/ml/predictions/wedding-trends',
        '/api/ml/predictions/budget-optimization',
        '/api/ml/predictions/vendor-performance',
        '/api/ml/predictions/churn-risk',
        '/api/ml/predictions/revenue-forecasting',
      ];

      for (const endpoint of endpoints) {
        const response = await request(baseURL)
          .post(endpoint)
          .send({})
          .expect(401);

        expect(response.body.error).toContain('Authentication required');
      }
    });

    test('should validate API key permissions', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/wedding-trends')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          weddingData: generateTestWedding(),
          timeRange: '6m',
          includeSeasonality: true,
        })
        .expect(403);

      expect(response.body.error).toContain('Invalid or expired API key');
    });

    test('should handle rate limiting correctly', async () => {
      const validPayload = {
        weddingData: generateTestWedding(),
        timeRange: '6m',
        includeSeasonality: true,
      };

      // Make requests up to the rate limit
      const requests = Array.from({ length: 100 }, () =>
        request(baseURL)
          .post('/api/ml/predictions/wedding-trends')
          .set('Authorization', 'Bearer test-token')
          .send(validPayload),
      );

      const responses = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rateLimited = responses.filter(
        (r) => r.status === 'fulfilled' && (r.value as any).status === 429,
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Wedding Trends Prediction API', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should handle valid wedding trend predictions', async () => {
      const weddingData = generateTestWedding({
        date: new Date(2024, 5, 15), // June 15, 2024
        region: 'london',
        venue: 'outdoor',
        guestCount: 120,
        budget: 35000,
      });

      const { duration } = await measureExecutionTime(async () => {
        const response = await request(baseURL)
          .post('/api/ml/predictions/wedding-trends')
          .set(validAuth)
          .send({
            weddingData,
            timeRange: '6m',
            includeSeasonality: true,
            includeRegionalAnalysis: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.trends).toBeDefined();
        expect(
          response.body.data.trends.popularityScore,
        ).toBeGreaterThanOrEqual(0);
        expect(response.body.data.trends.popularityScore).toBeLessThanOrEqual(
          1,
        );
        expect(response.body.data.confidence).toBeGreaterThan(0);
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.modelVersion).toBeDefined();

        // Verify seasonal factors
        expect(response.body.data.trends.seasonalFactors).toBeDefined();
        expect(
          response.body.data.trends.seasonalFactors.demandLevel,
        ).toBeGreaterThan(0.8); // June is peak

        // Verify regional factors
        expect(response.body.data.trends.regionalFactors).toBeDefined();
        expect(response.body.data.trends.regionalFactors.region).toBe('london');
      });

      expect(duration).toBeLessThan(
        TEST_CONFIG.models.weddingTrends.performance.maxResponseTime,
      );
    });

    test('should validate input data structure', async () => {
      const invalidRequests = [
        {
          description: 'missing wedding data',
          payload: { timeRange: '6m' },
        },
        {
          description: 'invalid time range',
          payload: {
            weddingData: generateTestWedding(),
            timeRange: 'invalid',
          },
        },
        {
          description: 'malformed wedding data',
          payload: {
            weddingData: { date: 'invalid-date', region: null },
            timeRange: '6m',
          },
        },
      ];

      for (const { description, payload } of invalidRequests) {
        const response = await request(baseURL)
          .post('/api/ml/predictions/wedding-trends')
          .set(validAuth)
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should handle concurrent requests efficiently', async () => {
      const weddingData = generateTestWedding();
      const payload = {
        weddingData,
        timeRange: '6m',
        includeSeasonality: true,
      };

      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(baseURL)
          .post('/api/ml/predictions/wedding-trends')
          .set(validAuth)
          .send(payload),
      );

      const startTime = performance.now();
      const responses = await Promise.all(concurrentRequests);
      const totalTime = performance.now() - startTime;

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Average response time should still meet requirements
      const avgTime = totalTime / concurrentRequests.length;
      expect(avgTime).toBeLessThan(
        TEST_CONFIG.models.weddingTrends.performance.maxResponseTime,
      );
    });
  });

  describe('Budget Optimization API', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should handle valid budget optimization requests', async () => {
      const budgetData = {
        totalBudget: 30000,
        guestCount: 120,
        region: 'london',
        venueType: 'indoor',
        weddingMonth: 6,
        priorities: ['photography', 'venue'],
        includeAlternatives: true,
      };

      const response = await request(baseURL)
        .post('/api/ml/predictions/budget-optimization')
        .set(validAuth)
        .send(budgetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.categories).toBeDefined();
      expect(response.body.data.categories).toHaveLength(8);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.totalBudget).toBe(30000);

      // Verify budget allocation adds up
      const totalAllocated = response.body.data.categories.reduce(
        (sum: number, cat: any) => sum + cat.allocated,
        0,
      );
      expect(Math.abs(totalAllocated - 30000)).toBeLessThan(100);

      // Verify regional and seasonal adjustments
      expect(response.body.data.regionalMultiplier).toBeGreaterThan(1.0); // London premium
      expect(response.body.data.seasonalMultiplier).toBeGreaterThan(1.0); // June peak season
    });

    test('should handle different budget ranges appropriately', async () => {
      const budgetRanges = [
        { budget: 10000, description: 'low budget' },
        { budget: 30000, description: 'medium budget' },
        { budget: 75000, description: 'high budget' },
      ];

      for (const { budget, description } of budgetRanges) {
        const response = await request(baseURL)
          .post('/api/ml/predictions/budget-optimization')
          .set(validAuth)
          .send({
            totalBudget: budget,
            guestCount: 100,
            region: 'london',
            venueType: 'indoor',
          })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Low budgets should have cost-saving recommendations
        if (budget <= 15000) {
          const costSavingRecs = response.body.data.recommendations.filter(
            (rec: any) => rec.type === 'reduce' || rec.type === 'alternative',
          );
          expect(costSavingRecs.length).toBeGreaterThan(0);
        }

        // High budgets should have premium recommendations
        if (budget >= 50000) {
          const premiumRecs = response.body.data.recommendations.filter(
            (rec: any) => rec.type === 'premium' || rec.type === 'upgrade',
          );
          expect(premiumRecs.length).toBeGreaterThan(0);
        }
      }
    });

    test('should validate financial constraints', async () => {
      const invalidBudgets = [
        { totalBudget: -1000, expected: 'Budget must be positive' },
        { totalBudget: 1000000, expected: 'Budget above maximum' },
        { totalBudget: 500, expected: 'Budget below minimum' },
      ];

      for (const { totalBudget, expected } of invalidBudgets) {
        const response = await request(baseURL)
          .post('/api/ml/predictions/budget-optimization')
          .set(validAuth)
          .send({
            totalBudget,
            guestCount: 100,
            region: 'london',
            venueType: 'indoor',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain(expected);
      }
    });
  });

  describe('Vendor Performance Prediction API', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should handle vendor performance analysis requests', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/vendor-performance')
        .set(validAuth)
        .send({
          timeRange: '90d',
          category: 'photography',
          region: 'london',
          includeRiskAnalysis: true,
          includePredictions: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.topPerformers).toBeDefined();
      expect(response.body.data.categoryAnalysis).toBeDefined();
      expect(response.body.data.riskAlerts).toBeDefined();
      expect(response.body.data.predictions).toBeDefined();

      // Verify vendor data structure
      response.body.data.topPerformers.forEach((vendor: any) => {
        expect(vendor.vendorId).toBeDefined();
        expect(vendor.name).toBeDefined();
        expect(vendor.rating).toBeGreaterThanOrEqual(0);
        expect(vendor.rating).toBeLessThanOrEqual(5);
        expect(vendor.performanceScore).toBeGreaterThanOrEqual(0);
        expect(vendor.performanceScore).toBeLessThanOrEqual(100);
      });
    });

    test('should filter by category correctly', async () => {
      const categories = ['photography', 'catering', 'venue', 'flowers'];

      for (const category of categories) {
        const response = await request(baseURL)
          .post('/api/ml/predictions/vendor-performance')
          .set(validAuth)
          .send({
            timeRange: '30d',
            category,
            region: 'london',
          })
          .expect(200);

        // All returned vendors should match the requested category
        response.body.data.topPerformers.forEach((vendor: any) => {
          expect(vendor.category).toBe(category);
        });
      }
    });

    test('should provide accurate risk assessments', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/vendor-performance')
        .set(validAuth)
        .send({
          timeRange: '90d',
          includeRiskAnalysis: true,
        })
        .expect(200);

      expect(response.body.data.riskAlerts).toBeDefined();

      // Risk alerts should have proper structure
      response.body.data.riskAlerts.forEach((alert: any) => {
        expect(alert.vendorId).toBeDefined();
        expect(alert.vendorName).toBeDefined();
        expect(alert.riskType).toMatch(
          /^(quality|availability|pricing|reliability)$/,
        );
        expect(alert.severity).toMatch(/^(low|medium|high)$/);
        expect(alert.recommendation).toBeDefined();
      });
    });
  });

  describe('Churn Risk Prediction API', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should analyze churn risk for user segments', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/churn-risk')
        .set(validAuth)
        .send({
          timeRange: '90d',
          tier: 'professional',
          includeInterventions: true,
          includeCohortAnalysis: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.highRiskUsers).toBeDefined();
      expect(response.body.data.churnByTier).toBeDefined();
      expect(response.body.data.retentionStrategies).toBeDefined();

      // Verify churn risk structure
      response.body.data.highRiskUsers.forEach((user: any) => {
        expect(user.userId).toBeDefined();
        expect(user.churnScore).toBeGreaterThanOrEqual(0);
        expect(user.churnScore).toBeLessThanOrEqual(100);
        expect(user.riskLevel).toMatch(/^(low|medium|high|critical)$/);
        expect(user.interventionRecommendations).toBeDefined();
        expect(user.retentionProbability).toBeGreaterThanOrEqual(0);
        expect(user.retentionProbability).toBeLessThanOrEqual(1);
      });
    });

    test('should provide actionable intervention recommendations', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/churn-risk')
        .set(validAuth)
        .send({
          timeRange: '30d',
          riskLevel: 'high',
          includeInterventions: true,
        })
        .expect(200);

      const highRiskUsers = response.body.data.highRiskUsers.filter(
        (user: any) =>
          user.riskLevel === 'high' || user.riskLevel === 'critical',
      );

      expect(highRiskUsers.length).toBeGreaterThan(0);

      highRiskUsers.forEach((user: any) => {
        expect(user.interventionRecommendations.length).toBeGreaterThan(0);

        user.interventionRecommendations.forEach((intervention: any) => {
          expect(intervention.type).toMatch(
            /^(email|call|discount|training|feature)$/,
          );
          expect(intervention.priority).toMatch(/^(high|medium|low)$/);
          expect(intervention.expectedImpact).toBeGreaterThan(0);
          expect(intervention.description).toBeDefined();
        });
      });
    });

    test('should handle cohort analysis correctly', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/churn-risk')
        .set(validAuth)
        .send({
          timeRange: '1y',
          includeCohortAnalysis: true,
        })
        .expect(200);

      expect(response.body.data.cohortAnalysis).toBeDefined();
      expect(response.body.data.cohortAnalysis.length).toBeGreaterThan(0);

      // Verify cohort data structure
      response.body.data.cohortAnalysis.forEach((cohort: any) => {
        expect(cohort.cohort).toBeDefined();
        expect(cohort.month0).toBeGreaterThanOrEqual(0);
        expect(cohort.month1).toBeLessThanOrEqual(cohort.month0);
        expect(cohort.month3).toBeLessThanOrEqual(cohort.month1);
        expect(cohort.month6).toBeLessThanOrEqual(cohort.month3);
        expect(cohort.month12).toBeLessThanOrEqual(cohort.month6);
      });
    });
  });

  describe('Revenue Forecasting API', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should generate accurate revenue forecasts', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/revenue-forecasting')
        .set(validAuth)
        .send({
          timeHorizon: '1y',
          scenario: 'realistic',
          includeSeasonality: true,
          includeScenarioAnalysis: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.forecast).toBeDefined();
      expect(response.body.data.tierBreakdown).toBeDefined();

      // Verify financial metrics
      const metrics = response.body.data.metrics;
      expect(metrics.currentMRR).toBeGreaterThan(0);
      expect(metrics.projectedMRR).toBeGreaterThan(0);
      expect(metrics.arrGrowthRate).toBeGreaterThan(-100);
      expect(metrics.netRevenueRetention).toBeGreaterThan(0);
      expect(metrics.lifetimeValue).toBeGreaterThan(0);
      expect(metrics.customerAcquisitionCost).toBeGreaterThan(0);

      // Verify LTV:CAC ratio is reasonable
      const ltvCacRatio =
        metrics.lifetimeValue / metrics.customerAcquisitionCost;
      expect(ltvCacRatio).toBeGreaterThan(1); // Should be profitable
      expect(ltvCacRatio).toBeLessThan(20); // Should be realistic
    });

    test('should handle different time horizons', async () => {
      const timeHorizons = ['6m', '1y', '2y', '5y'];

      for (const timeHorizon of timeHorizons) {
        const response = await request(baseURL)
          .post('/api/ml/predictions/revenue-forecasting')
          .set(validAuth)
          .send({
            timeHorizon,
            scenario: 'realistic',
            includeSeasonality: true,
          })
          .expect(200);

        expect(response.body.success).toBe(true);

        // Longer time horizons should have more forecast points
        const forecastPoints = response.body.data.forecast.length;
        if (timeHorizon === '6m') {
          expect(forecastPoints).toBeLessThanOrEqual(6);
        } else if (timeHorizon === '1y') {
          expect(forecastPoints).toBeLessThanOrEqual(12);
        }
      }
    });

    test('should include wedding seasonality in forecasts', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/revenue-forecasting')
        .set(validAuth)
        .send({
          timeHorizon: '1y',
          scenario: 'realistic',
          includeSeasonality: true,
        })
        .expect(200);

      expect(response.body.data.seasonalPatterns).toBeDefined();
      expect(response.body.data.seasonalPatterns.length).toBe(12); // 12 months

      // Peak wedding season (May-September) should have higher multipliers
      const peakMonths = response.body.data.seasonalPatterns.filter(
        (month: any) =>
          ['May', 'June', 'July', 'August', 'September'].includes(month.month),
      );

      const avgPeakMultiplier =
        peakMonths.reduce(
          (sum: number, month: any) => sum + month.weddingSeasonImpact,
          0,
        ) / peakMonths.length;

      expect(avgPeakMultiplier).toBeGreaterThan(1.1); // At least 10% increase
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should handle network timeouts gracefully', async () => {
      // Mock a slow endpoint
      const response = await request(baseURL)
        .post('/api/ml/predictions/wedding-trends')
        .set(validAuth)
        .timeout(100) // Very short timeout
        .send({
          weddingData: generateTestWedding(),
          timeRange: '6m',
        })
        .catch((err) => err);

      expect(response.code).toBe('ECONNABORTED');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/wedding-trends')
        .set(validAuth)
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid JSON');
    });

    test('should handle database connection errors', async () => {
      // Mock database connection failure
      process.env.ML_DB_ENABLED = 'false';

      const response = await request(baseURL)
        .post('/api/ml/predictions/churn-risk')
        .set(validAuth)
        .send({
          timeRange: '30d',
          includeInterventions: true,
        })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Service temporarily unavailable');

      // Reset
      process.env.ML_DB_ENABLED = 'true';
    });
  });

  describe('Performance and Load Testing', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should handle burst traffic efficiently', async () => {
      const burstRequests = Array.from({ length: 20 }, (_, i) => ({
        endpoint: '/api/ml/predictions/wedding-trends',
        payload: {
          weddingData: generateTestWedding({ id: `burst-${i}` }),
          timeRange: '6m',
          includeSeasonality: true,
        },
      }));

      const startTime = performance.now();
      const responses = await Promise.allSettled(
        burstRequests.map(({ endpoint, payload }) =>
          request(baseURL).post(endpoint).set(validAuth).send(payload),
        ),
      );
      const totalTime = performance.now() - startTime;

      // At least 80% should succeed
      const successfulResponses = responses.filter(
        (r) => r.status === 'fulfilled' && (r.value as any).status === 200,
      );

      expect(successfulResponses.length / responses.length).toBeGreaterThan(
        0.8,
      );

      // Average response time should still be reasonable
      const avgTime = totalTime / burstRequests.length;
      expect(avgTime).toBeLessThan(500); // 500ms average under burst load
    });

    test('should handle mixed prediction types concurrently', async () => {
      const mixedRequests = [
        {
          endpoint: '/api/ml/predictions/wedding-trends',
          payload: {
            weddingData: generateTestWedding(),
            timeRange: '6m',
          },
        },
        {
          endpoint: '/api/ml/predictions/budget-optimization',
          payload: {
            totalBudget: 30000,
            guestCount: 120,
            region: 'london',
            venueType: 'indoor',
          },
        },
        {
          endpoint: '/api/ml/predictions/vendor-performance',
          payload: {
            timeRange: '30d',
            category: 'photography',
          },
        },
        {
          endpoint: '/api/ml/predictions/churn-risk',
          payload: {
            timeRange: '90d',
            tier: 'professional',
          },
        },
        {
          endpoint: '/api/ml/predictions/revenue-forecasting',
          payload: {
            timeHorizon: '1y',
            scenario: 'realistic',
          },
        },
      ];

      const responses = await Promise.all(
        mixedRequests.map(({ endpoint, payload }) =>
          request(baseURL).post(endpoint).set(validAuth).send(payload),
        ),
      );

      // All different prediction types should work concurrently
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Data Quality and Validation', () => {
    const validAuth = { Authorization: 'Bearer test-token' };

    test('should validate data quality scores in responses', async () => {
      const response = await request(baseURL)
        .post('/api/ml/predictions/wedding-trends')
        .set(validAuth)
        .send({
          weddingData: generateTestWedding(),
          timeRange: '6m',
          includeSeasonality: true,
        })
        .expect(200);

      // Response should include data quality metrics
      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.dataQuality).toBeDefined();
      expect(response.body.data.metadata.dataQuality.score).toBeGreaterThan(0);
      expect(response.body.data.metadata.dataQuality.score).toBeLessThanOrEqual(
        1,
      );

      // Should include quality indicators
      expect(response.body.data.metadata.dataQuality.indicators).toBeDefined();
      expect(
        response.body.data.metadata.dataQuality.indicators.completeness,
      ).toBeDefined();
      expect(
        response.body.data.metadata.dataQuality.indicators.accuracy,
      ).toBeDefined();
      expect(
        response.body.data.metadata.dataQuality.indicators.consistency,
      ).toBeDefined();
    });

    test('should handle partial data gracefully', async () => {
      const partialWeddingData = {
        date: new Date(2024, 5, 15),
        region: 'london',
        // Missing venue, guestCount, budget
      };

      const response = await request(baseURL)
        .post('/api/ml/predictions/wedding-trends')
        .set(validAuth)
        .send({
          weddingData: partialWeddingData,
          timeRange: '6m',
          handlePartialData: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should include warnings about partial data
      expect(response.body.data.metadata.warnings).toBeDefined();
      expect(response.body.data.metadata.warnings.length).toBeGreaterThan(0);

      // Confidence should be lower for partial data
      expect(response.body.data.confidence).toBeLessThan(0.8);
    });
  });
});
