import { aiHelperSuggestionsService } from '../lib/services/ai-helper-suggestions';
import { helperAssignmentOptimizationEngine } from '../lib/services/helper-assignment-optimization-engine';
import type { SuggestionRequest, OptimizationRequest } from '@/types/workflow';

interface PerformanceTestResult {
  test_name: string;
  passed: boolean;
  duration_ms: number;
  requirement_ms: number;
  details: string;
  error?: string;
}

export class PerformanceRequirementTester {
  private readonly AI_SUGGESTION_REQUIREMENT_MS = 1000; // 1 second
  private readonly BULK_PROCESSING_REQUIREMENT_MS = 10000; // 10 seconds for 50+ items
  private readonly MIN_BULK_SIZE = 50;

  async runAllTests(): Promise<{
    overall_passed: boolean;
    total_tests: number;
    passed_tests: number;
    results: PerformanceTestResult[];
    summary: string;
  }> {
    console.log('🚀 Starting Performance Requirements Testing...');

    const results: PerformanceTestResult[] = [];

    try {
      // Test 1: AI Suggestion Speed
      results.push(await this.testAISuggestionSpeed());

      // Test 2: AI Suggestion Speed with Cache
      results.push(await this.testAISuggestionSpeedWithCache());

      // Test 3: Bulk Assignment Processing
      results.push(await this.testBulkProcessingPerformance());

      // Test 4: Optimization Engine Speed
      results.push(await this.testOptimizationEngineSpeed());

      // Test 5: Concurrent Request Handling
      results.push(await this.testConcurrentRequestHandling());
    } catch (error) {
      console.error('Performance testing failed:', error);
      results.push({
        test_name: 'test_execution',
        passed: false,
        duration_ms: 0,
        requirement_ms: 0,
        details: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const passedTests = results.filter((r) => r.passed).length;
    const overallPassed = passedTests === results.length;

    const summary = this.generateSummary(results, passedTests, overallPassed);

    console.log(summary);

    return {
      overall_passed: overallPassed,
      total_tests: results.length,
      passed_tests: passedTests,
      results,
      summary,
    };
  }

  async testAISuggestionSpeed(): Promise<PerformanceTestResult> {
    const startTime = Date.now();

    try {
      const testRequest: SuggestionRequest = {
        task_id: 'test-task-001',
        wedding_id: 'test-wedding-001',
        max_suggestions: 3,
        require_availability_check: false, // Disable for pure AI speed test
        optimization_strategy: 'balanced',
      };

      const suggestions =
        await aiHelperSuggestionsService.getSuggestions(testRequest);
      const duration = Date.now() - startTime;

      const passed = duration <= this.AI_SUGGESTION_REQUIREMENT_MS;

      return {
        test_name: 'ai_suggestion_speed',
        passed,
        duration_ms: duration,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS,
        details: `Generated ${suggestions.length} suggestions in ${duration}ms. ${passed ? 'PASSED' : 'FAILED'} - Requirement: <${this.AI_SUGGESTION_REQUIREMENT_MS}ms`,
      };
    } catch (error) {
      return {
        test_name: 'ai_suggestion_speed',
        passed: false,
        duration_ms: Date.now() - startTime,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS,
        details: 'AI suggestion test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testAISuggestionSpeedWithCache(): Promise<PerformanceTestResult> {
    const startTime = Date.now();

    try {
      const testRequest: SuggestionRequest = {
        task_id: 'test-task-cache-001',
        wedding_id: 'test-wedding-001',
        max_suggestions: 3,
        require_availability_check: false,
        optimization_strategy: 'balanced',
      };

      // First call to warm up cache
      await aiHelperSuggestionsService.getSuggestions(testRequest);

      // Second call should be faster due to cache
      const cacheStartTime = Date.now();
      const cachedSuggestions =
        await aiHelperSuggestionsService.getSuggestions(testRequest);
      const cacheDuration = Date.now() - cacheStartTime;

      const passed = cacheDuration <= this.AI_SUGGESTION_REQUIREMENT_MS * 0.5; // Cache should be 50% faster

      return {
        test_name: 'ai_suggestion_speed_with_cache',
        passed,
        duration_ms: cacheDuration,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS * 0.5,
        details: `Cached suggestions returned ${cachedSuggestions.length} results in ${cacheDuration}ms. ${passed ? 'PASSED' : 'FAILED'} - Requirement: <${this.AI_SUGGESTION_REQUIREMENT_MS * 0.5}ms`,
      };
    } catch (error) {
      return {
        test_name: 'ai_suggestion_speed_with_cache',
        passed: false,
        duration_ms: Date.now() - startTime,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS * 0.5,
        details: 'Cached AI suggestion test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testBulkProcessingPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();

    try {
      // Generate test data for bulk processing
      const bulkRequests: OptimizationRequest[] = Array.from(
        { length: this.MIN_BULK_SIZE },
        (_, i) => ({
          wedding_id: `test-wedding-${String(i).padStart(3, '0')}`,
          task_ids: [
            `test-task-${i}-001`,
            `test-task-${i}-002`,
            `test-task-${i}-003`,
          ],
          strategy: 'balanced' as const,
          constraints: {
            max_helpers_per_task: 2,
            require_skill_match: true,
            prefer_previous_helpers: false,
            max_concurrent_tasks: 3,
          },
        }),
      );

      const results =
        await helperAssignmentOptimizationEngine.batchOptimizeAssignments(
          bulkRequests,
        );
      const duration = Date.now() - startTime;

      const passed = duration <= this.BULK_PROCESSING_REQUIREMENT_MS;
      const avgTimePerRequest = duration / bulkRequests.length;

      return {
        test_name: 'bulk_processing_performance',
        passed,
        duration_ms: duration,
        requirement_ms: this.BULK_PROCESSING_REQUIREMENT_MS,
        details: `Processed ${bulkRequests.length} bulk requests in ${duration}ms (${avgTimePerRequest.toFixed(2)}ms per request). ${passed ? 'PASSED' : 'FAILED'} - Requirement: <${this.BULK_PROCESSING_REQUIREMENT_MS}ms`,
      };
    } catch (error) {
      return {
        test_name: 'bulk_processing_performance',
        passed: false,
        duration_ms: Date.now() - startTime,
        requirement_ms: this.BULK_PROCESSING_REQUIREMENT_MS,
        details: 'Bulk processing test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testOptimizationEngineSpeed(): Promise<PerformanceTestResult> {
    const startTime = Date.now();

    try {
      const optimizationRequest: OptimizationRequest = {
        wedding_id: 'test-wedding-optimization-001',
        task_ids: Array.from(
          { length: 20 },
          (_, i) => `test-task-opt-${String(i).padStart(3, '0')}`,
        ),
        strategy: 'balanced',
        constraints: {
          max_helpers_per_task: 2,
          require_skill_match: true,
          prefer_previous_helpers: false,
          max_concurrent_tasks: 5,
        },
      };

      const result =
        await helperAssignmentOptimizationEngine.optimizeAssignments(
          optimizationRequest,
        );
      const duration = Date.now() - startTime;

      const passed = duration <= 3000; // 3 seconds for optimization

      return {
        test_name: 'optimization_engine_speed',
        passed,
        duration_ms: duration,
        requirement_ms: 3000,
        details: `Optimized ${optimizationRequest.task_ids.length} tasks in ${duration}ms (score: ${result.optimization_score.toFixed(3)}). ${passed ? 'PASSED' : 'FAILED'} - Requirement: <3000ms`,
      };
    } catch (error) {
      return {
        test_name: 'optimization_engine_speed',
        passed: false,
        duration_ms: Date.now() - startTime,
        requirement_ms: 3000,
        details: 'Optimization engine test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testConcurrentRequestHandling(): Promise<PerformanceTestResult> {
    const startTime = Date.now();

    try {
      const concurrentRequests = 10;
      const testRequests: SuggestionRequest[] = Array.from(
        { length: concurrentRequests },
        (_, i) => ({
          task_id: `concurrent-test-task-${String(i).padStart(3, '0')}`,
          wedding_id: 'test-wedding-concurrent-001',
          max_suggestions: 3,
          require_availability_check: false,
          optimization_strategy: 'balanced',
        }),
      );

      // Execute all requests concurrently
      const results = await Promise.all(
        testRequests.map((request) =>
          aiHelperSuggestionsService.getSuggestions(request),
        ),
      );

      const duration = Date.now() - startTime;
      const avgDurationPerRequest = duration / concurrentRequests;

      const passed = avgDurationPerRequest <= this.AI_SUGGESTION_REQUIREMENT_MS;
      const totalSuggestions = results.reduce(
        (sum, suggestions) => sum + suggestions.length,
        0,
      );

      return {
        test_name: 'concurrent_request_handling',
        passed,
        duration_ms: duration,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS,
        details: `Processed ${concurrentRequests} concurrent requests in ${duration}ms (${avgDurationPerRequest.toFixed(2)}ms avg per request, ${totalSuggestions} total suggestions). ${passed ? 'PASSED' : 'FAILED'}`,
      };
    } catch (error) {
      return {
        test_name: 'concurrent_request_handling',
        passed: false,
        duration_ms: Date.now() - startTime,
        requirement_ms: this.AI_SUGGESTION_REQUIREMENT_MS,
        details: 'Concurrent request test failed due to error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateSummary(
    results: PerformanceTestResult[],
    passedTests: number,
    overallPassed: boolean,
  ): string {
    const lines = [
      '📊 PERFORMANCE REQUIREMENTS TEST SUMMARY',
      '='.repeat(50),
      `Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`,
      `Tests Passed: ${passedTests}/${results.length}`,
      '',
      'Individual Test Results:',
      ...results.map((result) => {
        const status = result.passed ? '✅' : '❌';
        const duration = `${result.duration_ms}ms`;
        const requirement = `(req: <${result.requirement_ms}ms)`;
        return `${status} ${result.test_name}: ${duration} ${requirement}`;
      }),
      '',
      'Performance Insights:',
    ];

    // Add performance insights
    const avgDuration =
      results.reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
    lines.push(`• Average test duration: ${avgDuration.toFixed(2)}ms`);

    const failedTests = results.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      lines.push('• Failed tests need optimization:');
      failedTests.forEach((test) => {
        lines.push(`  - ${test.test_name}: ${test.details}`);
        if (test.error) {
          lines.push(`    Error: ${test.error}`);
        }
      });
    }

    if (overallPassed) {
      lines.push('🎉 All performance requirements met!');
      lines.push('✨ AI suggestions generate within 1 second');
      lines.push('⚡ Bulk processing handles 50+ assignments efficiently');
    } else {
      lines.push(
        '⚠️  Some performance requirements not met - optimization needed',
      );
    }

    return lines.join('\n');
  }

  // Stress test with increasing load
  async stressTestPerformance(): Promise<{
    breaking_point: number;
    results: Array<{
      load: number;
      duration_ms: number;
      success_rate: number;
      avg_response_time: number;
    }>;
  }> {
    console.log('🔥 Starting stress test...');

    const results = [];
    let currentLoad = 1;
    let breakingPoint = 0;

    while (currentLoad <= 100) {
      try {
        const startTime = Date.now();
        const requests: SuggestionRequest[] = Array.from(
          { length: currentLoad },
          (_, i) => ({
            task_id: `stress-test-${currentLoad}-${i}`,
            wedding_id: 'stress-test-wedding',
            max_suggestions: 3,
            require_availability_check: false,
            optimization_strategy: 'balanced',
          }),
        );

        const promises = requests.map((req) =>
          aiHelperSuggestionsService.getSuggestions(req).catch(() => null),
        );

        const responses = await Promise.all(promises);
        const duration = Date.now() - startTime;

        const successfulResponses = responses.filter((r) => r !== null);
        const successRate = successfulResponses.length / requests.length;
        const avgResponseTime = duration / requests.length;

        results.push({
          load: currentLoad,
          duration_ms: duration,
          success_rate: successRate,
          avg_response_time: avgResponseTime,
        });

        console.log(
          `Load ${currentLoad}: ${duration}ms total, ${avgResponseTime.toFixed(2)}ms avg, ${(successRate * 100).toFixed(1)}% success`,
        );

        // Check if we've hit the breaking point
        if (
          successRate < 0.95 ||
          avgResponseTime > this.AI_SUGGESTION_REQUIREMENT_MS
        ) {
          breakingPoint = currentLoad;
          console.log(`💥 Breaking point reached at load: ${breakingPoint}`);
          break;
        }

        currentLoad = currentLoad < 10 ? currentLoad + 1 : currentLoad + 5;
      } catch (error) {
        console.error(`Stress test failed at load ${currentLoad}:`, error);
        breakingPoint = currentLoad;
        break;
      }
    }

    return {
      breaking_point: breakingPoint,
      results,
    };
  }
}

// Export for use in tests
export const performanceRequirementTester = new PerformanceRequirementTester();

// Allow running directly
if (require.main === module) {
  performanceRequirementTester
    .runAllTests()
    .then((results) => {
      console.log('\n📋 Final Results:', JSON.stringify(results, null, 2));
      process.exit(results.overall_passed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Performance testing failed:', error);
      process.exit(1);
    });
}
