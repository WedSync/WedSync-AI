import { describe, it, expect, beforeEach, afterEach } from 'jest';
import { AIPerformanceBenchmarker } from '@/test-utils/ai-performance-benchmarker';
import { WeddingOptimizationEngine } from '@/lib/ai/wedding-optimization-engine';
import { AIRecommendationEngine } from '@/lib/ai/ai-recommendation-engine';
import { generateWeddingTestScenarios } from '@/test-utils/wedding-scenario-generator';

// Helper functions to reduce function nesting - REFACTORED TO MEET 4-LEVEL LIMIT

/**
 * Optimizes single wedding scenario - HELPER TO REDUCE NESTING
 */
async function optimizeSingleWeddingScenario(
  scenario: any,
  optimizationEngine: WeddingOptimizationEngine
) {
  return optimizationEngine.optimizeWeddingPlan(scenario);
}

/**
 * Runs concurrent throughput test for given concurrency level - EXTRACTED TO REDUCE NESTING
 */
async function runConcurrencyTest(
  benchmarker: AIPerformanceBenchmarker,
  scenarios: any[],
  concurrency: number,
  optimizationEngine: WeddingOptimizationEngine
) {
  return await benchmarker.measureConcurrentThroughput(
    scenarios.slice(0, concurrency),
    (scenario) => optimizeSingleWeddingScenario(scenario, optimizationEngine),
  );
}

/**
 * Calculates single throughput ratio - HELPER TO REDUCE NESTING
 */
function calculateSingleThroughputRatio(
  result: any,
  index: number,
  results: any[]
): number {
  if (index === 0) return 0;
  return result.requestsPerSecond / results[index - 1].requestsPerSecond;
}

/**
 * Calculates throughput increase ratios - EXTRACTED TO REDUCE NESTING
 */
function calculateThroughputIncrease(throughputResults: any[]) {
  return throughputResults
    .map((result, i) => calculateSingleThroughputRatio(result, i, throughputResults))
    .slice(1);
}

/**
 * Checks if ratio meets scalability threshold - HELPER TO REDUCE NESTING
 */
function isRatioScalable(ratio: number): boolean {
  return ratio > 1.5;
}

/**
 * Validates scalability of throughput increase - EXTRACTED TO REDUCE NESTING
 */
function validateThroughputScalability(throughputIncrease: number[]) {
  expect(throughputIncrease.every(isRatioScalable)).toBe(true);
}

/**
 * Processes large scenarios for memory pressure testing - EXTRACTED TO REDUCE NESTING
 */
async function processLargeScenarios(
  scenarios: any[],
  optimizationEngine: WeddingOptimizationEngine
) {
  return Promise.all(
    scenarios.map((scenario) => optimizeSingleWeddingScenario(scenario, optimizationEngine))
  );
}

/**
 * Runs optimization with time constraint - HELPER TO REDUCE NESTING
 */
async function runOptimizationWithTimeLimit(
  optimizationEngine: WeddingOptimizationEngine,
  timeLimit: number
) {
  const scenario = generateWeddingTestScenarios.standard().request;
  return await optimizationEngine.optimizeWeddingPlan(scenario, {
    timeLimit,
  });
}

/**
 * Runs accuracy test under time constraint - EXTRACTED TO REDUCE NESTING
 */
async function runAccuracyTest(
  benchmarker: AIPerformanceBenchmarker,
  timeLimit: number,
  optimizationEngine: WeddingOptimizationEngine
) {
  return benchmarker.measureAccuracyUnderTimeConstraint(
    () => runOptimizationWithTimeLimit(optimizationEngine, timeLimit),
    {
      iterations: 10,
      timeLimit,
      accuracyThreshold: 0.8,
    },
  );
}

/**
 * Validates single accuracy result - HELPER TO REDUCE NESTING
 */
function validateSingleAccuracyResult(result: any) {
  if (result.timeLimit >= 3000) {
    // With 3+ seconds, should maintain high accuracy
    expect(result.accuracy).toBeGreaterThan(0.85);
    expect(result.completionRate).toBeGreaterThan(0.95);
  } else {
    // Under 3 seconds, accuracy may decrease but should still be reasonable
    expect(result.accuracy).toBeGreaterThan(0.7);
    expect(result.completionRate).toBeGreaterThan(0.8);
  }
}

/**
 * Validates accuracy results based on time constraints - EXTRACTED TO REDUCE NESTING
 */
function validateAccuracyResults(accuracyResults: any[]) {
  for (const result of accuracyResults) {
    validateSingleAccuracyResult(result);
  }
}

/**
 * Runs peak load simulation test - EXTRACTED TO REDUCE NESTING
 */
async function runPeakLoadTest(
  benchmarker: AIPerformanceBenchmarker,
  optimizationEngine: WeddingOptimizationEngine
) {
  const peakLoadScenario = {
    duration: 60000, // 1 minute
    rampUpTime: 10000, // 10 seconds
    maxConcurrentUsers: 100,
    requestsPerUser: 3,
  };

  return await benchmarker.simulatePeakLoad(
    peakLoadScenario,
    async () => {
      const scenario = generateWeddingTestScenarios.standard().request;
      return await optimizationEngine.optimizeWeddingPlan(scenario);
    },
  );
}

/**
 * Runs memory usage test with multiple complex scenarios - EXTRACTED TO REDUCE NESTING
 */
async function runMemoryUsageTest(optimizationEngine: WeddingOptimizationEngine) {
  const scenarios = Array(20)
    .fill(null)
    .map(() => generateWeddingTestScenarios.complex().request);

  const results = await Promise.all(
    scenarios.map((scenario) =>
      optimizationEngine.optimizeWeddingPlan(scenario),
    ),
  );

  return results;
}

/**
 * Runs quality vs speed tradeoff test - EXTRACTED TO REDUCE NESTING
 */
async function runQualitySpeedTest(
  benchmarker: AIPerformanceBenchmarker,
  qualityLevel: string,
  optimizationEngine: WeddingOptimizationEngine
) {
  return benchmarker.measureQualitySpeedTradeoff(
    async () => {
      const scenario = generateWeddingTestScenarios.standard().request;
      return await optimizationEngine.optimizeWeddingPlan(scenario, {
        qualityLevel,
      });
    },
    {
      iterations: 15,
      qualityLevel,
    },
  );
}

/**
 * Finds result by quality level - HELPER TO REDUCE NESTING
 */
function findResultByQuality(results: any[], qualityLevel: string) {
  return results.find((r) => r.qualityLevel === qualityLevel);
}

/**
 * Validates tradeoff behavior between quality levels - EXTRACTED TO REDUCE NESTING
 */
function validateTradeoffBehavior(tradeoffResults: any[]) {
  const fastResult = findResultByQuality(tradeoffResults, 'fast');
  const balancedResult = findResultByQuality(tradeoffResults, 'balanced');
  const thoroughResult = findResultByQuality(tradeoffResults, 'thorough');

  // Fast should be fastest but lowest accuracy
  expect(fastResult.responseTime).toBeLessThan(balancedResult.responseTime);
  expect(balancedResult.responseTime).toBeLessThan(
    thoroughResult.responseTime,
  );

  // Thorough should be most accurate
  expect(thoroughResult.accuracy).toBeGreaterThan(balancedResult.accuracy);
  expect(balancedResult.accuracy).toBeGreaterThan(
    fastResult.accuracy - 0.1,
  ); // Not too much difference
}

/**
 * Validates single result thresholds - HELPER TO REDUCE NESTING
 */
function validateSingleResultThreshold(result: any) {
  expect(result.accuracy).toBeGreaterThan(0.75); // Minimum accuracy
  expect(result.responseTime).toBeLessThan(15000); // Maximum response time
}

/**
 * Validates minimum thresholds for all quality levels - EXTRACTED TO REDUCE NESTING
 */
function validateMinimumThresholds(tradeoffResults: any[]) {
  for (const result of tradeoffResults) {
    validateSingleResultThreshold(result);
  }
}

/**
 * Runs network latency impact test - EXTRACTED TO REDUCE NESTING
 */
async function runLatencyTest(
  benchmarker: AIPerformanceBenchmarker,
  latency: number,
  optimizationEngine: WeddingOptimizationEngine
) {
  return benchmarker.measureNetworkLatencyImpact(
    async () => {
      const scenario = generateWeddingTestScenarios.standard().request;
      return await optimizationEngine.optimizeWeddingPlan(scenario);
    },
    {
      simulatedLatency: latency,
      iterations: 10,
    },
  );
}

/**
 * Validates network latency results - EXTRACTED TO REDUCE NESTING
 */
function validateNetworkResults(networkResults: any[]) {
  networkResults.forEach((result) => {
    expect(result.successRate).toBeGreaterThan(0.95); // Maintain success rate

    // Response time should increase with latency but not linearly
    if (result.latency <= 200) {
      expect(result.responseTime).toBeLessThan(8000); // <8s with reasonable latency
    }
  });
}

/**
 * Runs horizontal scaling test - EXTRACTED TO REDUCE NESTING
 */
async function runHorizontalScalingTest(
  benchmarker: AIPerformanceBenchmarker,
  instances: number,
  optimizationEngine: WeddingOptimizationEngine
) {
  return benchmarker.measureHorizontalScaling(
    instances,
    async () => {
      const scenarios = Array(50)
        .fill(null)
        .map(() => generateWeddingTestScenarios.standard().request);

      return await Promise.all(
        scenarios.map((scenario) =>
          optimizationEngine.optimizeWeddingPlan(scenario),
        ),
      );
    },
  );
}

/**
 * Validates scaling results for horizontal scaling - EXTRACTED TO REDUCE NESTING
 */
function validateScalingResults(scalabilityResults: any[]) {
  scalabilityResults.forEach((result, i) => {
    if (i > 0) {
      const previousResult = scalabilityResults[i - 1];

      // Throughput should increase with more instances
      expect(result.throughput).toBeGreaterThan(previousResult.throughput);

      // Scaling efficiency should be reasonable (>60%)
      expect(result.efficiency).toBeGreaterThan(0.6);
    }
  });
}

/**
 * Runs database scaling test - EXTRACTED TO REDUCE NESTING
 */
async function runDatabaseScalingTest(
  benchmarker: AIPerformanceBenchmarker,
  poolSize: number,
  optimizationEngine: WeddingOptimizationEngine
) {
  return benchmarker.measureDatabaseScaling(
    poolSize,
    async () => {
      const scenarios = Array(30)
        .fill(null)
        .map(() => generateWeddingTestScenarios.standard().request);

      return await Promise.all(
        scenarios.map((scenario) =>
          optimizationEngine.optimizeWeddingPlan(scenario),
        ),
      );
    },
  );
}

/**
 * Validates database scaling results - EXTRACTED TO REDUCE NESTING
 */
function validateDatabaseResults(databaseResults: any[]) {
  databaseResults.forEach((result) => {
    expect(result.errorRate).toBeLessThan(0.05); // <5% errors
    expect(result.connectionEfficiency).toBeGreaterThan(0.8); // Efficient connections

    if (result.poolSize >= 10) {
      expect(result.responseTime).toBeLessThan(6000); // Good performance with adequate connections
    }
  });
}

describe('AI Performance Benchmarks', () => {
  let benchmarker: AIPerformanceBenchmarker;
  let optimizationEngine: WeddingOptimizationEngine;
  let recommendationEngine: AIRecommendationEngine;

  beforeEach(async () => {
    benchmarker = new AIPerformanceBenchmarker();
    optimizationEngine = new WeddingOptimizationEngine({ testMode: true });
    recommendationEngine = new AIRecommendationEngine({ testMode: true });

    await optimizationEngine.initialize();
    await benchmarker.initialize();
  });

  afterEach(async () => {
    await benchmarker.cleanup();
    await optimizationEngine.cleanup();
  });

  describe('Response Time Benchmarks', () => {
    it('should meet comprehensive optimization response time targets', async () => {
      const scenario = generateWeddingTestScenarios.standard({
        budget: 25000,
        guestCount: 150,
        complexity: 'medium',
      });

      // Extract function to reduce nesting complexity (S2004)
      const optimizeWeddingPlan = () => optimizationEngine.optimizeWeddingPlan(scenario.request);
      
      const benchmark = await benchmarker.measureOptimizationPerformance(
        optimizeWeddingPlan,
        {
          iterations: 10,
          warmupIterations: 2,
          targetResponseTime: 5000, // <5 seconds
        },
      );

      // Performance targets
      expect(benchmark.averageResponseTime).toBeLessThan(5000);
      expect(benchmark.p95ResponseTime).toBeLessThan(7000);
      expect(benchmark.p99ResponseTime).toBeLessThan(10000);
      expect(benchmark.minResponseTime).toBeGreaterThan(100); // Sanity check

      // Consistency validation
      expect(benchmark.standardDeviation).toBeLessThan(1500); // <1.5s variance
      expect(benchmark.successRate).toBe(1.0); // 100% success rate
    });

    it('should meet crisis response time targets', async () => {
      const crisisScenario = {
        type: 'vendor_cancellation',
        severity: 'high',
        weddingDate: new Date('2024-06-01'),
        timeRemaining: 14, // days
      };

      // Extract function to reduce nesting complexity (S2004)
      const handleCrisisOptimization = () => optimizationEngine.handleCrisisOptimization(crisisScenario);
      
      const benchmark = await benchmarker.measureCrisisResponsePerformance(
        handleCrisisOptimization,
        {
          iterations: 20,
          targetResponseTime: 10000, // <10 seconds for crisis
        },
      );

      // Crisis response targets (more stringent)
      expect(benchmark.averageResponseTime).toBeLessThan(10000);
      expect(benchmark.p95ResponseTime).toBeLessThan(15000);
      expect(benchmark.maxResponseTime).toBeLessThan(20000);
      expect(benchmark.successRate).toBe(1.0);
    });

    it('should handle vendor recommendation queries efficiently', async () => {
      const coupleProfile = {
        weddingStyle: 'modern',
        budget: 30000,
        location: 'London',
        priorities: ['quality', 'reliability'],
      };

      // Extract function to reduce nesting complexity (S2004)
      const getVendorRecommendations = () => recommendationEngine.recommendVendors(coupleProfile);

      const benchmark = await benchmarker.measureRecommendationPerformance(
        getVendorRecommendations,
        {
          iterations: 50,
          targetResponseTime: 2000, // <2 seconds for recommendations
        },
      );

      // Vendor recommendation targets
      expect(benchmark.averageResponseTime).toBeLessThan(2000);
      expect(benchmark.p90ResponseTime).toBeLessThan(3000);
      expect(benchmark.p95ResponseTime).toBeLessThan(4000);
      expect(benchmark.successRate).toBeGreaterThan(0.98); // 98% success rate
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should handle concurrent optimization requests efficiently', async () => {
      const scenarios = Array(50)
        .fill(null)
        .map(
          (_, i) =>
            generateWeddingTestScenarios.standard({ weddingId: `test-${i}` })
              .request,
        );

      const concurrencyLevels = [5, 10, 20, 50];
      const throughputResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 6 TO 4 LEVELS
      for (const concurrency of concurrencyLevels) {
        const result = await runConcurrencyTest(
          benchmarker,
          scenarios,
          concurrency,
          optimizationEngine,
        );

        throughputResults.push({
          concurrency,
          ...result,
        });

        // Validate throughput at each concurrency level
        expect(result.successRate).toBeGreaterThan(0.95); // >95% success
        expect(result.averageResponseTime).toBeLessThan(10000); // <10s under load
      }

      // Use extracted helper functions - REDUCED NESTING
      const throughputIncrease = calculateThroughputIncrease(throughputResults);
      validateThroughputScalability(throughputIncrease);
    });

    it('should maintain performance during peak load simulation', async () => {
      // Use extracted helper function - REDUCED NESTING FROM 5 TO 4 LEVELS
      const peakLoadResult = await runPeakLoadTest(benchmarker, optimizationEngine);

      // Peak load performance requirements
      expect(peakLoadResult.overallSuccessRate).toBeGreaterThan(0.9); // >90% during peak
      expect(peakLoadResult.averageResponseTime).toBeLessThan(15000); // <15s during peak
      expect(peakLoadResult.errorRate).toBeLessThan(0.1); // <10% errors
      expect(peakLoadResult.systemStability).toBe('stable'); // System remains stable
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('should maintain reasonable memory usage during optimization', async () => {
      // Use extracted helper function - REDUCED NESTING FROM 5 TO 4 LEVELS
      const memoryBenchmark = await benchmarker.measureMemoryUsage(
        () => runMemoryUsageTest(optimizationEngine),
        {
          measurementInterval: 1000, // Every second
          maxAcceptableIncrease: 200 * 1024 * 1024, // 200MB max increase
        },
      );

      // Memory usage validation
      expect(memoryBenchmark.peakMemoryUsage).toBeLessThan(500 * 1024 * 1024); // <500MB peak
      expect(memoryBenchmark.memoryIncrease).toBeLessThan(200 * 1024 * 1024); // <200MB increase
      expect(memoryBenchmark.memoryLeaks).toBe(false); // No memory leaks detected
      expect(memoryBenchmark.gcEfficiency).toBeGreaterThan(0.8); // Efficient garbage collection
    });

    it('should handle memory pressure gracefully', async () => {
      // Simulate memory pressure with large datasets
      const largeScenarios = Array(10)
        .fill(null)
        .map(
          () =>
            generateWeddingTestScenarios.complex({
              guestCount: 500,
              vendors: 50,
              tasks: 200,
              historicalData: 'extensive',
            }).request,
        );

      // Use extracted helper function - REDUCED NESTING FROM 5 TO 4 LEVELS
      const memoryPressureResult =
        await benchmarker.measureMemoryPressureHandling(
          async () => processLargeScenarios(largeScenarios, optimizationEngine),
          {
            memoryPressureThreshold: 1024 * 1024 * 1024, // 1GB threshold
            maxResponseTimeDegradation: 2.0, // 2x max degradation
          },
        );

      // Memory pressure handling validation
      expect(memoryPressureResult.successRate).toBeGreaterThan(0.9); // >90% success under pressure
      expect(memoryPressureResult.responseTimeDegradation).toBeLessThan(2.0); // <2x slower
      expect(memoryPressureResult.memoryRecovery).toBe(true); // Memory recovered after load
    });
  });

  describe('Accuracy vs Performance Trade-offs', () => {
    it('should maintain accuracy under time pressure', async () => {
      const timeConstraints = [1000, 3000, 5000, 10000]; // Different time limits
      const accuracyResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 5 TO 4 LEVELS
      for (const timeLimit of timeConstraints) {
        const result = await runAccuracyTest(
          benchmarker,
          timeLimit,
          optimizationEngine,
        );

        accuracyResults.push({
          timeLimit,
          accuracy: result.averageAccuracy,
          completionRate: result.completionRate,
        });
      }

      // Use extracted helper function - REDUCED NESTING
      validateAccuracyResults(accuracyResults);
    });

    it('should provide configurable quality vs speed trade-offs', async () => {
      const qualityLevels = ['fast', 'balanced', 'thorough'];
      const tradeoffResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 6 TO 4 LEVELS
      for (const qualityLevel of qualityLevels) {
        const result = await runQualitySpeedTest(
          benchmarker,
          qualityLevel,
          optimizationEngine,
        );

        tradeoffResults.push({
          qualityLevel,
          responseTime: result.averageResponseTime,
          accuracy: result.averageAccuracy,
          completeness: result.averageCompleteness,
        });
      }

      // Use extracted helper functions - REDUCED NESTING
      validateTradeoffBehavior(tradeoffResults);
      validateMinimumThresholds(tradeoffResults);
    });
  });

  describe('System Resource Benchmarks', () => {
    it('should monitor CPU usage during AI operations', async () => {
      // Extract function to reduce nesting complexity (S2004)
      const runCPUIntensiveOperations = async () => {
        const scenarios = Array(10)
          .fill(null)
          .map(() => generateWeddingTestScenarios.standard().request);

        return await Promise.all(
          scenarios.map((scenario) =>
            optimizationEngine.optimizeWeddingPlan(scenario),
          ),
        );
      };

      const cpuBenchmark = await benchmarker.measureCPUUsage(
        runCPUIntensiveOperations,
        {
          measurementInterval: 500,
          maxCPUUsage: 0.8, // 80% max CPU
        },
      );

      // CPU usage validation
      expect(cpuBenchmark.averageCPUUsage).toBeLessThan(0.6); // <60% average
      expect(cpuBenchmark.peakCPUUsage).toBeLessThan(0.8); // <80% peak
      expect(cpuBenchmark.cpuEfficiency).toBeGreaterThan(0.7); // Good efficiency
    });

    it('should handle network latency variations', async () => {
      const latencyScenarios = [50, 100, 200, 500]; // ms latency
      const networkResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 5 TO 4 LEVELS
      for (const latency of latencyScenarios) {
        const result = await runLatencyTest(
          benchmarker,
          latency,
          optimizationEngine,
        );

        networkResults.push({
          latency,
          responseTime: result.averageResponseTime,
          successRate: result.successRate,
        });
      }

      // Use extracted helper function - REDUCED NESTING
      validateNetworkResults(networkResults);
    });
  });

  describe('Scalability Benchmarks', () => {
    it('should scale horizontally with multiple AI instances', async () => {
      const instanceCounts = [1, 2, 4, 8];
      const scalabilityResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 6 TO 4 LEVELS
      for (const instances of instanceCounts) {
        const result = await runHorizontalScalingTest(
          benchmarker,
          instances,
          optimizationEngine,
        );

        scalabilityResults.push({
          instances,
          throughput: result.requestsPerSecond,
          averageResponseTime: result.averageResponseTime,
          efficiency: result.scalingEfficiency,
        });
      }

      // Use extracted helper function - REDUCED NESTING
      validateScalingResults(scalabilityResults);
    });

    it('should handle database connection scaling', async () => {
      const connectionPoolSizes = [5, 10, 20, 50];
      const databaseResults = [];

      // Use extracted helper function - REDUCED NESTING FROM 6 TO 4 LEVELS
      for (const poolSize of connectionPoolSizes) {
        const result = await runDatabaseScalingTest(
          benchmarker,
          poolSize,
          optimizationEngine,
        );

        databaseResults.push({
          poolSize,
          responseTime: result.averageResponseTime,
          connectionEfficiency: result.connectionEfficiency,
          errorRate: result.errorRate,
        });
      }

      // Use extracted helper function - REDUCED NESTING
      validateDatabaseResults(databaseResults);
    });
  });
});
