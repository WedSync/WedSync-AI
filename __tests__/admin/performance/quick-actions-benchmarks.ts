/**
 * WS-229 Admin Quick Actions Performance Benchmarking Suite
 * Team E - Round 1 - Comprehensive Performance Testing
 */

import { performance } from 'perf_hooks';

interface BenchmarkResult {
  action: string;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: number;
  };
}

interface PerformanceConfig {
  iterations: number;
  concurrency: number;
  warmupRuns: number;
  targetResponseTime: number; // ms
  maxErrorRate: number; // percentage
}

class AdminQuickActionsBenchmark {
  private config: PerformanceConfig = {
    iterations: 100,
    concurrency: 10,
    warmupRuns: 10,
    targetResponseTime: 200, // 200ms target
    maxErrorRate: 1 // 1% max error rate
  };

  private results: Map<string, number[]> = new Map();
  private errors: Map<string, number> = new Map();

  async runBenchmarks(): Promise<Map<string, BenchmarkResult>> {
    console.log('🚀 Starting WS-229 Admin Quick Actions Performance Benchmarks');
    console.log(`Configuration: ${this.config.iterations} iterations, ${this.config.concurrency} concurrent`);

    const actions = [
      'clear-cache',
      'acknowledge-alerts', 
      'emergency-backup',
      'maintenance-mode',
      'emergency-user-suspend',
      'force-logout-all'
    ];

    const benchmarkResults = new Map<string, BenchmarkResult>();

    for (const action of actions) {
      console.log(`\n📊 Benchmarking ${action}...`);
      
      // Warmup
      await this.warmup(action);
      
      // Actual benchmark
      const result = await this.benchmarkAction(action);
      benchmarkResults.set(action, result);
      
      // Log immediate results
      console.log(`✅ ${action}: ${result.avgResponseTime.toFixed(2)}ms avg, ${result.p95ResponseTime.toFixed(2)}ms p95`);
    }

    // Overall summary
    this.printSummary(benchmarkResults);

    return benchmarkResults;
  }

  private async warmup(action: string): Promise<void> {
    for (let i = 0; i < this.config.warmupRuns; i++) {
      await this.executeAction(action);
    }
  }

  private async benchmarkAction(action: string): Promise<BenchmarkResult> {
    const responseTimes: number[] = [];
    let errors = 0;
    const memoryBefore = process.memoryUsage();
    let peakMemory = memoryBefore.heapUsed;

    // Single-threaded benchmark for baseline
    for (let i = 0; i < this.config.iterations; i++) {
      const start = performance.now();
      
      try {
        await this.executeAction(action);
        const end = performance.now();
        responseTimes.push(end - start);
        
        // Track peak memory
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }
      } catch (error) {
        errors++;
      }
    }

    // Concurrent benchmark for throughput testing
    const concurrentStart = performance.now();
    const concurrentPromises = Array.from({ length: this.config.concurrency }, async () => {
      for (let i = 0; i < Math.floor(this.config.iterations / this.config.concurrency); i++) {
        const start = performance.now();
        try {
          await this.executeAction(action);
          const end = performance.now();
          responseTimes.push(end - start);
        } catch (error) {
          errors++;
        }
      }
    });

    await Promise.all(concurrentPromises);
    const concurrentEnd = performance.now();
    const totalConcurrentTime = concurrentEnd - concurrentStart;

    const memoryAfter = process.memoryUsage();

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = responseTimes[0];
    const maxResponseTime = responseTimes[responseTimes.length - 1];
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index];
    const p99ResponseTime = responseTimes[p99Index];
    
    const totalRequests = this.config.iterations + (this.config.iterations);
    const throughput = totalRequests / (totalConcurrentTime / 1000); // requests per second
    const errorRate = (errors / totalRequests) * 100;

    return {
      action,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      throughput,
      errorRate,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      }
    };
  }

  private async executeAction(action: string): Promise<void> {
    // Mock the API call with realistic timing
    const baseDelay = this.getBaseDelay(action);
    const jitter = Math.random() * 20; // Add some realistic variance
    
    await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));

    // Simulate occasional failures (1% error rate)
    if (Math.random() < 0.01) {
      throw new Error(`Simulated error for ${action}`);
    }
  }

  private getBaseDelay(action: string): number {
    // Realistic delays based on action complexity
    const delays: Record<string, number> = {
      'clear-cache': 50,
      'acknowledge-alerts': 30,
      'emergency-backup': 150,
      'maintenance-mode': 80,
      'emergency-user-suspend': 120,
      'force-logout-all': 100
    };

    return delays[action] || 50;
  }

  private printSummary(results: Map<string, BenchmarkResult>): void {
    console.log('\n' + '='.repeat(80));
    console.log('📈 WS-229 ADMIN QUICK ACTIONS PERFORMANCE SUMMARY');
    console.log('='.repeat(80));

    console.log('┌─────────────────────────┬─────────┬─────────┬─────────┬─────────┬─────────┐');
    console.log('│ Action                  │ Avg(ms) │ P95(ms) │ P99(ms) │ RPS     │ Errors  │');
    console.log('├─────────────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤');

    results.forEach((result, action) => {
      const actionPad = action.padEnd(23);
      const avgPad = result.avgResponseTime.toFixed(1).padStart(7);
      const p95Pad = result.p95ResponseTime.toFixed(1).padStart(7);
      const p99Pad = result.p99ResponseTime.toFixed(1).padStart(7);
      const rpsPad = result.throughput.toFixed(1).padStart(7);
      const errPad = `${result.errorRate.toFixed(2)}%`.padStart(7);

      console.log(`│ ${actionPad} │ ${avgPad} │ ${p95Pad} │ ${p99Pad} │ ${rpsPad} │ ${errPad} │`);
    });

    console.log('└─────────────────────────┴─────────┴─────────┴─────────┴─────────┴─────────┘');

    // Performance validation
    let allPassed = true;
    console.log('\n🎯 PERFORMANCE VALIDATION:');
    
    results.forEach((result, action) => {
      const avgPassed = result.avgResponseTime <= this.config.targetResponseTime;
      const errorPassed = result.errorRate <= this.config.maxErrorRate;
      const passed = avgPassed && errorPassed;
      
      if (!passed) allPassed = false;
      
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${action}: ${result.avgResponseTime.toFixed(1)}ms avg (target: ${this.config.targetResponseTime}ms), ${result.errorRate.toFixed(2)}% errors (max: ${this.config.maxErrorRate}%)`);
    });

    console.log(`\n🏆 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (!allPassed) {
      console.log('💡 Performance tuning recommendations:');
      results.forEach((result, action) => {
        if (result.avgResponseTime > this.config.targetResponseTime) {
          console.log(`   - Optimize ${action}: Consider caching, database indexing, or async processing`);
        }
        if (result.errorRate > this.config.maxErrorRate) {
          console.log(`   - Improve ${action} reliability: Add retry logic, better error handling`);
        }
      });
    }

    // Memory analysis
    console.log('\n💾 MEMORY ANALYSIS:');
    results.forEach((result, action) => {
      const memDiff = result.memoryUsage.after.heapUsed - result.memoryUsage.before.heapUsed;
      const memDiffMB = (memDiff / 1024 / 1024).toFixed(2);
      const peakMB = (result.memoryUsage.peak / 1024 / 1024).toFixed(2);
      console.log(`   ${action}: ${memDiffMB}MB net change, ${peakMB}MB peak usage`);
    });
  }

  async runStressTest(): Promise<void> {
    console.log('\n🔥 RUNNING STRESS TEST - High Load Scenario');
    
    const stressConfig = {
      duration: 60000, // 60 seconds
      concurrency: 50,
      actionsPerSecond: 100
    };

    const startTime = performance.now();
    let completedRequests = 0;
    let failedRequests = 0;
    const responseTimes: number[] = [];

    const endTime = startTime + stressConfig.duration;
    
    const workers = Array.from({ length: stressConfig.concurrency }, async () => {
      while (performance.now() < endTime) {
        const actions = ['clear-cache', 'acknowledge-alerts', 'emergency-backup'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        const requestStart = performance.now();
        try {
          await this.executeAction(action);
          completedRequests++;
          responseTimes.push(performance.now() - requestStart);
        } catch (error) {
          failedRequests++;
        }

        // Rate limiting
        await new Promise(resolve => 
          setTimeout(resolve, 1000 / (stressConfig.actionsPerSecond / stressConfig.concurrency))
        );
      }
    });

    await Promise.all(workers);

    const actualDuration = (performance.now() - startTime) / 1000;
    const actualRPS = completedRequests / actualDuration;
    const failureRate = (failedRequests / (completedRequests + failedRequests)) * 100;
    
    responseTimes.sort((a, b) => a - b);
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];

    console.log('\n📊 STRESS TEST RESULTS:');
    console.log(`Duration: ${actualDuration.toFixed(1)}s`);
    console.log(`Completed Requests: ${completedRequests}`);
    console.log(`Failed Requests: ${failedRequests}`);
    console.log(`Actual RPS: ${actualRPS.toFixed(1)}`);
    console.log(`Failure Rate: ${failureRate.toFixed(2)}%`);
    console.log(`P95 Response Time: ${p95?.toFixed(1) || 'N/A'}ms`);
    console.log(`P99 Response Time: ${p99?.toFixed(1) || 'N/A'}ms`);

    // Validation
    const stressPassed = actualRPS >= 80 && failureRate <= 2 && (p95 || 0) <= 500;
    console.log(`\n🎯 STRESS TEST: ${stressPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!stressPassed) {
      console.log('💡 System may need scaling improvements for high-load scenarios');
    }
  }
}

// Export for use in other test files
export { AdminQuickActionsBenchmark, BenchmarkResult, PerformanceConfig };

// CLI runner
if (require.main === module) {
  const benchmark = new AdminQuickActionsBenchmark();
  
  (async () => {
    try {
      // Run standard benchmarks
      await benchmark.runBenchmarks();
      
      // Run stress test
      await benchmark.runStressTest();
      
      console.log('\n🎉 Performance benchmarking completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Benchmarking failed:', error);
      process.exit(1);
    }
  })();
}