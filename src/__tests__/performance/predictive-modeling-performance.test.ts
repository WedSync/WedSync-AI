/**
 * WS-232: Predictive Modeling System - Performance Tests
 * Team: team-c (Integration)
 *
 * Comprehensive performance testing for ML prediction system
 * Tests throughput, latency, concurrency, and resource usage
 */

import { describe, it, expect, beforeAll, afterAll } from 'jest';
import { performance } from 'perf_hooks';
import { PredictiveModelingService } from '@/lib/services/predictive-modeling-service';
import { createClient } from '@supabase/supabase-js';
import type {
  PredictionInput,
  PredictionResult,
  PredictionType,
  BudgetOptimizationData,
  VendorPerformanceData,
  GuestAttendanceData,
} from '@/lib/services/predictive-modeling-service';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  SINGLE_PREDICTION_MAX_TIME: 3000, // 3 seconds
  BATCH_10_MAX_TIME: 10000, // 10 seconds for 10 predictions
  BATCH_50_MAX_TIME: 30000, // 30 seconds for 50 predictions
  CONCURRENT_10_MAX_TIME: 5000, // 5 seconds for 10 concurrent predictions
  MEMORY_USAGE_MAX_MB: 500, // Max memory usage in MB
  CPU_INTENSIVE_MAX_TIME: 15000, // 15 seconds for CPU intensive operations
};

// Test data generators
function generateBudgetData(count: number): BudgetOptimizationData[] {
  return Array.from({ length: count }, (_, i) => ({
    totalBudget: 15000 + i * 1000,
    currentSpending: 8000 + i * 500,
    guestCount: 80 + i * 10,
    weddingType: i % 2 === 0 ? 'indoor' : 'outdoor',
    region: ['London', 'Manchester', 'Birmingham', 'Leeds'][i % 4],
    seasonality: ['spring', 'summer', 'autumn', 'winter'][i % 4],
    preferredVendors: ['photographer', 'caterer', 'florist'].slice(
      0,
      (i % 3) + 1,
    ),
    priorityCategories: ['venue', 'photography', 'catering'].slice(
      0,
      (i % 3) + 1,
    ),
  }));
}

function generateVendorData(count: number): VendorPerformanceData[] {
  return Array.from({ length: count }, (_, i) => ({
    vendorId: `vendor-${i}`,
    serviceType: ['photography', 'catering', 'florist', 'venue'][i % 4],
    pastEvents: 10 + i * 2,
    averageRating: 3.5 + Math.random() * 1.5,
    responseTime: 2 + Math.random() * 48, // hours
    completionRate: 0.85 + Math.random() * 0.15,
    clientFeedback: Array.from({ length: 3 }, () => ({
      rating: 4 + Math.floor(Math.random() * 2),
      feedback: 'Good service',
      weddingDate: new Date(
        2024,
        Math.floor(Math.random() * 12),
        Math.floor(Math.random() * 28),
      ),
    })),
    priceRange: { min: 500, max: 2000 },
    availability: Array.from({ length: 30 }, (_, j) => ({
      date: new Date(2025, 5, j + 1),
      available: Math.random() > 0.3,
    })),
  }));
}

function generateGuestData(count: number): GuestAttendanceData[] {
  return Array.from({ length: count }, (_, i) => ({
    totalInvited: 100 + i * 20,
    weddingDate: new Date(2025, 5 + (i % 6), 15),
    dayOfWeek: ['saturday', 'sunday', 'friday'][i % 3],
    season: ['spring', 'summer', 'autumn', 'winter'][i % 4],
    locationType: ['local', 'destination'][i % 2],
    timeOfDay: ['morning', 'afternoon', 'evening'][i % 3],
    guestCategories: {
      family: 30 + i * 2,
      friends: 40 + i * 3,
      colleagues: 20 + i * 1,
      plus_ones: 10 + i,
    },
    invitationMethod: 'digital',
    rsvpDeadline: new Date(2025, 4, 1),
    priorEvents: i % 5, // Previous events with same guest list
  }));
}

// Memory and CPU monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage = process.memoryUsage();

  start() {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
  }

  end() {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    return {
      executionTime: endTime - this.startTime,
      memoryDelta: {
        heapUsed:
          (endMemory.heapUsed - this.startMemory.heapUsed) / 1024 / 1024, // MB
        heapTotal:
          (endMemory.heapTotal - this.startMemory.heapTotal) / 1024 / 1024, // MB
        rss: (endMemory.rss - this.startMemory.rss) / 1024 / 1024, // MB
      },
    };
  }
}

describe('WS-232: Predictive Modeling Performance Tests', () => {
  let predictiveService: PredictiveModelingService;
  let supabaseClient: any;
  const testOrganizationId = 'test-org-performance';

  beforeAll(async () => {
    // Initialize service with test configuration
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    predictiveService = new PredictiveModelingService(supabaseClient);

    // Clean up any existing test data
    await supabaseClient
      .from('prediction_results')
      .delete()
      .eq('organization_id', testOrganizationId);
  });

  afterAll(async () => {
    // Clean up test data
    await supabaseClient
      .from('prediction_results')
      .delete()
      .eq('organization_id', testOrganizationId);
  });

  describe('Single Prediction Performance', () => {
    it('should complete budget optimization within performance threshold', async () => {
      const monitor = new PerformanceMonitor();
      const testData = generateBudgetData(1)[0];

      const input: PredictionInput = {
        organizationId: testOrganizationId,
        predictionType: 'budget_optimization',
        inputData: testData,
        options: {
          includeConfidenceScore: true,
          includeRecommendations: true,
        },
      };

      monitor.start();
      const result = await predictiveService.generatePrediction(input);
      const metrics = monitor.end();

      // Performance assertions
      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.SINGLE_PREDICTION_MAX_TIME,
      );
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(50); // Less than 50MB memory increase
      expect(result).toBeDefined();
      expect(result.predictionId).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);

      console.log(
        `Budget Optimization - Execution Time: ${metrics.executionTime.toFixed(2)}ms, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    });

    it('should complete vendor performance analysis within threshold', async () => {
      const monitor = new PerformanceMonitor();
      const testData = generateVendorData(1)[0];

      const input: PredictionInput = {
        organizationId: testOrganizationId,
        predictionType: 'vendor_performance',
        inputData: testData,
        options: {
          includeConfidenceScore: true,
          includeRecommendations: true,
        },
      };

      monitor.start();
      const result = await predictiveService.generatePrediction(input);
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.SINGLE_PREDICTION_MAX_TIME,
      );
      expect(result).toBeDefined();
      expect(result.result).toBeDefined();

      console.log(
        `Vendor Performance - Execution Time: ${metrics.executionTime.toFixed(2)}ms, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    });

    it('should complete guest attendance prediction within threshold', async () => {
      const monitor = new PerformanceMonitor();
      const testData = generateGuestData(1)[0];

      const input: PredictionInput = {
        organizationId: testOrganizationId,
        predictionType: 'guest_attendance',
        inputData: testData,
      };

      monitor.start();
      const result = await predictiveService.generatePrediction(input);
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.SINGLE_PREDICTION_MAX_TIME,
      );
      expect(result).toBeDefined();

      console.log(
        `Guest Attendance - Execution Time: ${metrics.executionTime.toFixed(2)}ms, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process 10 predictions efficiently', async () => {
      const monitor = new PerformanceMonitor();
      const budgetData = generateBudgetData(5);
      const vendorData = generateVendorData(5);

      const inputs: PredictionInput[] = [
        ...budgetData.map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: data,
        })),
        ...vendorData.map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'vendor_performance' as PredictionType,
          inputData: data,
        })),
      ];

      monitor.start();
      const results = await predictiveService.generateBatchPredictions(inputs);
      const metrics = monitor.end();

      // Performance assertions
      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BATCH_10_MAX_TIME,
      );
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(100); // Less than 100MB for 10 predictions
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.predictionId)).toBe(true);

      // Calculate average time per prediction
      const avgTimePerPrediction = metrics.executionTime / 10;
      expect(avgTimePerPrediction).toBeLessThan(1000); // Less than 1 second per prediction in batch

      console.log(
        `Batch 10 - Total Time: ${metrics.executionTime.toFixed(2)}ms, Avg per prediction: ${avgTimePerPrediction.toFixed(2)}ms, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    });

    it('should process 50 predictions within acceptable time', async () => {
      const monitor = new PerformanceMonitor();
      const budgetData = generateBudgetData(20);
      const vendorData = generateVendorData(15);
      const guestData = generateGuestData(15);

      const inputs: PredictionInput[] = [
        ...budgetData.map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: data,
        })),
        ...vendorData.map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'vendor_performance' as PredictionType,
          inputData: data,
        })),
        ...guestData.map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'guest_attendance' as PredictionType,
          inputData: data,
        })),
      ];

      monitor.start();
      const results = await predictiveService.generateBatchPredictions(inputs);
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BATCH_50_MAX_TIME,
      );
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(300); // Less than 300MB for 50 predictions
      expect(results).toHaveLength(50);

      const avgTimePerPrediction = metrics.executionTime / 50;
      console.log(
        `Batch 50 - Total Time: ${metrics.executionTime.toFixed(2)}ms, Avg per prediction: ${avgTimePerPrediction.toFixed(2)}ms, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    }, 35000); // 35 second timeout for this test

    it('should handle batch processing errors gracefully', async () => {
      const monitor = new PerformanceMonitor();

      // Create a mix of valid and invalid inputs
      const validInputs = generateBudgetData(5).map((data) => ({
        organizationId: testOrganizationId,
        predictionType: 'budget_optimization' as PredictionType,
        inputData: data,
      }));

      // Add some invalid inputs
      const invalidInputs = [
        {
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: { totalBudget: -1000 }, // Invalid budget
        },
        {
          organizationId: testOrganizationId,
          predictionType: 'vendor_performance' as PredictionType,
          inputData: null, // Invalid data
        },
      ];

      monitor.start();
      const results = await predictiveService.generateBatchPredictions([
        ...validInputs,
        ...invalidInputs,
      ]);
      const metrics = monitor.end();

      // Should complete within reasonable time even with errors
      expect(metrics.executionTime).toBeLessThan(10000);
      expect(results).toHaveLength(7); // 5 valid + 2 invalid (with error results)

      const successfulResults = results.filter((r) => !r.error);
      const errorResults = results.filter((r) => r.error);

      expect(successfulResults).toHaveLength(5);
      expect(errorResults).toHaveLength(2);

      console.log(
        `Batch with errors - Successful: ${successfulResults.length}, Errors: ${errorResults.length}, Time: ${metrics.executionTime.toFixed(2)}ms`,
      );
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent predictions efficiently', async () => {
      const monitor = new PerformanceMonitor();
      const testData = generateBudgetData(10);

      const predictionPromises = testData.map((data) =>
        predictiveService.generatePrediction({
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization',
          inputData: data,
        }),
      );

      monitor.start();
      const results = await Promise.all(predictionPromises);
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCURRENT_10_MAX_TIME,
      );
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.predictionId)).toBe(true);

      // Concurrent should be faster than sequential
      const concurrentTimePerPrediction = metrics.executionTime / 10;
      expect(concurrentTimePerPrediction).toBeLessThan(500); // Should be much faster than individual calls

      console.log(
        `Concurrent 10 - Total Time: ${metrics.executionTime.toFixed(2)}ms, Concurrent avg: ${concurrentTimePerPrediction.toFixed(2)}ms`,
      );
    });

    it('should handle mixed concurrent prediction types', async () => {
      const monitor = new PerformanceMonitor();

      const budgetInputs = generateBudgetData(3).map((data) => ({
        organizationId: testOrganizationId,
        predictionType: 'budget_optimization' as PredictionType,
        inputData: data,
      }));

      const vendorInputs = generateVendorData(3).map((data) => ({
        organizationId: testOrganizationId,
        predictionType: 'vendor_performance' as PredictionType,
        inputData: data,
      }));

      const guestInputs = generateGuestData(4).map((data) => ({
        organizationId: testOrganizationId,
        predictionType: 'guest_attendance' as PredictionType,
        inputData: data,
      }));

      const allPromises = [
        ...budgetInputs.map((input) =>
          predictiveService.generatePrediction(input),
        ),
        ...vendorInputs.map((input) =>
          predictiveService.generatePrediction(input),
        ),
        ...guestInputs.map((input) =>
          predictiveService.generatePrediction(input),
        ),
      ];

      monitor.start();
      const results = await Promise.all(allPromises);
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(8000); // 8 seconds for mixed concurrent
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.predictionId && r.result)).toBe(true);

      console.log(
        `Mixed Concurrent - Time: ${metrics.executionTime.toFixed(2)}ms, Types: Budget(3), Vendor(3), Guest(4)`,
      );
    });
  });

  describe('Database Performance', () => {
    it('should retrieve prediction history efficiently', async () => {
      const monitor = new PerformanceMonitor();

      // First, create some history data
      const testInputs = generateBudgetData(20).map((data) => ({
        organizationId: testOrganizationId,
        predictionType: 'budget_optimization' as PredictionType,
        inputData: data,
      }));

      await predictiveService.generateBatchPredictions(testInputs);

      // Test history retrieval performance
      monitor.start();
      const history = await predictiveService.getPredictionHistory(
        testOrganizationId,
        undefined,
        50,
      );
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(1000); // Should be very fast
      expect(history.length).toBeGreaterThan(0);

      console.log(
        `History Retrieval - Time: ${metrics.executionTime.toFixed(2)}ms, Records: ${history.length}`,
      );
    });

    it('should handle filtered history queries efficiently', async () => {
      const monitor = new PerformanceMonitor();

      monitor.start();
      const filteredHistory = await predictiveService.getPredictionHistory(
        testOrganizationId,
        'budget_optimization',
        25,
      );
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(500); // Filtered should be even faster
      expect(
        filteredHistory.every(
          (h) => h.predictionType === 'budget_optimization',
        ),
      ).toBe(true);

      console.log(
        `Filtered History - Time: ${metrics.executionTime.toFixed(2)}ms, Records: ${filteredHistory.length}`,
      );
    });

    it('should retrieve model performance metrics quickly', async () => {
      const monitor = new PerformanceMonitor();

      monitor.start();
      const performance = await predictiveService.getModelPerformance(
        testOrganizationId,
        'budget_optimization',
      );
      const metrics = monitor.end();

      expect(metrics.executionTime).toBeLessThan(2000); // 2 seconds for performance analysis
      expect(performance).toBeDefined();
      expect(performance.totalPredictions).toBeGreaterThan(0);

      console.log(
        `Model Performance Query - Time: ${metrics.executionTime.toFixed(2)}ms`,
      );
    });
  });

  describe('Memory Management', () => {
    it('should not have significant memory leaks', async () => {
      const initialMemory = process.memoryUsage();

      // Run multiple prediction cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        const inputs = generateBudgetData(10).map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: data,
        }));

        await predictiveService.generateBatchPredictions(inputs);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;

      // Memory increase should be reasonable after 50 predictions
      expect(memoryIncrease).toBeLessThan(
        PERFORMANCE_THRESHOLDS.MEMORY_USAGE_MAX_MB,
      );

      console.log(
        `Memory Usage Test - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${memoryIncrease.toFixed(2)}MB`,
      );
    }, 30000);
  });

  describe('Stress Testing', () => {
    it('should handle high-volume batch processing', async () => {
      const monitor = new PerformanceMonitor();

      // Create 100 predictions of mixed types
      const largeBatch: PredictionInput[] = [
        ...generateBudgetData(40).map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: data,
        })),
        ...generateVendorData(35).map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'vendor_performance' as PredictionType,
          inputData: data,
        })),
        ...generateGuestData(25).map((data) => ({
          organizationId: testOrganizationId,
          predictionType: 'guest_attendance' as PredictionType,
          inputData: data,
        })),
      ];

      monitor.start();
      const results =
        await predictiveService.generateBatchPredictions(largeBatch);
      const metrics = monitor.end();

      expect(results).toHaveLength(100);
      expect(metrics.executionTime).toBeLessThan(120000); // 2 minutes max for 100 predictions
      expect(metrics.memoryDelta.heapUsed).toBeLessThan(1000); // Less than 1GB

      const avgTimePerPrediction = metrics.executionTime / 100;
      const successRate = results.filter((r) => !r.error).length / 100;

      expect(successRate).toBeGreaterThan(0.95); // 95% success rate minimum

      console.log(
        `Stress Test 100 - Total Time: ${(metrics.executionTime / 1000).toFixed(2)}s, Avg: ${avgTimePerPrediction.toFixed(2)}ms, Success Rate: ${(successRate * 100).toFixed(1)}%, Memory: ${metrics.memoryDelta.heapUsed.toFixed(2)}MB`,
      );
    }, 150000); // 2.5 minute timeout

    it('should maintain performance under concurrent load', async () => {
      const monitor = new PerformanceMonitor();

      // Create 5 concurrent batches of 10 predictions each
      const batchPromises = Array.from({ length: 5 }, (_, batchIndex) => {
        const batchInputs = generateBudgetData(10).map((data) => ({
          organizationId: `${testOrganizationId}-batch-${batchIndex}`,
          predictionType: 'budget_optimization' as PredictionType,
          inputData: data,
        }));

        return predictiveService.generateBatchPredictions(batchInputs);
      });

      monitor.start();
      const batchResults = await Promise.all(batchPromises);
      const metrics = monitor.end();

      const totalResults = batchResults.flat();
      expect(totalResults).toHaveLength(50);
      expect(metrics.executionTime).toBeLessThan(20000); // 20 seconds for 50 concurrent predictions

      const successRate = totalResults.filter((r) => !r.error).length / 50;
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate under load

      console.log(
        `Concurrent Load Test - Time: ${metrics.executionTime.toFixed(2)}ms, Success Rate: ${(successRate * 100).toFixed(1)}%`,
      );
    }, 30000);
  });

  describe('Real-world Scenarios', () => {
    it('should handle peak wedding season load simulation', async () => {
      const monitor = new PerformanceMonitor();

      // Simulate 20 photographers each doing 5 weddings analysis
      const peakSeasonInputs: PredictionInput[] = [];

      for (let photographer = 0; photographer < 20; photographer++) {
        const orgId = `photographer-${photographer}`;

        // Each photographer analyzes 5 weddings
        for (let wedding = 0; wedding < 5; wedding++) {
          const budgetData = generateBudgetData(1)[0];
          const vendorData = generateVendorData(1)[0];
          const guestData = generateGuestData(1)[0];

          peakSeasonInputs.push(
            {
              organizationId: orgId,
              predictionType: 'budget_optimization',
              inputData: budgetData,
            },
            {
              organizationId: orgId,
              predictionType: 'vendor_performance',
              inputData: vendorData,
            },
            {
              organizationId: orgId,
              predictionType: 'guest_attendance',
              inputData: guestData,
            },
          );
        }
      }

      monitor.start();
      const results =
        await predictiveService.generateBatchPredictions(peakSeasonInputs);
      const metrics = monitor.end();

      expect(results).toHaveLength(300); // 20 photographers × 5 weddings × 3 prediction types
      expect(metrics.executionTime).toBeLessThan(180000); // 3 minutes max for peak season simulation

      const successRate = results.filter((r) => !r.error).length / 300;
      expect(successRate).toBeGreaterThan(0.85); // 85% success rate under peak load

      console.log(
        `Peak Season Simulation - ${(metrics.executionTime / 1000).toFixed(2)}s, Success Rate: ${(successRate * 100).toFixed(1)}%`,
      );
    }, 200000); // 3.5 minute timeout for this intensive test
  });
});

// Additional utility functions for performance testing
export class PredictionLoadTester {
  constructor(private service: PredictiveModelingService) {}

  async runLoadTest(
    concurrentUsers: number,
    predictionsPerUser: number,
  ): Promise<{
    totalTime: number;
    successRate: number;
    avgResponseTime: number;
    errors: string[];
  }> {
    const startTime = performance.now();
    const userPromises: Promise<PredictionResult[]>[] = [];
    const errors: string[] = [];

    for (let user = 0; user < concurrentUsers; user++) {
      const userInputs = generateBudgetData(predictionsPerUser).map((data) => ({
        organizationId: `load-test-user-${user}`,
        predictionType: 'budget_optimization' as PredictionType,
        inputData: data,
      }));

      const userPromise = this.service
        .generateBatchPredictions(userInputs)
        .catch((error) => {
          errors.push(`User ${user}: ${error.message}`);
          return [];
        });

      userPromises.push(userPromise);
    }

    const results = await Promise.all(userPromises);
    const endTime = performance.now();

    const allResults = results.flat();
    const totalPredictions = concurrentUsers * predictionsPerUser;
    const successfulPredictions = allResults.filter(
      (r) => r && !r.error,
    ).length;

    return {
      totalTime: endTime - startTime,
      successRate: successfulPredictions / totalPredictions,
      avgResponseTime: (endTime - startTime) / totalPredictions,
      errors,
    };
  }
}

// Export test utilities for use in other test files
export {
  generateBudgetData,
  generateVendorData,
  generateGuestData,
  PerformanceMonitor,
  PERFORMANCE_THRESHOLDS,
};
