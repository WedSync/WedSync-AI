/**
 * WS-240: AI Cost Optimization System - Cost Reduction Validation Tests
 * Team E - Round 1: Comprehensive testing ensuring 75% cost reduction accuracy
 * 
 * CRITICAL SUCCESS CRITERIA:
 * - Photography studio: 12,000 photos £240→£60 (exactly £180 savings, 75% reduction)
 * - Venue management: 50 events £400→£120 (exactly £280 savings, 70% reduction)  
 * - Catering business: 50 items £150→£45 (exactly £105 savings, 70% reduction)
 * - Cache hit rate: Must achieve 70%+ consistently
 * - Processing time: Must be <100ms for real-time tracking
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  CostOptimizationEngine,
  WeddingIndustryCostModel,
  WeddingSeasonLoadSimulator,
  type CostOptimizationResult
} from './cost-calculation-engines';

describe('WS-240: AI Cost Optimization System - Validation Tests', () => {
  let optimizationEngine: CostOptimizationEngine;
  let seasonSimulator: WeddingSeasonLoadSimulator;

  beforeEach(() => {
    optimizationEngine = new CostOptimizationEngine();
    seasonSimulator = new WeddingSeasonLoadSimulator();
  });

  describe('Photography Studio Cost Optimization - "Capture Moments" Scenario', () => {
    test('should achieve exactly 75% cost reduction for 12,000 photos (£240→£60)', async () => {
      // CRITICAL TEST: Photography studio "Capture Moments" processes 12,000 photos in June
      const photoCount = 12000;
      const expectedOriginalCost = 240.00; // £0.02 per photo * 12,000
      const expectedOptimizedCost = 60.00; // 75% reduction target
      const expectedSavings = 180.00; // £240 - £60
      
      // Set optimal cache hit rate for maximum savings
      optimizationEngine.setCacheHitRate(0.75); // 75% cache hits
      
      const result = optimizationEngine.optimizePhotographyCosts(photoCount);
      
      // Verify exact cost reduction claims
      expect(result.originalCost).toBe(expectedOriginalCost);
      expect(result.optimizedCost).toBe(expectedOptimizedCost);
      expect(result.savingsAmount).toBe(expectedSavings);
      expect(result.savingsPercentage).toBe(75.00);
      
      // Verify cache performance
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.70);
      
      // Verify processing time for real-time tracking
      expect(result.processingTimeMs).toBeLessThan(100);
      
      // Verify detailed cost breakdown
      expect(result.breakdown.baseCost).toBe(240.00);
      expect(result.breakdown.cacheReduction).toBeGreaterThan(0);
      expect(result.breakdown.batchReduction).toBeGreaterThan(0);
      expect(result.breakdown.modelReduction).toBeGreaterThan(0);
      expect(result.breakdown.finalCost).toBe(60.00);
      
      console.log('📸 Photography Studio Test Results:', {
        originalCost: `£${result.originalCost}`,
        optimizedCost: `£${result.optimizedCost}`,
        savings: `£${result.savingsAmount} (${result.savingsPercentage}%)`,
        cacheHitRate: `${(result.cacheHitRate * 100).toFixed(1)}%`,
        processingTime: `${result.processingTimeMs.toFixed(2)}ms`
      });
    });

    test('should maintain quality with varying cache hit rates', () => {
      const photoCount = 12000;
      const testCacheRates = [0.70, 0.75, 0.80, 0.85];
      
      testCacheRates.forEach(cacheRate => {
        optimizationEngine.setCacheHitRate(cacheRate);
        const result = optimizationEngine.optimizePhotographyCosts(photoCount);
        
        // Higher cache rates should yield better savings
        expect(result.savingsPercentage).toBeGreaterThan(60); // Minimum 60% savings
        expect(result.cacheHitRate).toBe(cacheRate);
        expect(result.processingTimeMs).toBeLessThan(100);
      });
    });

    test('should validate photo processing cost model accuracy', () => {
      const testCases = [
        { photos: 1000, expectedCost: 20.00 },
        { photos: 5000, expectedCost: 100.00 },
        { photos: 12000, expectedCost: 240.00 },
        { photos: 20000, expectedCost: 400.00 }
      ];
      
      testCases.forEach(({ photos, expectedCost }) => {
        const costs = WeddingIndustryCostModel.getPhotographyCosts(photos);
        expect(costs.baseProcessingCost).toBe(expectedCost);
      });
    });
  });

  describe('Venue Management Cost Optimization - "Elegant Events" Scenario', () => {
    test('should achieve 70% cost reduction for 50 events (£400→£120)', () => {
      const eventCount = 50;
      const expectedOriginalCost = 400.00; // £8.00 per event * 50
      const expectedOptimizedCost = 120.00; // 70% reduction target
      const expectedSavings = 280.00;
      
      optimizationEngine.setCacheHitRate(0.75);
      const result = optimizationEngine.optimizeVenueCosts(eventCount);
      
      expect(result.originalCost).toBe(expectedOriginalCost);
      expect(result.optimizedCost).toBe(expectedOptimizedCost);
      expect(result.savingsAmount).toBe(expectedSavings);
      expect(result.savingsPercentage).toBe(70.00);
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.70);
      expect(result.processingTimeMs).toBeLessThan(100);
      
      console.log('🏛️ Venue Management Test Results:', {
        originalCost: `£${result.originalCost}`,
        optimizedCost: `£${result.optimizedCost}`,
        savings: `£${result.savingsAmount} (${result.savingsPercentage}%)`,
        cacheHitRate: `${(result.cacheHitRate * 100).toFixed(1)}%`
      });
    });

    test('should validate venue cost scaling', () => {
      const testCases = [
        { events: 10, expectedCost: 80.00 },
        { events: 25, expectedCost: 200.00 },
        { events: 50, expectedCost: 400.00 },
        { events: 100, expectedCost: 800.00 }
      ];
      
      testCases.forEach(({ events, expectedCost }) => {
        const costs = WeddingIndustryCostModel.getVenueCosts(events);
        expect(costs.baseProcessingCost).toBe(expectedCost);
      });
    });
  });

  describe('Catering Business Cost Optimization - "Gourmet Weddings" Scenario', () => {
    test('should achieve 70% cost reduction for 50 menu items (£150→£45)', () => {
      const menuItemCount = 50;
      const expectedOriginalCost = 150.00; // £3.00 per item * 50
      const expectedOptimizedCost = 45.00; // 70% reduction target
      const expectedSavings = 105.00;
      
      optimizationEngine.setCacheHitRate(0.75);
      const result = optimizationEngine.optimizeCateringCosts(menuItemCount);
      
      expect(result.originalCost).toBe(expectedOriginalCost);
      expect(result.optimizedCost).toBe(expectedOptimizedCost);
      expect(result.savingsAmount).toBe(expectedSavings);
      expect(result.savingsPercentage).toBe(70.00);
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.70);
      expect(result.processingTimeMs).toBeLessThan(100);
      
      console.log('🍽️ Catering Business Test Results:', {
        originalCost: `£${result.originalCost}`,
        optimizedCost: `£${result.optimizedCost}`,
        savings: `£${result.savingsAmount} (${result.savingsPercentage}%)`,
        cacheHitRate: `${(result.cacheHitRate * 100).toFixed(1)}%`
      });
    });

    test('should validate menu optimization efficiency', () => {
      const testSizes = [10, 25, 50, 100];
      
      testSizes.forEach(size => {
        optimizationEngine.setCacheHitRate(0.75);
        const result = optimizationEngine.optimizeCateringCosts(size);
        
        // Larger menus should benefit more from batch processing
        expect(result.savingsPercentage).toBeGreaterThan(65);
        expect(result.breakdown.batchReduction).toBeGreaterThan(0);
      });
    });
  });

  describe('Wedding Planning Cost Optimization - "Perfect Day Planners" Scenario', () => {
    test('should achieve 75% cost reduction for 50 timeline items (£200→£50)', () => {
      const timelineItemCount = 50;
      const expectedOriginalCost = 200.00; // £4.00 per item * 50
      const expectedOptimizedCost = 50.00; // 75% reduction target
      const expectedSavings = 150.00;
      
      optimizationEngine.setCacheHitRate(0.75);
      const result = optimizationEngine.optimizePlanningCosts(timelineItemCount);
      
      expect(result.originalCost).toBe(expectedOriginalCost);
      expect(result.optimizedCost).toBe(expectedOptimizedCost);
      expect(result.savingsAmount).toBe(expectedSavings);
      expect(result.savingsPercentage).toBe(75.00);
      expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.70);
      expect(result.processingTimeMs).toBeLessThan(100);
      
      console.log('📋 Wedding Planning Test Results:', {
        originalCost: `£${result.originalCost}`,
        optimizedCost: `£${result.optimizedCost}`,
        savings: `£${result.savingsAmount} (${result.savingsPercentage}%)`,
        cacheHitRate: `${(result.cacheHitRate * 100).toFixed(1)}%`
      });
    });
  });

  describe('Wedding Season Load Testing (March-October Peak)', () => {
    test('should handle peak season load with 1.6x volume increase', () => {
      const peakMonths = [3, 4, 5, 6, 7, 8, 9, 10]; // March-October
      const offSeasonMonths = [1, 2, 11, 12]; // Jan, Feb, Nov, Dec
      
      // Test peak season performance
      peakMonths.forEach(month => {
        const result = seasonSimulator.simulatePeakSeasonLoad('photography', 12000, month);
        
        // Should maintain reasonable performance even with increased load
        expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.70); // Minimum 70% even in peak
        expect(result.savingsPercentage).toBeGreaterThan(60); // Still significant savings
        expect(result.processingTimeMs).toBeLessThan(150); // Slightly higher but acceptable
      });
      
      // Test off-season performance
      offSeasonMonths.forEach(month => {
        const result = seasonSimulator.simulatePeakSeasonLoad('photography', 12000, month);
        
        // Should achieve optimal performance in off-season
        expect(result.cacheHitRate).toBeGreaterThanOrEqual(0.75);
        expect(result.savingsPercentage).toBeGreaterThan(70);
        expect(result.processingTimeMs).toBeLessThan(100);
      });
    });

    test('should validate cache performance during peak season', () => {
      const cachePerformanceValid = seasonSimulator.validateCachePerformance(0.70);
      expect(cachePerformanceValid).toBe(true);
    });

    test('should simulate realistic wedding season load patterns', () => {
      // June peak season test - highest wedding volume
      const juneResult = seasonSimulator.simulatePeakSeasonLoad('photography', 12000, 6);
      
      // December off-season test - lowest wedding volume  
      const decemberResult = seasonSimulator.simulatePeakSeasonLoad('photography', 12000, 12);
      
      // Peak season should handle more volume but with slightly reduced efficiency
      expect(juneResult.originalCost).toBeGreaterThan(decemberResult.originalCost);
      expect(juneResult.cacheHitRate).toBeGreaterThanOrEqual(0.70);
      expect(decemberResult.cacheHitRate).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe('Real-time Cost Tracking Precision Tests', () => {
    test('should provide sub-100ms cost calculations for real-time tracking', () => {
      const testScenarios = [
        { type: 'photography' as const, count: 1000 },
        { type: 'venue' as const, count: 10 },
        { type: 'catering' as const, count: 50 },
        { type: 'planning' as const, count: 25 }
      ];
      
      testScenarios.forEach(scenario => {
        const startTime = performance.now();
        
        let result: CostOptimizationResult;
        switch (scenario.type) {
          case 'photography':
            result = optimizationEngine.optimizePhotographyCosts(scenario.count);
            break;
          case 'venue':
            result = optimizationEngine.optimizeVenueCosts(scenario.count);
            break;
          case 'catering':
            result = optimizationEngine.optimizeCateringCosts(scenario.count);
            break;
          case 'planning':
            result = optimizationEngine.optimizePlanningCosts(scenario.count);
            break;
        }
        
        const endTime = performance.now();
        const actualProcessingTime = endTime - startTime;
        
        expect(actualProcessingTime).toBeLessThan(100);
        expect(result.processingTimeMs).toBeLessThan(100);
        expect(result.savingsPercentage).toBeGreaterThan(60);
      });
    });

    test('should maintain accuracy under concurrent load', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve(optimizationEngine.optimizePhotographyCosts(1000 + i * 100))
      );
      
      const results = await Promise.all(concurrentRequests);
      
      results.forEach((result, index) => {
        expect(result.processingTimeMs).toBeLessThan(100);
        expect(result.savingsPercentage).toBeGreaterThan(60);
        expect(result.originalCost).toBe(20 + index * 2); // £0.02 * (1000 + index * 100)
      });
    });
  });

  describe('Cache Performance Validation', () => {
    test('should consistently achieve 70%+ cache hit rates', () => {
      const iterations = 100;
      let totalHitRate = 0;
      
      for (let i = 0; i < iterations; i++) {
        optimizationEngine.setCacheHitRate(0.75);
        const result = optimizationEngine.optimizePhotographyCosts(1000);
        totalHitRate += result.cacheHitRate;
      }
      
      const averageHitRate = totalHitRate / iterations;
      expect(averageHitRate).toBeGreaterThanOrEqual(0.70);
    });

    test('should degrade gracefully with poor cache performance', () => {
      const poorCacheRate = 0.50; // 50% cache hits
      optimizationEngine.setCacheHitRate(poorCacheRate);
      
      const result = optimizationEngine.optimizePhotographyCosts(12000);
      
      // Should still provide meaningful savings even with poor cache
      expect(result.savingsPercentage).toBeGreaterThan(40);
      expect(result.cacheHitRate).toBe(poorCacheRate);
    });
  });

  describe('Cost Breakdown Accuracy Validation', () => {
    test('should provide accurate cost breakdown components', () => {
      optimizationEngine.setCacheHitRate(0.75);
      const result = optimizationEngine.optimizePhotographyCosts(12000);
      
      // Verify breakdown adds up correctly
      const expectedFinalCost = result.breakdown.baseCost 
        - result.breakdown.cacheReduction 
        - result.breakdown.batchReduction 
        - result.breakdown.modelReduction;
        
      expect(Math.abs(result.breakdown.finalCost - expectedFinalCost)).toBeLessThan(0.01);
      expect(result.breakdown.baseCost).toBe(result.originalCost);
      expect(result.breakdown.finalCost).toBe(result.optimizedCost);
    });

    test('should validate reduction component contributions', () => {
      optimizationEngine.setCacheHitRate(0.75);
      const result = optimizationEngine.optimizePhotographyCosts(12000);
      
      // Cache reduction should be the largest component
      expect(result.breakdown.cacheReduction).toBeGreaterThan(result.breakdown.batchReduction);
      expect(result.breakdown.cacheReduction).toBeGreaterThan(result.breakdown.modelReduction);
      
      // All reductions should be positive
      expect(result.breakdown.cacheReduction).toBeGreaterThan(0);
      expect(result.breakdown.batchReduction).toBeGreaterThan(0);
      expect(result.breakdown.modelReduction).toBeGreaterThan(0);
    });
  });
});