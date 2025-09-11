import { performance } from 'perf_hooks';

// Global accuracy testing utilities
declare global {
  var accuracyTestResults: AccuracyTestResult[];
  var recordAccuracyResult: (result: AccuracyTestResult) => void;
  var getAccuracyMetrics: () => AccuracyMetrics;
  var resetAccuracyTracking: () => void;
}

export interface AccuracyTestResult {
  testName: string;
  algorithmName: string;
  expected: unknown;
  actual: unknown;
  accuracy: number; // 0-1 score
  precision?: number; // For classification tasks
  recall?: number; // For classification tasks
  executionTime: number; // milliseconds
  success: boolean;
  errors?: string[];
}

export interface AccuracyMetrics {
  totalTests: number;
  passedTests: number;
  averageAccuracy: number;
  accuracyByAlgorithm: Record<
    string,
    {
      testCount: number;
      averageAccuracy: number;
      successRate: number;
    }
  >;
  performanceMetrics: {
    averageExecutionTime: number;
    maxExecutionTime: number;
    minExecutionTime: number;
  };
}

// Initialize global tracking
global.accuracyTestResults = [];

global.recordAccuracyResult = (result: AccuracyTestResult) => {
  global.accuracyTestResults.push(result);
};

// Helper function to group results by algorithm name
function groupAccuracyResultsByAlgorithm(
  results: AccuracyTestResult[],
): Record<string, AccuracyTestResult[]> {
  return results.reduce(
    (acc, result) => {
      if (!acc[result.algorithmName]) {
        acc[result.algorithmName] = [];
      }
      acc[result.algorithmName].push(result);
      return acc;
    },
    {} as Record<string, AccuracyTestResult[]>,
  );
}

// Helper function to calculate algorithm-specific accuracy statistics
function calculateAlgorithmAccuracyStats(
  algorithmGroups: Record<string, AccuracyTestResult[]>,
): Record<string, any> {
  return Object.entries(algorithmGroups).reduce(
    (acc, [algoName, algoResults]) => {
      acc[algoName] = {
        testCount: algoResults.length,
        averageAccuracy:
          algoResults.reduce((sum, r) => sum + r.accuracy, 0) /
          algoResults.length,
        successRate:
          algoResults.filter((r) => r.success).length / algoResults.length,
      };
      return acc;
    },
    {} as Record<string, any>,
  );
}

// Helper function to calculate execution time performance metrics
function calculateExecutionTimeMetrics(results: AccuracyTestResult[]): {
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
} {
  const executionTimes = results.map((r) => r.executionTime);
  return {
    averageExecutionTime:
      executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length,
    maxExecutionTime: Math.max(...executionTimes),
    minExecutionTime: Math.min(...executionTimes),
  };
}

global.getAccuracyMetrics = (): AccuracyMetrics => {
  const results = global.accuracyTestResults;

  if (results.length === 0) {
    return {
      totalTests: 0,
      passedTests: 0,
      averageAccuracy: 0,
      accuracyByAlgorithm: {},
      performanceMetrics: {
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
      },
    };
  }

  const passedTests = results.filter((r) => r.success).length;
  const averageAccuracy =
    results.reduce((sum, r) => sum + r.accuracy, 0) / results.length;

  const algorithmGroups = groupAccuracyResultsByAlgorithm(results);
  const accuracyByAlgorithm = calculateAlgorithmAccuracyStats(algorithmGroups);
  const performanceMetrics = calculateExecutionTimeMetrics(results);

  return {
    totalTests: results.length,
    passedTests,
    averageAccuracy,
    accuracyByAlgorithm,
    performanceMetrics,
  };
};

global.resetAccuracyTracking = () => {
  global.accuracyTestResults = [];
};

// Utility functions for accuracy testing
export class AccuracyValidator {
  static validateConflictDetection(
    expected: Array<{ eventIds: string[]; severity: string }>,
    actual: Array<{ eventIds: string[]; severity: string }>,
  ): { accuracy: number; precision: number; recall: number } {
    // Normalize for comparison (sort event IDs)
    const normalizeConflict = (conflict: {
      eventIds: string[];
      severity: string;
    }) => ({
      eventIds: conflict.eventIds.sort().join(','),
      severity: conflict.severity,
    });

    const expectedNorm = expected.map(normalizeConflict);
    const actualNorm = actual.map(normalizeConflict);

    // Calculate True Positives, False Positives, False Negatives
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    // Find true positives and false negatives
    for (const exp of expectedNorm) {
      const found = actualNorm.find(
        (act) => act.eventIds === exp.eventIds && act.severity === exp.severity,
      );
      if (found) {
        truePositives++;
      } else {
        falseNegatives++;
      }
    }

    // Find false positives
    for (const act of actualNorm) {
      const found = expectedNorm.find(
        (exp) => exp.eventIds === act.eventIds && exp.severity === act.severity,
      );
      if (!found) {
        falsePositives++;
      }
    }

    // Calculate metrics
    const precision =
      truePositives + falsePositives > 0
        ? truePositives / (truePositives + falsePositives)
        : 1;
    const recall =
      truePositives + falseNegatives > 0
        ? truePositives / (truePositives + falseNegatives)
        : 1;
    const accuracy =
      expected.length + actual.length > 0
        ? (2 * truePositives) / (expected.length + actual.length)
        : 1;

    return { accuracy, precision, recall };
  }

  static validateScheduleOptimization(
    originalEvents: any[],
    optimizedEvents: any[],
  ): { accuracy: number; improvementScore: number } {
    if (originalEvents.length !== optimizedEvents.length) {
      return { accuracy: 0, improvementScore: 0 };
    }

    // Validate all events are preserved
    const originalIds = originalEvents.map((e) => e.id).sort();
    const optimizedIds = optimizedEvents.map((e) => e.id).sort();
    const eventsPreserved =
      JSON.stringify(originalIds) === JSON.stringify(optimizedIds);

    if (!eventsPreserved) {
      return { accuracy: 0, improvementScore: 0 };
    }

    // Calculate fitness improvement
    const originalFitness = this.calculateScheduleFitness(originalEvents);
    const optimizedFitness = this.calculateScheduleFitness(optimizedEvents);

    const improvementScore = optimizedFitness - originalFitness;
    const accuracy = optimizedFitness; // Fitness is our accuracy measure

    return { accuracy, improvementScore };
  }

  static validateResourceAllocation(
    events: any[],
    resources: any[],
    allocation: any[],
  ): { accuracy: number; utilizationScore: number } {
    let totalAccuracy = 0;
    let resourceCount = 0;

    for (const resource of resources) {
      const resourceAllocations = allocation.filter(
        (a) => a.resource === resource.id,
      );

      const maxConcurrent = this.calculateMaxConcurrentAllocations(resourceAllocations);
      const resourceAccuracy = this.calculateResourceAccuracy(resource, maxConcurrent);

      totalAccuracy += resourceAccuracy;
      resourceCount++;
    }

    const accuracy = resourceCount > 0 ? totalAccuracy / resourceCount : 1;
    const utilizationScore = this.calculateResourceUtilization(
      resources,
      allocation,
    );

    return { accuracy, utilizationScore };
  }

  private static calculateMaxConcurrentAllocations(allocations: any[]): number {
    let maxConcurrent = 0;
    
    for (const alloc of allocations) {
      let concurrent = 1;
      for (const other of allocations) {
        if (alloc === other) continue;
        if (this.timeSlotOverlaps(alloc.timeSlot, other.timeSlot)) {
          concurrent++;
        }
      }
      maxConcurrent = Math.max(maxConcurrent, concurrent);
    }
    
    return maxConcurrent;
  }

  private static calculateResourceAccuracy(resource: any, maxConcurrent: number): number {
    const capacityRespected = maxConcurrent <= resource.quantity;
    return capacityRespected
      ? 1
      : Math.max(0, resource.quantity / maxConcurrent);
  }

  private static calculateScheduleFitness(events: any[]): number {
    if (events.length === 0) return 1;

    let fitness = 1.0;

    // Check for time conflicts
    let conflicts = 0;
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (this.eventsOverlap(events[i], events[j])) {
          conflicts++;
        }
      }
    }

    // Penalize conflicts
    fitness -= (conflicts / events.length) * 0.5;

    // Reward compactness
    const totalDuration = this.calculateTotalDuration(events);
    const compactnessScore = Math.min(0.2, (8 * 60) / totalDuration); // 8 hours baseline
    fitness += compactnessScore;

    return Math.max(0, Math.min(1, fitness));
  }

  private static eventsOverlap(event1: any, event2: any): boolean {
    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();

    return start1 < end2 && start2 < end1;
  }

  private static timeSlotOverlaps(slot1: any, slot2: any): boolean {
    const start1 = new Date(slot1.start).getTime();
    const end1 = new Date(slot1.end).getTime();
    const start2 = new Date(slot2.start).getTime();
    const end2 = new Date(slot2.end).getTime();

    return start1 < end2 && start2 < end1;
  }

  private static calculateTotalDuration(events: any[]): number {
    if (events.length === 0) return 0;

    const times = events.map((e) => [
      new Date(e.start).getTime(),
      new Date(e.end).getTime(),
    ]);

    const minStart = Math.min(...times.map((t) => t[0]));
    const maxEnd = Math.max(...times.map((t) => t[1]));

    return (maxEnd - minStart) / (60 * 1000); // minutes
  }

  private static calculateResourceUtilization(
    resources: any[],
    allocation: any[],
  ): number {
    if (resources.length === 0) return 1;

    let totalUtilization = 0;

    for (const resource of resources) {
      const resourceAllocations = allocation.filter(
        (a) => a.resource === resource.id,
      );
      const utilization = resourceAllocations.length / resource.quantity;
      totalUtilization += Math.min(1, utilization);
    }

    return totalUtilization / resources.length;
  }
}

// Helper functions for expectAccuracy
function createSuccessfulResult(
  testName: string,
  algorithmName: string,
  expected: any,
  actual: any,
  accuracy: number,
  validation: any,
  executionTime: number,
  success: boolean,
  minimumAccuracy: number,
): AccuracyTestResult {
  return {
    testName,
    algorithmName,
    expected,
    actual,
    accuracy,
    precision: validation.precision,
    recall: validation.recall,
    executionTime,
    success,
    errors: success
      ? undefined
      : [`Accuracy ${accuracy.toFixed(3)} below threshold ${minimumAccuracy}`],
  };
}

function createErrorResult(
  testName: string,
  algorithmName: string,
  expected: any,
  actual: any,
  executionTime: number,
  error: unknown,
): AccuracyTestResult {
  return {
    testName,
    algorithmName,
    expected,
    actual,
    accuracy: 0,
    executionTime,
    success: false,
    errors: [error instanceof Error ? error.message : String(error)],
  };
}

function processValidationResult(
  testName: string,
  algorithmName: string,
  expected: any,
  actual: any,
  validation: any,
  executionTime: number,
  minimumAccuracy: number,
): any {
  const accuracy = validation.accuracy || 0;
  const success = accuracy >= minimumAccuracy;
  
  const result = createSuccessfulResult(
    testName,
    algorithmName,
    expected,
    actual,
    accuracy,
    validation,
    executionTime,
    success,
    minimumAccuracy,
  );

  global.recordAccuracyResult(result);
  
  if (!success) {
    throw new Error(`Accuracy ${accuracy.toFixed(3)} below threshold ${minimumAccuracy}`);
  }
  
  return validation;
}

function processValidationError(
  testName: string,
  algorithmName: string,
  expected: any,
  actual: any,
  executionTime: number,
  error: unknown,
): never {
  const result = createErrorResult(
    testName,
    algorithmName,
    expected,
    actual,
    executionTime,
    error,
  );

  global.recordAccuracyResult(result);
  throw error;
}

// Test helpers for accuracy validation - Reduced cognitive complexity
export function expectAccuracy(
  testName: string,
  algorithmName: string,
  expected: any,
  actual: any,
  validatorFn: (expected: any, actual: any) => any,
  minimumAccuracy: number = 0.8,
) {
  const startTime = performance.now();
  const executionTime = () => performance.now() - startTime;

  try {
    const validation = validatorFn(expected, actual);
    return processValidationResult(
      testName,
      algorithmName,
      expected,
      actual,
      validation,
      executionTime(),
      minimumAccuracy,
    );
  } catch (error) {
    return processValidationError(
      testName,
      algorithmName,
      expected,
      actual,
      executionTime(),
      error,
    );
  }
}

// Setup and teardown
beforeEach(() => {
  // Reset tracking for each test
  global.resetAccuracyTracking();
});

afterAll(() => {
  // Output final accuracy metrics
  const metrics = global.getAccuracyMetrics();

  console.log('\n📊 ACCURACY TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Total Tests: ${metrics.totalTests}`);
  console.log(`Passed Tests: ${metrics.passedTests}`);
  console.log(
    `Success Rate: ${((metrics.passedTests / metrics.totalTests) * 100).toFixed(1)}%`,
  );
  console.log(
    `Average Accuracy: ${(metrics.averageAccuracy * 100).toFixed(1)}%`,
  );
  console.log(
    `Average Execution Time: ${metrics.performanceMetrics.averageExecutionTime.toFixed(2)}ms`,
  );

  console.log('\n📈 ACCURACY BY ALGORITHM:');
  Object.entries(metrics.accuracyByAlgorithm).forEach(([algoName, stats]) => {
    console.log(
      `  ${algoName}: ${(stats.averageAccuracy * 100).toFixed(1)}% (${stats.testCount} tests)`,
    );
  });

  console.log('═══════════════════════════════════════\n');
});

console.log('Accuracy testing setup completed');
console.log('Use expectAccuracy() for validation with automatic tracking');
console.log('Use AccuracyValidator class for specialized validation functions');
