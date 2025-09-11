#!/usr/bin/env tsx
import { performance } from 'perf_hooks';
import { BroadcastQueueManager } from '../../src/lib/broadcast/performance/broadcast-queue-manager';
import { BroadcastCacheManager } from '../../src/lib/broadcast/performance/broadcast-cache-manager';
import { BroadcastAutoScaler } from '../../src/lib/broadcast/performance/auto-scaler';

interface LoadTestConfig {
  targetThroughput: number; // broadcasts per second
  testDuration: number; // seconds
  concurrentUsers: number;
  batchSize: number;
  weddingSimulation: boolean;
}

interface LoadTestResults {
  totalBroadcasts: number;
  actualThroughput: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  successRate: number;
  cacheHitRate: number;
  queuePerformance: {
    averageProcessingTime: number;
    maxQueueSize: number;
    throughput: number;
  };
}

class BroadcastLoadTester {
  private queueManager: BroadcastQueueManager;
  private cacheManager: BroadcastCacheManager;
  private autoScaler: BroadcastAutoScaler;
  private results: {
    latencies: number[];
    errors: number;
    successes: number;
    startTime: number;
    endTime: number;
  };

  constructor() {
    this.queueManager = new BroadcastQueueManager();
    this.cacheManager = new BroadcastCacheManager();
    this.autoScaler = new BroadcastAutoScaler();
    this.results = {
      latencies: [],
      errors: 0,
      successes: 0,
      startTime: 0,
      endTime: 0
    };
  }

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResults> {
    console.log('🚀 Starting broadcast load test...', config);
    
    // Warm up cache before testing
    await this.warmupSystem();
    
    this.results = {
      latencies: [],
      errors: 0,
      successes: 0,
      startTime: performance.now(),
      endTime: 0
    };

    // Generate test data
    const broadcasts = this.generateTestBroadcasts(config);
    const userGroups = this.generateUserGroups(config);

    // Run load test
    await this.executeConcurrentLoad(broadcasts, userGroups, config);
    
    this.results.endTime = performance.now();
    
    // Collect system metrics
    const queueMetrics = await this.queueManager.getMetrics();
    const cacheStats = await this.cacheManager.getStats();
    
    return this.calculateResults(config, queueMetrics, cacheStats);
  }

  private async warmupSystem(): Promise<void> {
    console.log('🔥 Warming up system caches...');
    
    try {
      // Warmup cache
      await this.cacheManager.warmupCache();
      
      // Preload wedding season data
      await this.cacheManager.preloadWeddingSeasonData();
      
      console.log('✅ System warmup completed');
    } catch (error) {
      console.warn('⚠️ Warmup failed:', error);
    }
  }

  private generateTestBroadcasts(config: LoadTestConfig): any[] {
    const broadcasts = [];
    const totalBroadcasts = config.targetThroughput * config.testDuration;
    
    for (let i = 0; i < totalBroadcasts; i++) {
      broadcasts.push({
        id: `test-broadcast-${i}`,
        title: `Load Test Broadcast ${i}`,
        content: `This is test broadcast ${i} for load testing the system`,
        priority: this.getRandomPriority(),
        type: config.weddingSimulation ? 'wedding' : 'general',
        wedding_id: config.weddingSimulation ? `wedding-${i % 100}` : null,
        created_at: new Date().toISOString()
      });
    }
    
    return broadcasts;
  }

  private generateUserGroups(config: LoadTestConfig): string[][] {
    const userGroups = [];
    const usersPerGroup = Math.floor(config.concurrentUsers / config.batchSize);
    
    for (let i = 0; i < config.batchSize; i++) {
      const users = [];
      for (let j = 0; j < usersPerGroup; j++) {
        users.push(`test-user-${i * usersPerGroup + j}`);
      }
      userGroups.push(users);
    }
    
    return userGroups;
  }

  private getRandomPriority(): 'critical' | 'high' | 'normal' | 'low' {
    const rand = Math.random();
    if (rand < 0.05) return 'critical'; // 5%
    if (rand < 0.15) return 'high';     // 10%
    if (rand < 0.80) return 'normal';   // 65%
    return 'low';                       // 20%
  }

  private async executeConcurrentLoad(
    broadcasts: any[], 
    userGroups: string[][], 
    config: LoadTestConfig
  ): Promise<void> {
    const intervalMs = 1000 / config.targetThroughput;
    let broadcastIndex = 0;
    
    const promises: Promise<void>[] = [];
    
    console.log(`📊 Executing load test: ${config.targetThroughput} broadcasts/sec for ${config.testDuration}s`);
    
    // Create broadcast intervals
    const testPromise = new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        if (broadcastIndex >= broadcasts.length) {
          clearInterval(interval);
          resolve();
          return;
        }
        
        const broadcast = broadcasts[broadcastIndex];
        const users = userGroups[broadcastIndex % userGroups.length];
        
        // Execute broadcast with timing
        const broadcastPromise = this.executeSingleBroadcast(broadcast, users);
        promises.push(broadcastPromise);
        
        broadcastIndex++;
      }, intervalMs);
      
      // Stop test after duration
      setTimeout(() => {
        clearInterval(interval);
        resolve();
      }, config.testDuration * 1000);
    });
    
    await testPromise;
    
    // Wait for all broadcasts to complete
    console.log('⏳ Waiting for all broadcasts to complete...');
    await Promise.allSettled(promises);
  }

  private async executeSingleBroadcast(broadcast: any, users: string[]): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Enqueue broadcast
      await this.queueManager.enqueue(broadcast, users, broadcast.priority);
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      this.results.latencies.push(latency);
      this.results.successes++;
      
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      this.results.latencies.push(latency);
      this.results.errors++;
      
      console.error(`Broadcast ${broadcast.id} failed:`, error.message);
    }
  }

  private calculateResults(
    config: LoadTestConfig, 
    queueMetrics: any, 
    cacheStats: any
  ): LoadTestResults {
    const testDurationMs = this.results.endTime - this.results.startTime;
    const totalBroadcasts = this.results.successes + this.results.errors;
    
    // Sort latencies for percentile calculations
    const sortedLatencies = this.results.latencies.sort((a, b) => a - b);
    
    // Calculate percentiles
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    const results: LoadTestResults = {
      totalBroadcasts,
      actualThroughput: (totalBroadcasts / testDurationMs) * 1000, // per second
      averageLatency: sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0,
      errorRate: (this.results.errors / totalBroadcasts) * 100,
      successRate: (this.results.successes / totalBroadcasts) * 100,
      cacheHitRate: cacheStats.hitRate * 100,
      queuePerformance: {
        averageProcessingTime: queueMetrics.averageProcessingTime,
        maxQueueSize: queueMetrics.currentQueueSize,
        throughput: queueMetrics.throughputPerSecond
      }
    };
    
    return results;
  }

  async runWeddingSeasonSimulation(): Promise<LoadTestResults> {
    console.log('💒 Running wedding season simulation...');
    
    const config: LoadTestConfig = {
      targetThroughput: 300, // 3x normal load
      testDuration: 300, // 5 minutes
      concurrentUsers: 15000, // High concurrent users
      batchSize: 50,
      weddingSimulation: true
    };
    
    // Pre-scale for wedding season
    await this.autoScaler.preScaleForWeddingSeason();
    
    return this.runLoadTest(config);
  }

  async runWeekendTrafficSimulation(): Promise<LoadTestResults> {
    console.log('🎊 Running weekend traffic simulation...');
    
    const config: LoadTestConfig = {
      targetThroughput: 200, // 2x normal load
      testDuration: 600, // 10 minutes
      concurrentUsers: 10000,
      batchSize: 40,
      weddingSimulation: true
    };
    
    // Optimize for weekend traffic
    await this.autoScaler.optimizeForWeekendTraffic();
    
    return this.runLoadTest(config);
  }

  async validatePerformanceRequirements(): Promise<{
    passed: boolean;
    results: LoadTestResults;
    requirements: Record<string, { target: number; actual: number; passed: boolean }>;
  }> {
    console.log('✅ Validating performance requirements...');
    
    // Standard load test
    const results = await this.runLoadTest({
      targetThroughput: 100,
      testDuration: 60,
      concurrentUsers: 5000,
      batchSize: 25,
      weddingSimulation: false
    });
    
    const requirements = {
      'Sub-100ms Processing': {
        target: 100,
        actual: results.averageLatency,
        passed: results.averageLatency < 100
      },
      'P95 Latency < 200ms': {
        target: 200,
        actual: results.p95Latency,
        passed: results.p95Latency < 200
      },
      'Error Rate < 1%': {
        target: 1,
        actual: results.errorRate,
        passed: results.errorRate < 1
      },
      'Cache Hit Rate > 90%': {
        target: 90,
        actual: results.cacheHitRate,
        passed: results.cacheHitRate > 90
      },
      'Throughput > 80 req/s': {
        target: 80,
        actual: results.actualThroughput,
        passed: results.actualThroughput > 80
      }
    };
    
    const allPassed = Object.values(requirements).every(req => req.passed);
    
    return {
      passed: allPassed,
      results,
      requirements
    };
  }

  printResults(results: LoadTestResults, config?: LoadTestConfig): void {
    console.log('\n📊 LOAD TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Broadcasts: ${results.totalBroadcasts}`);
    console.log(`Actual Throughput: ${results.actualThroughput.toFixed(2)} broadcasts/sec`);
    console.log(`Average Latency: ${results.averageLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${results.p95Latency.toFixed(2)}ms`);
    console.log(`P99 Latency: ${results.p99Latency.toFixed(2)}ms`);
    console.log(`Success Rate: ${results.successRate.toFixed(2)}%`);
    console.log(`Error Rate: ${results.errorRate.toFixed(2)}%`);
    console.log(`Cache Hit Rate: ${results.cacheHitRate.toFixed(2)}%`);
    console.log('\n🔧 QUEUE PERFORMANCE');
    console.log('-'.repeat(30));
    console.log(`Queue Processing Time: ${results.queuePerformance.averageProcessingTime.toFixed(2)}ms`);
    console.log(`Max Queue Size: ${results.queuePerformance.maxQueueSize}`);
    console.log(`Queue Throughput: ${results.queuePerformance.throughput.toFixed(2)} ops/sec`);
    
    if (config) {
      console.log('\n🎯 TARGET vs ACTUAL');
      console.log('-'.repeat(30));
      console.log(`Target Throughput: ${config.targetThroughput} | Actual: ${results.actualThroughput.toFixed(2)}`);
      console.log(`Target Users: ${config.concurrentUsers} | Processing: ${results.totalBroadcasts}`);
    }
    
    console.log('='.repeat(50));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const testType = args.find(arg => arg.startsWith('--test='))?.split('=')[1] || 'standard';
  const targetThroughput = parseInt(args.find(arg => arg.startsWith('--target-throughput='))?.split('=')[1] || '100');
  
  const tester = new BroadcastLoadTester();
  
  try {
    let results: LoadTestResults;
    let config: LoadTestConfig | undefined;
    
    switch (testType) {
      case 'wedding-season':
        results = await tester.runWeddingSeasonSimulation();
        break;
      case 'weekend':
        results = await tester.runWeekendTrafficSimulation();
        break;
      case 'validation':
        const validation = await tester.validatePerformanceRequirements();
        console.log('\n🎯 PERFORMANCE VALIDATION');
        console.log('='.repeat(50));
        Object.entries(validation.requirements).forEach(([name, req]) => {
          const status = req.passed ? '✅' : '❌';
          console.log(`${status} ${name}: ${req.actual.toFixed(2)} (target: ${req.target})`);
        });
        console.log(`\nOverall Result: ${validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
        tester.printResults(validation.results);
        process.exit(validation.passed ? 0 : 1);
        
      default:
        config = {
          targetThroughput,
          testDuration: 60,
          concurrentUsers: 5000,
          batchSize: 25,
          weddingSimulation: false
        };
        results = await tester.runLoadTest(config);
        break;
    }
    
    tester.printResults(results, config);
    
    // Success criteria check
    const success = results.errorRate < 5 && results.averageLatency < 1000;
    console.log(`\n🎯 Test Result: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { BroadcastLoadTester, LoadTestConfig, LoadTestResults };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}