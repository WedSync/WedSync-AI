/**
 * WS-130: AI Photography Implementation Validation Script
 * Tests core functionality and error handling
 */

import { colorHarmonyAnalyzer } from '../../lib/ai/photography/color-harmony-analyzer';
import { aiPhotographyErrorHandler } from '../../lib/ai/photography/error-handler';
import { performanceOptimizer } from '../../lib/ai/photography/performance-optimizer';

interface ValidationResult {
  module: string;
  tests: Array<{
    name: string;
    status: 'pass' | 'fail' | 'skip';
    message?: string;
    duration?: number;
  }>;
}

/**
 * Run validation tests for AI photography features
 */
async function runValidation(): Promise<ValidationResult[]> {
  console.log('🚀 Starting AI Photography Feature Validation...\n');

  const results: ValidationResult[] = [];

  // Test Color Harmony Analyzer
  results.push(await testColorHarmonyAnalyzer());

  // Test Error Handler
  results.push(await testErrorHandler());

  // Test Performance Optimizer
  results.push(await testPerformanceOptimizer());

  return results;
}

/**
 * Test Color Harmony Analyzer
 */
async function testColorHarmonyAnalyzer(): Promise<ValidationResult> {
  const result: ValidationResult = {
    module: 'Color Harmony Analyzer',
    tests: [],
  };

  try {
    // Test 1: Instance creation
    const startTime = Date.now();
    const analyzer = colorHarmonyAnalyzer;
    result.tests.push({
      name: 'Instance Creation',
      status: analyzer ? 'pass' : 'fail',
      duration: Date.now() - startTime,
    });

    // Test 2: Cache functionality
    const cacheStats = analyzer.getCacheStats();
    result.tests.push({
      name: 'Cache Stats Available',
      status:
        typeof cacheStats === 'object' && 'size' in cacheStats
          ? 'pass'
          : 'fail',
      message: `Cache size: ${cacheStats.size}`,
    });

    // Test 3: Color palette generation
    const palette = analyzer.generateComplementaryPalette('#FF6B6B');
    result.tests.push({
      name: 'Color Palette Generation',
      status: Array.isArray(palette) && palette.length > 0 ? 'pass' : 'fail',
      message: `Generated ${palette.length} colors`,
    });

    // Test 4: Clear cache
    analyzer.clearCache();
    const clearedStats = analyzer.getCacheStats();
    result.tests.push({
      name: 'Cache Clear Functionality',
      status: clearedStats.size === 0 ? 'pass' : 'fail',
    });
  } catch (error) {
    result.tests.push({
      name: 'Color Harmony Analyzer Tests',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Test Error Handler
 */
async function testErrorHandler(): Promise<ValidationResult> {
  const result: ValidationResult = {
    module: 'Error Handler',
    tests: [],
  };

  try {
    // Test 1: Error stats
    const stats = aiPhotographyErrorHandler.getErrorStats();
    result.tests.push({
      name: 'Error Stats Available',
      status:
        typeof stats === 'object' && 'totalErrors' in stats ? 'pass' : 'fail',
    });

    // Test 2: Execute with handling (success case)
    const successResult = await aiPhotographyErrorHandler.executeWithHandling(
      async () => 'success',
      {
        operation: 'test-operation',
        timestamp: new Date(),
      },
    );
    result.tests.push({
      name: 'Successful Operation Handling',
      status: successResult === 'success' ? 'pass' : 'fail',
    });

    // Test 3: Execute with handling (fallback case)
    const fallbackResult = await aiPhotographyErrorHandler.executeWithHandling(
      async () => {
        throw new Error('Test error');
      },
      {
        operation: 'test-fallback',
        timestamp: new Date(),
      },
      () => 'fallback-success',
    );
    result.tests.push({
      name: 'Fallback Operation Handling',
      status: fallbackResult === 'fallback-success' ? 'pass' : 'fail',
    });

    // Test 4: Clear error log
    aiPhotographyErrorHandler.clearErrorLog();
    result.tests.push({
      name: 'Error Log Clear',
      status: 'pass', // If we get here, it didn't crash
    });
  } catch (error) {
    result.tests.push({
      name: 'Error Handler Tests',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Test Performance Optimizer
 */
async function testPerformanceOptimizer(): Promise<ValidationResult> {
  const result: ValidationResult = {
    module: 'Performance Optimizer',
    tests: [],
  };

  try {
    // Test 1: Metrics available
    const metrics = performanceOptimizer.getMetrics();
    result.tests.push({
      name: 'Performance Metrics Available',
      status:
        typeof metrics === 'object' && 'totalJobs' in metrics ? 'pass' : 'fail',
    });

    // Test 2: Queue job
    const testJob = {
      type: 'color_analysis' as const,
      images: [
        { id: 'test-1', url: 'test-url-1' },
        { id: 'test-2', url: 'test-url-2' },
      ],
      options: {
        quality: 'preview' as const,
        batchSize: 2,
      },
    };

    const jobId = await performanceOptimizer.queueJob(testJob);
    result.tests.push({
      name: 'Job Queue Functionality',
      status: typeof jobId === 'string' && jobId.length > 0 ? 'pass' : 'fail',
      message: `Job ID: ${jobId}`,
    });

    // Test 3: Get job status
    const job = performanceOptimizer.getJob(jobId);
    result.tests.push({
      name: 'Job Retrieval',
      status: job !== null && job.id === jobId ? 'pass' : 'fail',
    });

    // Test 4: Memory optimization
    performanceOptimizer.optimizeMemory();
    result.tests.push({
      name: 'Memory Optimization',
      status: 'pass', // If we get here, it didn't crash
    });

    // Test 5: Cancel job
    const cancelled = performanceOptimizer.cancelJob(jobId);
    result.tests.push({
      name: 'Job Cancellation',
      status: cancelled ? 'pass' : 'fail',
    });
  } catch (error) {
    result.tests.push({
      name: 'Performance Optimizer Tests',
      status: 'fail',
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  return result;
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]): void {
  console.log('\n📊 AI Photography Feature Validation Results\n');
  console.log('='.repeat(60));

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  results.forEach((moduleResult) => {
    console.log(`\n📁 ${moduleResult.module}`);
    console.log('-'.repeat(40));

    moduleResult.tests.forEach((test) => {
      const statusEmoji =
        test.status === 'pass' ? '✅' : test.status === 'fail' ? '❌' : '⏭️';
      const durationText = test.duration ? ` (${test.duration}ms)` : '';
      const messageText = test.message ? ` - ${test.message}` : '';

      console.log(`  ${statusEmoji} ${test.name}${durationText}${messageText}`);

      totalTests++;
      if (test.status === 'pass') passedTests++;
      else if (test.status === 'fail') failedTests++;
      else skippedTests++;
    });
  });

  console.log('\n' + '='.repeat(60));
  console.log(
    `📈 Summary: ${totalTests} total, ${passedTests} passed, ${failedTests} failed, ${skippedTests} skipped`,
  );

  const successRate =
    totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
  console.log(`🎯 Success Rate: ${successRate}%`);

  if (failedTests === 0) {
    console.log('🎉 All tests passed! AI Photography features are ready.');
  } else {
    console.log(`⚠️  ${failedTests} test(s) failed. Review implementation.`);
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    const results = await runValidation();
    printResults(results);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { runValidation };
export type { ValidationResult };

// Run if called directly
if (require.main === module) {
  main();
}
