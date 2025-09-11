/**
 * WS-167 Performance Test Setup
 * Configuration and setup for performance testing
 */

import { beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.local' });
config({ path: '.env.test' });

// Performance test configuration
export const PERFORMANCE_CONFIG = {
  database: {
    maxConnections: 10,
    connectionTimeout: 5000,
    queryTimeout: 30000
  },
  benchmarks: {
    activityScoreCalculation: 100,
    roiMetricsComputation: 150,
    bulkMilestoneQuery: 200,
    complexJoinQueries: 500
  },
  testData: {
    bulkTestSize: 100,
    concurrentTestCount: 10,
    stressTestIterations: 50
  }
};

// Global performance test setup
beforeAll(async () => {
  console.log('🚀 Starting WS-167 Performance Test Suite');
  console.log('📊 Performance Benchmarks:', PERFORMANCE_CONFIG.benchmarks);
  
  // Verify environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  
  console.log('✅ Environment configuration validated');
});

// Global performance test cleanup
afterAll(async () => {
  console.log('🏁 Performance Test Suite Complete');
  
  // Memory cleanup
  if (global.gc) {
    global.gc();
    console.log('🧹 Garbage collection triggered');
  }
});

// Performance testing utilities
export const PerformanceUtils = {
  /**
   * Measure execution time with high precision
   */
  measureTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  },

  /**
   * Validate performance against benchmark
   */
  validatePerformance: (duration: number, benchmark: number, testName: string): void => {
    const passed = duration < benchmark;
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${duration.toFixed(2)}ms (limit: ${benchmark}ms)`);
    
    if (!passed) {
      console.warn(`⚠️  Performance regression detected in ${testName}`);
    }
  },

  /**
   * Generate performance report data
   */
  createPerformanceReport: (results: Array<{ name: string; duration: number; benchmark: number }>) => {
    const passed = results.filter(r => r.duration < r.benchmark).length;
    const failed = results.length - passed;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    return {
      totalTests: results.length,
      passed,
      failed,
      passRate: (passed / results.length) * 100,
      avgDuration,
      results
    };
  }
};

// Export configuration for use in tests
export default PERFORMANCE_CONFIG;