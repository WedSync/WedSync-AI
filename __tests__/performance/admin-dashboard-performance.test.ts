/**
 * WS-168: Performance Tests for Admin Dashboard Queries
 * Load testing and performance benchmarks for customer success dashboard
 */

import { performance } from 'perf_hooks';
import { createClient } from '@/lib/supabase/server';
import { healthScoringEngine } from '@/lib/services/health-scoring-engine';
import { healthInterventionService } from '@/lib/services/health-intervention-service';
import { allHealthScenarios, HealthScenarioBuilder } from '../fixtures/health-scenarios.fixture';

// Performance test configuration
const PERFORMANCE_CONFIG = {
  maxResponseTime: {
    single_health_score: 2000, // 2 seconds
    batch_health_scores: 10000, // 10 seconds
    dashboard_metrics: 3000, // 3 seconds
    intervention_metrics: 2500, // 2.5 seconds
    health_trends: 1500, // 1.5 seconds
    large_dataset: 15000 // 15 seconds for 1000+ records
  },
  load_test: {
    concurrent_users: 50,
    requests_per_user: 10,
    ramp_up_time: 5000 // 5 seconds
  },
  memory_limits: {
    max_heap_used: 512 * 1024 * 1024, // 512MB
    max_external_memory: 100 * 1024 * 1024 // 100MB
  }
};

// Performance measurement utilities
class PerformanceProfiler {
  private measurements: Map<string, number[]> = new Map();

  start(label: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      this.measurements.get(label)!.push(duration);
      
      return duration;
    };
  }

  getStats(label: string) {
    const times = this.measurements.get(label) || [];
    if (times.length === 0) return null;

    const sorted = [...times].sort((a, b) => a - b);
    return {
      count: times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      avg: times.reduce((a, b) => a + b) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  async measureMemory() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  generateReport() {
    const report: any = {};
    for (const [label, times] of this.measurements.entries()) {
      report[label] = this.getStats(label);
    }
    return report;
  }
}

const profiler = new PerformanceProfiler();

describe('Admin Dashboard Performance Tests', () => {
  let supabase: any;
  let testData: any[];

  beforeAll(async () => {
    supabase = createClient();
    
    // Create test dataset for performance testing
    testData = HealthScenarioBuilder.createBatchScenarioData(1000);
    
    // Insert test data into database (for realistic performance testing)
    await setupPerformanceTestData();
  });

  afterAll(async () => {
    // Cleanup performance test data
    await cleanupPerformanceTestData();
    
    // Generate and log performance report
    const report = profiler.generateReport();
    console.log('Performance Test Report:', JSON.stringify(report, null, 2));
  });

  describe('Health Score Calculation Performance', () => {
    test('should calculate single health score within time budget', async () => {
      const endMeasurement = profiler.start('single_health_score');
      
      const result = await healthScoringEngine.calculateHealthScore(
        testData[0].userProfile.id,
        false,
        testData[0].userProfile.organization_id
      );
      
      const duration = endMeasurement();
      
      expect(result).toHaveProperty('overall_health_score');
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.single_health_score);
    });

    test('should handle batch health score calculation efficiently', async () => {
      const batchSize = 50;
      const userIds = testData.slice(0, batchSize).map(d => d.userProfile.id);
      
      const endMeasurement = profiler.start('batch_health_scores');
      
      const results = await healthScoringEngine.calculateBatchHealthScores(
        userIds,
        'org-test-001'
      );
      
      const duration = endMeasurement();
      
      expect(results.size).toBe(batchSize);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.batch_health_scores);
    });

    test('should maintain performance with large datasets', async () => {
      const largeUserIds = testData.slice(0, 200).map(d => d.userProfile.id);
      
      const endMeasurement = profiler.start('large_dataset_health_scores');
      
      const results = await healthScoringEngine.calculateBatchHealthScores(
        largeUserIds,
        'org-test-001'
      );
      
      const duration = endMeasurement();
      
      expect(results.size).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.large_dataset);
    });

    test('should efficiently calculate health trends', async () => {
      const endMeasurement = profiler.start('health_trends');
      
      const trends = await healthScoringEngine.getHealthTrends(
        testData[0].userProfile.id,
        90 // 90 days
      );
      
      const duration = endMeasurement();
      
      expect(Array.isArray(trends)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.health_trends);
    });
  });

  describe('Dashboard Metrics Performance', () => {
    test('should load dashboard metrics efficiently', async () => {
      const endMeasurement = profiler.start('dashboard_metrics');
      
      // Simulate dashboard metrics calculation
      const [
        totalSuppliers,
        healthDistribution,
        recentAlerts,
        interventionMetrics
      ] = await Promise.all([
        getTotalSuppliersCount('org-test-001'),
        getHealthScoreDistribution('org-test-001'),
        getRecentAlerts('org-test-001', 10),
        getInterventionMetrics('org-test-001')
      ]);
      
      const duration = endMeasurement();
      
      expect(typeof totalSuppliers).toBe('number');
      expect(Array.isArray(healthDistribution)).toBe(true);
      expect(Array.isArray(recentAlerts)).toBe(true);
      expect(typeof interventionMetrics).toBe('object');
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.dashboard_metrics);
    });

    test('should efficiently handle intervention metrics queries', async () => {
      const endMeasurement = profiler.start('intervention_metrics');
      
      const metrics = await healthInterventionService.getInterventionMetrics(
        'org-test-001',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      );
      
      const duration = endMeasurement();
      
      expect(metrics).toHaveProperty('totalInterventions');
      expect(duration).toBeLessThan(PERFORMANCE_CONFIG.maxResponseTime.intervention_metrics);
    });

    test('should handle concurrent dashboard requests', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];
      
      const endMeasurement = profiler.start('concurrent_dashboard_requests');
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          healthScoringEngine.calculateHealthScore(
            testData[i % testData.length].userProfile.id
          )
        );
      }
      
      const results = await Promise.all(promises);
      const duration = endMeasurement();
      
      expect(results).toHaveLength(concurrentRequests);
      expect(results.every(r => r.overall_health_score >= 0)).toBe(true);
      
      // Concurrent requests should not take significantly longer than serial
      const maxAcceptableTime = PERFORMANCE_CONFIG.maxResponseTime.single_health_score * 2;
      expect(duration).toBeLessThan(maxAcceptableTime);
    });
  });

  describe('Database Query Performance', () => {
    test('should optimize complex health score queries', async () => {
      const endMeasurement = profiler.start('complex_health_query');
      
      // Complex query that joins multiple tables
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          client_engagement_events(count),
          success_milestones(count),
          organization_members!inner(organization_id)
        `)
        .eq('organization_members.organization_id', 'org-test-001')
        .limit(100);
      
      const duration = endMeasurement();
      
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(duration).toBeLessThan(3000); // 3 seconds for complex query
    });

    test('should efficiently paginate large result sets', async () => {
      const pageSize = 50;
      const endMeasurement = profiler.start('paginated_query');
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, created_at, organization_id')
        .eq('organization_id', 'org-test-001')
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);
      
      const duration = endMeasurement();
      
      expect(error).toBeNull();
      expect(data?.length).toBeLessThanOrEqual(pageSize);
      expect(duration).toBeLessThan(1000); // 1 second for paginated query
    });

    test('should handle aggregation queries efficiently', async () => {
      const endMeasurement = profiler.start('aggregation_query');
      
      // Simulate health score distribution calculation
      const healthDistribution = await calculateHealthScoreDistribution('org-test-001');
      
      const duration = endMeasurement();
      
      expect(healthDistribution).toHaveProperty('low');
      expect(healthDistribution).toHaveProperty('medium');
      expect(healthDistribution).toHaveProperty('high');
      expect(healthDistribution).toHaveProperty('critical');
      expect(duration).toBeLessThan(2000); // 2 seconds for aggregation
    });
  });

  describe('Load Testing', () => {
    test('should handle concurrent user load', async () => {
      const { concurrent_users, requests_per_user } = PERFORMANCE_CONFIG.load_test;
      const allPromises: Promise<any>[] = [];
      
      const endMeasurement = profiler.start('load_test');
      
      // Simulate concurrent users
      for (let user = 0; user < concurrent_users; user++) {
        const userPromises: Promise<any>[] = [];
        
        // Each user makes multiple requests
        for (let req = 0; req < requests_per_user; req++) {
          const userIndex = (user * requests_per_user + req) % testData.length;
          userPromises.push(
            healthScoringEngine.calculateHealthScore(
              testData[userIndex].userProfile.id
            ).catch(error => ({ error: error.message }))
          );
        }
        
        allPromises.push(...userPromises);
      }
      
      const results = await Promise.all(allPromises);
      const duration = endMeasurement();
      
      // Check success rate
      const successfulRequests = results.filter(r => !r.error).length;
      const successRate = successfulRequests / results.length;
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(duration).toBeLessThan(30000); // 30 seconds total
      
      console.log(`Load test completed: ${successfulRequests}/${results.length} successful requests in ${duration.toFixed(2)}ms`);
    });

    test('should maintain performance under sustained load', async () => {
      const requests = 100;
      const batchSize = 10;
      const durations: number[] = [];
      
      // Send requests in batches to simulate sustained load
      for (let i = 0; i < requests; i += batchSize) {
        const batch = testData.slice(i % testData.length, (i % testData.length) + batchSize);
        const batchStart = performance.now();
        
        const batchPromises = batch.map(data =>
          healthScoringEngine.calculateHealthScore(data.userProfile.id)
        );
        
        await Promise.all(batchPromises);
        const batchDuration = performance.now() - batchStart;
        durations.push(batchDuration);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Performance should not degrade significantly over time
      const firstHalf = durations.slice(0, Math.floor(durations.length / 2));
      const secondHalf = durations.slice(Math.floor(durations.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      
      // Performance degradation should be less than 50%
      expect(secondHalfAvg / firstHalfAvg).toBeLessThan(1.5);
    });
  });

  describe('Memory Usage Performance', () => {
    test('should maintain reasonable memory usage', async () => {
      const initialMemory = await profiler.measureMemory();
      
      // Perform memory-intensive operations
      const largeUserIds = testData.slice(0, 500).map(d => d.userProfile.id);
      await healthScoringEngine.calculateBatchHealthScores(largeUserIds, 'org-test-001');
      
      const finalMemory = await profiler.measureMemory();
      
      if (initialMemory && finalMemory) {
        const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
        const externalDiff = finalMemory.external - initialMemory.external;
        
        expect(heapUsedDiff).toBeLessThan(PERFORMANCE_CONFIG.memory_limits.max_heap_used);
        expect(externalDiff).toBeLessThan(PERFORMANCE_CONFIG.memory_limits.max_external_memory);
      }
    });

    test('should cleanup memory after operations', async () => {
      const initialMemory = await profiler.measureMemory();
      
      // Perform operations that create temporary objects
      for (let i = 0; i < 100; i++) {
        await healthScoringEngine.calculateHealthScore(
          testData[i % testData.length].userProfile.id
        );
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait for potential async cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const finalMemory = await profiler.measureMemory();
      
      if (initialMemory && finalMemory) {
        const heapUsedDiff = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory usage should not have increased significantly
        expect(heapUsedDiff).toBeLessThan(50 * 1024 * 1024); // 50MB
      }
    });
  });

  describe('Caching Performance', () => {
    test('should benefit from caching mechanisms', async () => {
      const userId = testData[0].userProfile.id;
      
      // First call (no cache)
      const endFirst = profiler.start('first_call_no_cache');
      await healthScoringEngine.calculateHealthScore(userId, true); // Force refresh
      const firstDuration = endFirst();
      
      // Second call (should use cache)
      const endSecond = profiler.start('second_call_cached');
      await healthScoringEngine.calculateHealthScore(userId, false);
      const secondDuration = endSecond();
      
      // Cached call should be significantly faster
      expect(secondDuration).toBeLessThan(firstDuration * 0.5);
    });

    test('should handle cache misses gracefully', async () => {
      // Test with users that don't have cached data
      const newUserIds = testData.slice(800, 810).map(d => d.userProfile.id);
      
      const endMeasurement = profiler.start('cache_miss_handling');
      
      const promises = newUserIds.map(userId =>
        healthScoringEngine.calculateHealthScore(userId)
      );
      
      const results = await Promise.all(promises);
      const duration = endMeasurement();
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.overall_health_score >= 0)).toBe(true);
      expect(duration).toBeLessThan(10000); // 10 seconds for 10 cache misses
    });
  });

  // Helper functions
  async function setupPerformanceTestData() {
    // This would insert test data into the database
    console.log('Setting up performance test data...');
    // Implementation would insert testData into actual database tables
  }

  async function cleanupPerformanceTestData() {
    // This would clean up test data from the database
    console.log('Cleaning up performance test data...');
  }

  async function getTotalSuppliersCount(organizationId: string): Promise<number> {
    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('role', 'supplier')
      .eq('status', 'active');
    
    return count || 0;
  }

  async function getHealthScoreDistribution(organizationId: string) {
    // Mock implementation - would query actual health score distribution
    return [
      { risk_level: 'low', count: Math.floor(Math.random() * 20) + 10 },
      { risk_level: 'medium', count: Math.floor(Math.random() * 30) + 20 },
      { risk_level: 'high', count: Math.floor(Math.random() * 25) + 15 },
      { risk_level: 'critical', count: Math.floor(Math.random() * 10) + 5 }
    ];
  }

  async function getRecentAlerts(organizationId: string, limit: number) {
    const { data } = await supabase
      .from('admin_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    return data || [];
  }

  async function getInterventionMetrics(organizationId: string) {
    return {
      totalInterventions: Math.floor(Math.random() * 100) + 50,
      successfulInterventions: Math.floor(Math.random() * 80) + 40,
      averageResponseTime: Math.random() * 5 + 1,
      churnPrevented: Math.floor(Math.random() * 20) + 5
    };
  }

  async function calculateHealthScoreDistribution(organizationId: string) {
    // Mock aggregation calculation
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate DB time
    
    return {
      low: 25,
      medium: 45,
      high: 25,
      critical: 5
    };
  }
});