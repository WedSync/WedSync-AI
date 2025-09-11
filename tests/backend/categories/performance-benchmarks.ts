/**
 * WS-158: Performance Benchmarks for Task Categories
 * Validates system meets performance requirements
 */

import { performance } from 'perf_hooks';
import { categorySuggestionEngine } from '@/lib/ai/task-categorization/categorySuggestionEngine';
import { categoryOptimization } from '@/lib/services/categoryOptimization';
import { categoryAnalytics } from '@/lib/analytics/category-performance/categoryAnalytics';

interface BenchmarkResult {
  operation: string;
  targetMs: number;
  actualMs: number;
  passed: boolean;
  iterations: number;
  p95: number;
  p99: number;
}

/**
 * Performance Benchmark Suite for WS-158
 */
export class CategoryPerformanceBenchmarks {
  private results: BenchmarkResult[] = [];

  /**
   * Run all performance benchmarks
   */
  async runAllBenchmarks(): Promise<{
    results: BenchmarkResult[];
    passed: boolean;
    summary: string;
  }> {
    console.log('Starting WS-158 Performance Benchmarks...\n');

    // Run individual benchmarks
    await this.benchmarkAISuggestion();
    await this.benchmarkBulkProcessing();
    await this.benchmarkAnalytics();
    await this.benchmarkConflictResolution();
    await this.benchmarkMLPipeline();

    // Generate summary
    const passed = this.results.every(r => r.passed);
    const summary = this.generateSummary();

    return { results: this.results, passed, summary };
  }

  /**
   * Benchmark AI category suggestion
   * Target: < 500ms per suggestion
   */
  async benchmarkAISuggestion(): Promise<void> {
    console.log('Benchmarking AI Category Suggestions...');
    
    const iterations = 100;
    const times: number[] = [];
    const targetMs = 500;

    const testTasks = [
      { id: '1', title: 'Setup ceremony arch', description: 'Position and decorate' },
      { id: '2', title: 'Coordinate processional', description: 'Guide wedding party' },
      { id: '3', title: 'Serve reception dinner', description: 'Coordinate catering' },
      { id: '4', title: 'Pack ceremony items', description: 'Breakdown and storage' },
      { id: '5', title: 'Manage vendor arrivals', description: 'Check-in and setup' },
    ];

    for (let i = 0; i < iterations; i++) {
      const task = testTasks[i % testTasks.length];
      const start = performance.now();
      
      await categorySuggestionEngine.suggestCategory({
        ...task,
        id: `test-${i}`,
      });
      
      const duration = performance.now() - start;
      times.push(duration);
    }

    const result = this.analyzeMetrics(times, 'AI Category Suggestion', targetMs, iterations);
    this.results.push(result);
    this.logResult(result);
  }

  /**
   * Benchmark bulk category processing
   * Target: < 10 seconds for 100 tasks
   */
  async benchmarkBulkProcessing(): Promise<void> {
    console.log('\nBenchmarking Bulk Category Processing...');
    
    const iterations = 10;
    const times: number[] = [];
    const targetMs = 10000;
    const taskCount = 100;

    for (let i = 0; i < iterations; i++) {
      const tasks = Array.from({ length: taskCount }, (_, idx) => ({
        id: `bulk-${i}-${idx}`,
        title: `Task ${idx}`,
        description: `Description for task ${idx}`,
        currentCategory: ['setup', 'ceremony', 'reception'][idx % 3],
      }));

      const start = performance.now();
      
      await categoryOptimization.processBulkCategories({
        tasks,
        options: {
          optimizeDistribution: true,
          resolveConflicts: true,
          applyML: false,
        },
      });
      
      const duration = performance.now() - start;
      times.push(duration);
    }

    const result = this.analyzeMetrics(
      times, 
      `Bulk Processing (${taskCount} tasks)`, 
      targetMs, 
      iterations
    );
    this.results.push(result);
    this.logResult(result);
  }

  /**
   * Benchmark category analytics
   * Target: < 1000ms for metrics calculation
   */
  async benchmarkAnalytics(): Promise<void> {
    console.log('\nBenchmarking Category Analytics...');
    
    const iterations = 50;
    const times: number[] = [];
    const targetMs = 1000;
    const categories = ['setup', 'ceremony', 'reception', 'breakdown'];

    for (let i = 0; i < iterations; i++) {
      const category = categories[i % categories.length];
      const start = performance.now();
      
      await categoryAnalytics.calculateCategoryMetrics(category, 'day');
      
      const duration = performance.now() - start;
      times.push(duration);
    }

    const result = this.analyzeMetrics(times, 'Category Analytics', targetMs, iterations);
    this.results.push(result);
    this.logResult(result);
  }

  /**
   * Benchmark conflict resolution
   * Target: < 200ms per conflict
   */
  async benchmarkConflictResolution(): Promise<void> {
    console.log('\nBenchmarking Conflict Resolution...');
    
    const iterations = 100;
    const times: number[] = [];
    const targetMs = 200;

    for (let i = 0; i < iterations; i++) {
      const tasks = [
        {
          id: `conflict-${i}-1`,
          title: 'Task with dependency',
          dependencies: [`conflict-${i}-2`],
          timeSlot: '10:00-11:00',
        },
        {
          id: `conflict-${i}-2`,
          title: 'Dependent task',
          timeSlot: '14:00-15:00',
        },
      ];

      const suggestions = tasks.map(t => ({
        taskId: t.id,
        suggestedCategory: 'ceremony',
        confidence: 0.8,
        reasoning: 'Test',
        alternativeCategories: [],
        contextualFactors: {},
      }));

      const start = performance.now();
      
      await categoryOptimization.detectAndResolveConflicts(tasks, suggestions);
      
      const duration = performance.now() - start;
      times.push(duration);
    }

    const result = this.analyzeMetrics(times, 'Conflict Resolution', targetMs, iterations);
    this.results.push(result);
    this.logResult(result);
  }

  /**
   * Benchmark ML pipeline
   * Target: < 5000ms for training update
   */
  async benchmarkMLPipeline(): Promise<void> {
    console.log('\nBenchmarking ML Pipeline...');
    
    const iterations = 10;
    const times: number[] = [];
    const targetMs = 5000;

    for (let i = 0; i < iterations; i++) {
      const feedback = Array.from({ length: 20 }, (_, idx) => ({
        taskId: `ml-${i}-${idx}`,
        correctCategory: ['setup', 'ceremony', 'reception'][idx % 3],
        feedback: 'Test feedback',
      }));

      const start = performance.now();
      
      await categoryOptimization.trainMLModel(feedback);
      
      const duration = performance.now() - start;
      times.push(duration);
    }

    const result = this.analyzeMetrics(times, 'ML Training', targetMs, iterations);
    this.results.push(result);
    this.logResult(result);
  }

  /**
   * Analyze performance metrics
   */
  private analyzeMetrics(
    times: number[],
    operation: string,
    targetMs: number,
    iterations: number
  ): BenchmarkResult {
    times.sort((a, b) => a - b);
    
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    const passed = p95 <= targetMs;

    return {
      operation,
      targetMs,
      actualMs: Math.round(average),
      passed,
      iterations,
      p95: Math.round(p95),
      p99: Math.round(p99),
    };
  }

  /**
   * Log benchmark result
   */
  private logResult(result: BenchmarkResult): void {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.operation}:`);
    console.log(`  Target: ${result.targetMs}ms`);
    console.log(`  Average: ${result.actualMs}ms`);
    console.log(`  P95: ${result.p95}ms`);
    console.log(`  P99: ${result.p99}ms`);
    console.log(`  Iterations: ${result.iterations}`);
  }

  /**
   * Generate performance summary
   */
  private generateSummary(): string {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = (passed / total * 100).toFixed(1);

    let summary = `\n${'='.repeat(50)}\n`;
    summary += `WS-158 PERFORMANCE BENCHMARK SUMMARY\n`;
    summary += `${'='.repeat(50)}\n\n`;
    summary += `Overall: ${passed}/${total} benchmarks passed (${passRate}%)\n\n`;

    // Critical metrics
    const aiSuggestion = this.results.find(r => r.operation === 'AI Category Suggestion');
    if (aiSuggestion) {
      summary += `🤖 AI Suggestion Performance:\n`;
      summary += `   Average: ${aiSuggestion.actualMs}ms (Target: ${aiSuggestion.targetMs}ms)\n`;
      summary += `   P95: ${aiSuggestion.p95}ms\n`;
      summary += `   Status: ${aiSuggestion.passed ? '✅ MEETS REQUIREMENT' : '❌ NEEDS OPTIMIZATION'}\n\n`;
    }

    const bulkProcessing = this.results.find(r => r.operation.includes('Bulk Processing'));
    if (bulkProcessing) {
      summary += `📊 Bulk Processing Performance:\n`;
      summary += `   Average: ${bulkProcessing.actualMs}ms (Target: ${bulkProcessing.targetMs}ms)\n`;
      summary += `   P95: ${bulkProcessing.p95}ms\n`;
      summary += `   Status: ${bulkProcessing.passed ? '✅ MEETS REQUIREMENT' : '❌ NEEDS OPTIMIZATION'}\n\n`;
    }

    // Detailed results table
    summary += `Detailed Results:\n`;
    summary += `${'─'.repeat(70)}\n`;
    summary += `Operation                    | Target  | Actual  | P95     | Status\n`;
    summary += `${'─'.repeat(70)}\n`;
    
    for (const result of this.results) {
      const op = result.operation.padEnd(28);
      const target = `${result.targetMs}ms`.padEnd(7);
      const actual = `${result.actualMs}ms`.padEnd(7);
      const p95 = `${result.p95}ms`.padEnd(7);
      const status = result.passed ? '✅' : '❌';
      summary += `${op} | ${target} | ${actual} | ${p95} | ${status}\n`;
    }
    
    summary += `${'─'.repeat(70)}\n\n`;

    // Recommendations
    summary += `Recommendations:\n`;
    const failures = this.results.filter(r => !r.passed);
    
    if (failures.length === 0) {
      summary += `✅ All performance targets met! System is production-ready.\n`;
    } else {
      for (const failure of failures) {
        const overBy = Math.round((failure.actualMs / failure.targetMs - 1) * 100);
        summary += `• ${failure.operation}: ${overBy}% over target\n`;
        
        if (failure.operation.includes('AI')) {
          summary += `  → Consider implementing more aggressive caching\n`;
          summary += `  → Optimize OpenAI API calls with batch processing\n`;
        }
        if (failure.operation.includes('Bulk')) {
          summary += `  → Implement parallel processing for large batches\n`;
          summary += `  → Add database query optimization\n`;
        }
        if (failure.operation.includes('Analytics')) {
          summary += `  → Pre-calculate metrics during off-peak hours\n`;
          summary += `  → Implement materialized views for common queries\n`;
        }
      }
    }

    summary += `\n${'='.repeat(50)}\n`;
    summary += `Benchmark completed at: ${new Date().toISOString()}\n`;
    summary += `${'='.repeat(50)}\n`;

    return summary;
  }
}

/**
 * Run benchmarks if executed directly
 */
if (require.main === module) {
  const benchmarks = new CategoryPerformanceBenchmarks();
  
  benchmarks.runAllBenchmarks().then(({ results, passed, summary }) => {
    console.log(summary);
    
    // Save results to file
    const fs = require('fs');
    const path = require('path');
    const resultsPath = path.join(__dirname, 'benchmark-results.json');
    
    fs.writeFileSync(resultsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      passed,
      results,
      summary,
    }, null, 2));
    
    console.log(`\nResults saved to: ${resultsPath}`);
    
    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
  }).catch(error => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });
}

// Export for use in other tests
export default CategoryPerformanceBenchmarks;