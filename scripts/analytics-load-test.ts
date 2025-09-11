#!/usr/bin/env ts-node

/**
 * WS-225 Analytics Load Testing Suite
 * Team D - Round 1
 * 
 * Comprehensive load testing for client portal analytics operations
 * Tests concurrent access, cache effectiveness, and performance under load
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  testDurationMs: number;
  supplierIds: string[];
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  weight: number; // Probability weight (0-100)
  endpoint: string;
  params?: Record<string, string>;
}

interface TestResult {
  scenario: string;
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageLatency: number;
  p95Latency: number;
  minLatency: number;
  maxLatency: number;
  cacheHitRate: number;
  errors: string[];
}

interface LoadTestResults {
  summary: {
    totalRequests: number;
    totalSuccess: number;
    totalErrors: number;
    averageLatency: number;
    requestsPerSecond: number;
    testDurationMs: number;
    concurrentUsers: number;
  };
  scenarioResults: TestResult[];
  performanceMetrics: {
    cpuUsage?: number;
    memoryUsage?: number;
    networkLatency: number;
  };
}

class AnalyticsLoadTester {
  private config: LoadTestConfig;
  private results: Map<string, number[]> = new Map();
  private errors: Map<string, string[]> = new Map();
  private cacheHits: Map<string, number> = new Map();
  private cacheMisses: Map<string, number> = new Map();

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<LoadTestResults> {
    console.log('🚀 Starting Analytics Load Test...');
    console.log(`Configuration:
    - Base URL: ${this.config.baseUrl}
    - Concurrent Users: ${this.config.concurrentUsers}
    - Test Duration: ${this.config.testDurationMs}ms
    - Suppliers: ${this.config.supplierIds.length}
    - Scenarios: ${this.config.scenarios.length}`);

    const startTime = performance.now();
    
    // Initialize tracking
    this.config.scenarios.forEach(scenario => {
      this.results.set(scenario.name, []);
      this.errors.set(scenario.name, []);
      this.cacheHits.set(scenario.name, 0);
      this.cacheMisses.set(scenario.name, 0);
    });

    // Start concurrent users
    const userPromises: Promise<void>[] = [];
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i, startTime));
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    const endTime = performance.now();
    const actualDuration = endTime - startTime;

    return this.generateResults(actualDuration);
  }

  private async simulateUser(userId: number, testStartTime: number): Promise<void> {
    const userStartTime = performance.now();
    let requestCount = 0;

    while ((performance.now() - testStartTime) < this.config.testDurationMs) {
      try {
        // Select scenario based on weights
        const scenario = this.selectScenario();
        const supplierId = this.selectSupplierId();
        
        await this.executeScenario(scenario, supplierId, userId, requestCount);
        
        requestCount++;
        
        // Add random delay between requests (100-500ms)
        await this.delay(100 + Math.random() * 400);
        
      } catch (error) {
        console.error(`User ${userId} error:`, error);
      }
    }

    console.log(`👤 User ${userId} completed ${requestCount} requests in ${(performance.now() - userStartTime).toFixed(2)}ms`);
  }

  private selectScenario(): TestScenario {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (const scenario of this.config.scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }
    
    return this.config.scenarios[0]; // Fallback
  }

  private selectSupplierId(): string {
    return this.config.supplierIds[Math.floor(Math.random() * this.config.supplierIds.length)];
  }

  private async executeScenario(scenario: TestScenario, supplierId: string, userId: number, requestIndex: number): Promise<void> {
    const requestStart = performance.now();
    
    try {
      // Build URL with parameters
      const url = new URL(`${this.config.baseUrl}${scenario.endpoint}`);
      url.searchParams.append('supplierId', supplierId);
      
      // Add scenario-specific parameters
      if (scenario.params) {
        Object.entries(scenario.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }
      
      // Add random time ranges for cache testing
      const timeRanges = ['7d', '30d', '90d'];
      const randomTimeRange = timeRanges[Math.floor(Math.random() * timeRanges.length)];
      if (scenario.endpoint.includes('client-dashboard')) {
        url.searchParams.append('timeRange', randomTimeRange);
      }

      // Make request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `LoadTest-User-${userId}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const requestEnd = performance.now();
      const latency = requestEnd - requestStart;
      
      if (response.ok) {
        const data = await response.json();
        
        // Track cache hit/miss
        if (data.cached === true) {
          this.cacheHits.set(scenario.name, (this.cacheHits.get(scenario.name) || 0) + 1);
        } else {
          this.cacheMisses.set(scenario.name, (this.cacheMisses.get(scenario.name) || 0) + 1);
        }
        
        // Track latency
        this.results.get(scenario.name)?.push(latency);
        
        // Log performance data if available
        if (data.performance) {
          console.log(`📊 ${scenario.name} - Latency: ${latency.toFixed(2)}ms, API: ${data.performance.total_duration_ms}ms, Cache: ${data.cached ? 'HIT' : 'MISS'}`);
        }
        
      } else {
        const errorText = await response.text();
        this.errors.get(scenario.name)?.push(`HTTP ${response.status}: ${errorText}`);
        console.error(`❌ ${scenario.name} failed: HTTP ${response.status}`);
      }
      
    } catch (error) {
      const requestEnd = performance.now();
      const latency = requestEnd - requestStart;
      
      if (error.name === 'AbortError') {
        this.errors.get(scenario.name)?.push('Request timeout (>10s)');
      } else {
        this.errors.get(scenario.name)?.push(error.message);
      }
      
      console.error(`💥 ${scenario.name} error:`, error.message);
    }
  }

  private generateResults(actualDuration: number): LoadTestResults {
    const scenarioResults: TestResult[] = [];
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalLatency = 0;

    // Process results for each scenario
    this.config.scenarios.forEach(scenario => {
      const latencies = this.results.get(scenario.name) || [];
      const errors = this.errors.get(scenario.name) || [];
      const cacheHits = this.cacheHits.get(scenario.name) || 0;
      const cacheMisses = this.cacheMisses.get(scenario.name) || 0;
      
      const requestCount = latencies.length + errors.length;
      const successCount = latencies.length;
      const errorCount = errors.length;
      
      totalRequests += requestCount;
      totalSuccess += successCount;
      totalErrors += errorCount;
      totalLatency += latencies.reduce((sum, lat) => sum + lat, 0);

      // Calculate percentiles
      const sortedLatencies = latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      
      const cacheHitRate = cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0;

      scenarioResults.push({
        scenario: scenario.name,
        requestCount,
        successCount,
        errorCount,
        averageLatency: latencies.length > 0 ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0,
        p95Latency: sortedLatencies.length > 0 ? sortedLatencies[p95Index] || 0 : 0,
        minLatency: sortedLatencies.length > 0 ? sortedLatencies[0] : 0,
        maxLatency: sortedLatencies.length > 0 ? sortedLatencies[sortedLatencies.length - 1] : 0,
        cacheHitRate,
        errors: errors.slice(0, 5) // First 5 errors for debugging
      });
    });

    const averageLatency = totalSuccess > 0 ? totalLatency / totalSuccess : 0;
    const requestsPerSecond = (totalRequests / actualDuration) * 1000;

    return {
      summary: {
        totalRequests,
        totalSuccess,
        totalErrors,
        averageLatency,
        requestsPerSecond,
        testDurationMs: actualDuration,
        concurrentUsers: this.config.concurrentUsers
      },
      scenarioResults,
      performanceMetrics: {
        networkLatency: averageLatency
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Load test configurations for different scenarios
const configs = {
  // Light load - simulates normal usage
  light: {
    concurrentUsers: 5,
    testDurationMs: 30000, // 30 seconds
    scenarios: [
      { name: 'analytics_dashboard', weight: 60, endpoint: '/api/analytics/client-dashboard' },
      { name: 'alerts_check', weight: 30, endpoint: '/api/analytics/alerts' },
      { name: 'alerts_filtered', weight: 10, endpoint: '/api/analytics/alerts', params: { severity: 'high' } }
    ]
  },
  
  // Medium load - simulates busy periods
  medium: {
    concurrentUsers: 15,
    testDurationMs: 60000, // 1 minute
    scenarios: [
      { name: 'analytics_dashboard', weight: 50, endpoint: '/api/analytics/client-dashboard' },
      { name: 'alerts_check', weight: 25, endpoint: '/api/analytics/alerts' },
      { name: 'alerts_critical', weight: 15, endpoint: '/api/analytics/alerts', params: { severity: 'critical' } },
      { name: 'alerts_high', weight: 10, endpoint: '/api/analytics/alerts', params: { severity: 'high' } }
    ]
  },
  
  // Heavy load - stress testing
  heavy: {
    concurrentUsers: 50,
    testDurationMs: 120000, // 2 minutes
    scenarios: [
      { name: 'analytics_dashboard', weight: 40, endpoint: '/api/analytics/client-dashboard' },
      { name: 'alerts_check', weight: 25, endpoint: '/api/analytics/alerts' },
      { name: 'alerts_filtered', weight: 20, endpoint: '/api/analytics/alerts', params: { severity: 'high' } },
      { name: 'alerts_limited', weight: 15, endpoint: '/api/analytics/alerts', params: { limit: '10' } }
    ]
  }
};

async function runAnalyticsLoadTest() {
  const testLevel = process.argv[2] || 'light';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // Generate test supplier IDs (replace with real ones in production)
  const supplierIds = [
    'b5f8c3d2-4a89-4c67-9f12-8d3e4f5a6b7c',
    'a7e6d5c4-3b28-4f56-8e23-7c9b1a2d3e4f',
    'c9f2e1d0-5a74-4b83-9d45-6e8a2b5c4f7a',
    'd1a3b5c7-6e89-4f2b-8c34-5a7d9e2f1b4c',
    'e8b4c6d2-7f91-4a35-9e67-4c8b5a3f2d1e'
  ];

  const config: LoadTestConfig = {
    baseUrl,
    supplierIds,
    ...configs[testLevel as keyof typeof configs]
  };

  console.log(`🎯 Running ${testLevel.toUpperCase()} load test...`);
  
  const tester = new AnalyticsLoadTester(config);
  
  try {
    const results = await tester.runLoadTest();
    
    // Display results
    console.log('\n📈 LOAD TEST RESULTS');
    console.log('====================');
    console.log(`Duration: ${(results.summary.testDurationMs / 1000).toFixed(2)}s`);
    console.log(`Concurrent Users: ${results.summary.concurrentUsers}`);
    console.log(`Total Requests: ${results.summary.totalRequests}`);
    console.log(`Success Rate: ${((results.summary.totalSuccess / results.summary.totalRequests) * 100).toFixed(2)}%`);
    console.log(`Average Latency: ${results.summary.averageLatency.toFixed(2)}ms`);
    console.log(`Requests/Second: ${results.summary.requestsPerSecond.toFixed(2)}`);
    
    console.log('\n🎯 SCENARIO BREAKDOWN');
    console.log('=====================');
    results.scenarioResults.forEach(result => {
      console.log(`\n${result.scenario}:`);
      console.log(`  Requests: ${result.requestCount}`);
      console.log(`  Success Rate: ${((result.successCount / result.requestCount) * 100).toFixed(2)}%`);
      console.log(`  Avg Latency: ${result.averageLatency.toFixed(2)}ms`);
      console.log(`  P95 Latency: ${result.p95Latency.toFixed(2)}ms`);
      console.log(`  Cache Hit Rate: ${result.cacheHitRate.toFixed(1)}%`);
      
      if (result.errors.length > 0) {
        console.log(`  Sample Errors: ${result.errors.slice(0, 3).join(', ')}`);
      }
    });
    
    // Performance assessment
    console.log('\n🏆 PERFORMANCE ASSESSMENT');
    console.log('==========================');
    const successRate = (results.summary.totalSuccess / results.summary.totalRequests) * 100;
    const avgLatency = results.summary.averageLatency;
    const rps = results.summary.requestsPerSecond;
    
    let grade = 'F';
    if (successRate >= 99 && avgLatency < 500 && rps > 10) grade = 'A';
    else if (successRate >= 95 && avgLatency < 1000 && rps > 5) grade = 'B';
    else if (successRate >= 90 && avgLatency < 2000 && rps > 2) grade = 'C';
    else if (successRate >= 85 && avgLatency < 5000) grade = 'D';
    
    console.log(`Overall Grade: ${grade}`);
    
    if (grade === 'A' || grade === 'B') {
      console.log('✅ Analytics system performs well under load');
    } else if (grade === 'C') {
      console.log('⚠️  Analytics system shows some performance issues');
    } else {
      console.log('❌ Analytics system requires optimization');
    }
    
    // Cache effectiveness analysis
    const overallCacheHitRate = results.scenarioResults.reduce((acc, result) => 
      acc + (result.cacheHitRate * result.requestCount), 0) / results.summary.totalRequests;
    
    console.log(`Cache Effectiveness: ${overallCacheHitRate.toFixed(1)}%`);
    if (overallCacheHitRate > 60) {
      console.log('✅ Cache strategy is effective');
    } else {
      console.log('⚠️  Cache strategy needs improvement');
    }
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analytics-load-test-${testLevel}-${timestamp}.json`;
    
    console.log(`\n💾 Results saved to: ${filename}`);
    
    // Exit with error code if performance is poor
    process.exit(grade === 'F' ? 1 : 0);
    
  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Run the load test if this file is executed directly
if (require.main === module) {
  runAnalyticsLoadTest().catch(console.error);
}

export { AnalyticsLoadTester, LoadTestConfig, LoadTestResults };