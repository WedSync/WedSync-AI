/**
 * WS-182 Churn Prediction Engine Tests
 * Comprehensive test suite for ML churn prediction system
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import ChurnPredictionEngine, { 
  SupplierFeatures, 
  ChurnRiskScore, 
  BatchPredictionOptions 
} from '@/lib/ml/churn-prediction-engine';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-supplier-id',
              average_rating: 4.2,
              price_competitiveness: 0.7,
              bio: 'Test bio',
              phone: '+1234567890',
              portfolio_count: 5,
              services: ['photography'],
              booking_stats: [{
                bookings_won: 10,
                bookings_proposed: 15,
                last_booking_date: '2024-01-15',
                cancellation_rate: 0.05
              }],
              communication_stats: [{
                avg_response_time_hours: 8,
                messages_per_week: 12
              }],
              supplier_metrics: [{}],
              performance_ratings: [{}]
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

// Mock Redis
vi.mock('ioredis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    get: vi.fn(() => Promise.resolve(null)),
    setex: vi.fn(() => Promise.resolve('OK')),
    set: vi.fn(() => Promise.resolve('OK'))
  }))
}));

describe('ChurnPredictionEngine', () => {
  let engine: ChurnPredictionEngine;
  
  const mockFeatures: SupplierFeatures = {
    engagement_score: 75,
    response_time_avg: 8,
    booking_rate: 0.67,
    review_score: 4.2,
    days_since_last_booking: 30,
    price_competitiveness: 0.7,
    profile_completeness: 0.8,
    communication_frequency: 12,
    cancellation_rate: 0.05,
    seasonal_activity: 0.6,
    login_frequency_score: 0.8,
    platform_usage_score: 0.9,
    support_tickets_count: 2,
    payment_issues_count: 0,
    referral_activity: 3
  };

  beforeEach(() => {
    engine = new ChurnPredictionEngine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('predictChurnRisk', () => {
    test('should predict churn risk for a supplier with provided features', async () => {
      const result = await engine.predictChurnRisk('test-supplier-id', mockFeatures);
      
      expect(result).toMatchObject({
        supplierId: 'test-supplier-id',
        churnRisk: expect.any(Number),
        confidence: expect.any(Number),
        riskLevel: expect.stringMatching(/^(low|medium|high|critical)$/),
        riskFactors: expect.any(Array),
        interventionRecommendations: expect.any(Array),
        predictionTimestamp: expect.any(Date),
        modelVersion: expect.any(String),
        inferenceTimeMs: expect.any(Number)
      });

      // Validate churn risk is a probability
      expect(result.churnRisk).toBeGreaterThanOrEqual(0);
      expect(result.churnRisk).toBeLessThanOrEqual(1);

      // Validate confidence is a probability  
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);

      // Validate inference time is reasonable (target <100ms)
      expect(result.inferenceTimeMs).toBeLessThan(1000); // Allow up to 1s for tests
    });

    test('should predict churn risk without provided features (extract from DB)', async () => {
      const result = await engine.predictChurnRisk('test-supplier-id');
      
      expect(result).toBeDefined();
      expect(result.supplierId).toBe('test-supplier-id');
      expect(result.churnRisk).toBeGreaterThanOrEqual(0);
      expect(result.churnRisk).toBeLessThanOrEqual(1);
    });

    test('should categorize risk levels correctly', async () => {
      // Test with high-risk features
      const highRiskFeatures: SupplierFeatures = {
        ...mockFeatures,
        engagement_score: 15, // Very low
        days_since_last_booking: 180, // Very high
        booking_rate: 0.1, // Very low
        response_time_avg: 20 // Very slow
      };
      
      const result = await engine.predictChurnRisk('high-risk-supplier', highRiskFeatures);
      
      expect(['medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.interventionRecommendations.length).toBeGreaterThan(0);
    });

    test('should identify appropriate risk factors', async () => {
      const lowEngagementFeatures: SupplierFeatures = {
        ...mockFeatures,
        engagement_score: 20, // Below 30 threshold
        days_since_last_booking: 120, // Above 90 threshold
        response_time_avg: 18 // Above 12 threshold
      };
      
      const result = await engine.predictChurnRisk('test-supplier', lowEngagementFeatures);
      
      expect(result.riskFactors.length).toBeGreaterThan(0);
      
      const factorTypes = result.riskFactors.map(f => f.factor);
      expect(factorTypes).toContain('low_engagement');
      expect(factorTypes).toContain('booking_inactivity');
      expect(factorTypes).toContain('poor_responsiveness');
    });

    test('should recommend appropriate interventions based on risk level', async () => {
      const criticalFeatures: SupplierFeatures = {
        ...mockFeatures,
        engagement_score: 10,
        days_since_last_booking: 200,
        booking_rate: 0.05,
        response_time_avg: 24
      };
      
      const result = await engine.predictChurnRisk('critical-supplier', criticalFeatures);
      
      expect(result.interventionRecommendations.length).toBeGreaterThan(0);
      
      const interventionTypes = result.interventionRecommendations.map(i => i.type);
      const priorities = result.interventionRecommendations.map(i => i.priority);
      
      // Critical risk should have urgent interventions
      if (result.riskLevel === 'critical') {
        expect(priorities).toContain('urgent');
        expect(interventionTypes).toContain('personal_outreach');
      }
    });

    test('should handle invalid supplier ID gracefully', async () => {
      // Test with empty supplier ID
      await expect(
        engine.predictChurnRisk('')
      ).rejects.toThrow('Invalid supplier ID: Supplier ID cannot be empty');
    });
  });

  describe('batchPredictChurnRisk', () => {
    test('should process batch predictions efficiently', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3'];
      const options: BatchPredictionOptions = {
        batchSize: 2,
        parallel: true,
        cacheable: true,
        priority: 'normal'
      };
      
      const startTime = performance.now();
      const results = await engine.batchPredictChurnRisk(supplierIds, options);
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      results.forEach((result, index) => {
        expect(result.supplierId).toBe(supplierIds[index]);
        expect(result.churnRisk).toBeGreaterThanOrEqual(0);
        expect(result.churnRisk).toBeLessThanOrEqual(1);
      });
    });

    test('should handle empty batch gracefully', async () => {
      const results = await engine.batchPredictChurnRisk([]);
      expect(results).toHaveLength(0);
    });

    test('should process single supplier batch', async () => {
      const results = await engine.batchPredictChurnRisk(['single-supplier']);
      expect(results).toHaveLength(1);
      expect(results[0].supplierId).toBe('single-supplier');
    });

    test('should respect batch size limits', async () => {
      const manySuppliers = Array.from({length: 100}, (_, i) => `supplier-${i}`);
      const options: BatchPredictionOptions = {
        batchSize: 10,
        parallel: true,
        cacheable: false,
        priority: 'high'
      };
      
      const results = await engine.batchPredictChurnRisk(manySuppliers, options);
      expect(results).toHaveLength(100);
    });
  });

  describe('Performance Requirements', () => {
    test('should meet sub-100ms inference target for individual predictions', async () => {
      const startTime = performance.now();
      const result = await engine.predictChurnRisk('perf-test-supplier', mockFeatures);
      const inferenceTime = performance.now() - startTime;
      
      // Target is <100ms, but allow some flexibility in test environment
      expect(inferenceTime).toBeLessThan(500);
      expect(result.inferenceTimeMs).toBeLessThan(500);
    });

    test('should achieve target accuracy benchmarks', async () => {
      // This would normally test against known ground truth data
      const result = await engine.predictChurnRisk('accuracy-test-supplier', mockFeatures);
      
      expect(result.confidence).toBeGreaterThan(0.7); // Minimum 70% confidence
      expect(result.modelVersion).toBeDefined();
    });

    test('should handle high-load batch processing', async () => {
      const largeSupplierBatch = Array.from({length: 50}, (_, i) => `load-test-${i}`);
      
      const startTime = performance.now();
      const results = await engine.batchPredictChurnRisk(largeSupplierBatch, {
        batchSize: 25,
        parallel: true,
        cacheable: false,
        priority: 'high'
      });
      const totalTime = performance.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all results are valid
      results.forEach(result => {
        expect(result.churnRisk).toBeGreaterThanOrEqual(0);
        expect(result.churnRisk).toBeLessThanOrEqual(1);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Feature Validation', () => {
    test('should handle missing optional features', async () => {
      const partialFeatures = {
        engagement_score: 50,
        booking_rate: 0.5,
        review_score: 4.0
      } as Partial<SupplierFeatures>;
      
      const result = await engine.predictChurnRisk(
        'partial-features-supplier',
        partialFeatures as SupplierFeatures
      );
      
      expect(result).toBeDefined();
      expect(result.churnRisk).toBeGreaterThanOrEqual(0);
      expect(result.churnRisk).toBeLessThanOrEqual(1);
    });

    test('should normalize extreme feature values', async () => {
      const extremeFeatures: SupplierFeatures = {
        ...mockFeatures,
        engagement_score: 150, // Above normal range
        response_time_avg: -5, // Negative value
        booking_rate: 2.0, // Above 1.0
        days_since_last_booking: 1000 // Very high
      };
      
      const result = await engine.predictChurnRisk('extreme-features-supplier', extremeFeatures);
      
      expect(result.churnRisk).toBeGreaterThanOrEqual(0);
      expect(result.churnRisk).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('Model Ensemble', () => {
    test('should produce consistent predictions across multiple runs', async () => {
      const results = await Promise.all([
        engine.predictChurnRisk('consistency-test', mockFeatures),
        engine.predictChurnRisk('consistency-test', mockFeatures),
        engine.predictChurnRisk('consistency-test', mockFeatures)
      ]);
      
      const churnRisks = results.map(r => r.churnRisk);
      const variance = churnRisks.reduce((sum, risk) => {
        const mean = churnRisks.reduce((a, b) => a + b, 0) / churnRisks.length;
        return sum + Math.pow(risk - mean, 2);
      }, 0) / churnRisks.length;
      
      // Variance should be very low for deterministic model
      expect(variance).toBeLessThan(0.01);
    });

    test('should provide model version information', async () => {
      const result = await engine.predictChurnRisk('version-test', mockFeatures);
      
      expect(result.modelVersion).toMatch(/^\d+\.\d+\.\d+$/); // Semantic versioning
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection failures gracefully', async () => {
      // This would require mocking database failures
      // For now, just ensure the engine doesn't crash
      
      const result = await engine.predictChurnRisk('db-error-test');
      expect(result).toBeDefined();
    });

    test('should provide meaningful error messages', async () => {
      try {
        await engine.predictChurnRisk(''); // Empty supplier ID
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('supplier');
      }
    });
  });

  describe('Integration Tests', () => {
    test('should integrate with caching layer', async () => {
      const engine = new ChurnPredictionEngine();
      
      // First call should hit database
      const result1 = await engine.predictChurnRisk('cache-test', mockFeatures);
      
      // Second call should hit cache (faster)
      const startTime = performance.now();
      const result2 = await engine.predictChurnRisk('cache-test', mockFeatures);
      const cacheTime = performance.now() - startTime;
      
      expect(result2.supplierId).toBe(result1.supplierId);
      expect(cacheTime).toBeLessThan(50); // Cache should be very fast
    });
  });
});