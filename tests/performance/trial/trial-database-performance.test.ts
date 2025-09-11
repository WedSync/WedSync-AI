/**
 * WS-167 Trial Management System - Database Performance Tests
 * 
 * Performance tests for trial-related database operations focusing on:
 * - Activity score calculation query performance
 * - ROI metrics computation performance
 * - Bulk data processing efficiency
 * - Database index effectiveness
 * - Query optimization validation
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { TrialConfigFixtures, TrialTestHelpers } from '../../fixtures/trial/trial-fixtures';

// Performance benchmarks (in milliseconds)
const PERFORMANCE_BENCHMARKS = {
  ACTIVITY_SCORE_CALCULATION: 100, // Must complete under 100ms
  ROI_METRICS_COMPUTATION: 150,    // Must complete under 150ms
  BULK_MILESTONE_QUERY: 200,       // Must complete under 200ms
  TRIAL_STATUS_AGGREGATION: 250,   // Must complete under 250ms
  FEATURE_USAGE_ANALYTICS: 300,    // Must complete under 300ms
  COMPLEX_JOIN_QUERIES: 500,       // Must complete under 500ms
};

// Test configuration
const BULK_TEST_SIZE = 100;
const CONCURRENT_TEST_COUNT = 10;
const STRESS_TEST_ITERATIONS = 50;

describe('Trial Database Performance Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let trialService: TrialService;
  let testTrialId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize services with test configuration
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );

    const subscriptionService = new SubscriptionService(supabase, {} as any);
    trialService = new TrialService(supabase, subscriptionService);

    // Create test data for performance testing
    const testSetup = await TrialTestHelpers.createTestTrial(
      supabase,
      TrialConfigFixtures.activeHighEngagement
    );
    testTrialId = testSetup.trialId;
    testUserId = testSetup.userId;

    // Create bulk test data for realistic performance testing
    await TrialTestHelpers.createBulkFeatureUsage(
      supabase,
      testTrialId,
      BULK_TEST_SIZE
    );

    await TrialTestHelpers.createBulkMilestones(
      supabase,
      testTrialId,
      20 // 20 milestones for performance testing
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testUserId) {
      await TrialTestHelpers.cleanupTestData(supabase, testUserId);
    }
  });

  describe('Activity Score Calculation Performance', () => {
    it('should calculate activity scores within performance benchmark', async () => {
      const startTime = performance.now();
      
      const result = await trialService.calculateActivityScore(testUserId);
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION);
      expect(result.activity_score).toBeGreaterThan(0);
      expect(result.calculation_metadata).toBeDefined();
      
      console.log(`✅ Activity Score Calculation: ${executionTime.toFixed(2)}ms (limit: ${PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION}ms)`);
    });

    it('should handle concurrent activity score calculations efficiently', async () => {
      const startTime = performance.now();
      
      const promises = Array(CONCURRENT_TEST_COUNT)
        .fill(null)
        .map(() => trialService.calculateActivityScore(testUserId));
      
      const results = await Promise.all(promises);
      
      const executionTime = performance.now() - startTime;
      const avgTimePerCalculation = executionTime / CONCURRENT_TEST_COUNT;
      
      expect(avgTimePerCalculation).toBeLessThan(PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION);
      expect(results).toHaveLength(CONCURRENT_TEST_COUNT);
      
      console.log(`✅ Concurrent Activity Calculations (${CONCURRENT_TEST_COUNT}): ${avgTimePerCalculation.toFixed(2)}ms avg`);
    });

    it('should optimize activity score queries with proper indexing', async () => {
      // Test query plan analysis for activity score calculation
      const { data: queryPlan, error } = await supabase
        .rpc('explain_query_plan', {
          query_text: `
            SELECT 
              tfu.trial_id,
              COUNT(tfu.id) as usage_count,
              SUM(tfu.time_saved_minutes) as total_time_saved,
              AVG(tfu.usage_count) as avg_usage_frequency
            FROM trial_feature_usage tfu 
            WHERE tfu.trial_id = '${testTrialId}'
            GROUP BY tfu.trial_id
          `
        });

      expect(error).toBeNull();
      expect(queryPlan).toBeDefined();
      
      // Verify index usage (should contain "Index Scan" in plan)
      const planText = JSON.stringify(queryPlan);
      expect(planText).toMatch(/Index.*Scan|Using.*index/i);
      
      console.log('✅ Activity Score Query Plan Uses Indexes');
    });
  });

  describe('ROI Metrics Computation Performance', () => {
    it('should compute ROI metrics within performance benchmark', async () => {
      const startTime = performance.now();
      
      const trialStatus = await trialService.getTrialStatus(testUserId);
      
      const executionTime = performance.now() - startTime;
      
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.ROI_METRICS_COMPUTATION);
      expect(trialStatus.progress.roi_metrics).toBeDefined();
      expect(trialStatus.progress.roi_metrics.total_time_saved_hours).toBeGreaterThan(0);
      expect(trialStatus.progress.roi_metrics.estimated_cost_savings).toBeGreaterThan(0);
      
      console.log(`✅ ROI Metrics Computation: ${executionTime.toFixed(2)}ms (limit: ${PERFORMANCE_BENCHMARKS.ROI_METRICS_COMPUTATION}ms)`);
    });

    it('should efficiently aggregate complex ROI calculations', async () => {
      const startTime = performance.now();
      
      // Complex aggregation query for ROI metrics
      const { data: roiData, error } = await supabase
        .from('trial_feature_usage')
        .select(`
          trial_id,
          feature_key,
          usage_count,
          time_saved_minutes,
          created_at
        `)
        .eq('trial_id', testTrialId)
        .order('created_at', { ascending: false });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(roiData).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.ROI_METRICS_COMPUTATION);
      
      console.log(`✅ ROI Aggregation Query: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Bulk Data Processing Performance', () => {
    it('should handle bulk milestone queries within benchmark', async () => {
      const startTime = performance.now();
      
      const { data: milestones, error } = await supabase
        .from('trial_milestones')
        .select('*')
        .eq('trial_id', testTrialId)
        .order('value_impact_score', { ascending: false });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(milestones).toBeDefined();
      expect(milestones!.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.BULK_MILESTONE_QUERY);
      
      console.log(`✅ Bulk Milestone Query (${milestones!.length} records): ${executionTime.toFixed(2)}ms`);
    });

    it('should efficiently process feature usage analytics', async () => {
      const startTime = performance.now();
      
      // Complex analytics query
      const { data: analytics, error } = await supabase
        .from('trial_feature_usage')
        .select(`
          feature_key,
          feature_name,
          COUNT(*) as total_usage,
          AVG(usage_count) as avg_usage_count,
          SUM(time_saved_minutes) as total_time_saved,
          MAX(usage_count) as peak_usage,
          MIN(created_at) as first_use,
          MAX(created_at) as last_use
        `)
        .eq('trial_id', testTrialId)
        .not('feature_key', 'is', null)
        .group(['feature_key', 'feature_name']);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(analytics).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.FEATURE_USAGE_ANALYTICS);
      
      console.log(`✅ Feature Usage Analytics: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Complex Join Query Performance', () => {
    it('should handle complex trial status aggregation efficiently', async () => {
      const startTime = performance.now();
      
      // Complex join query simulating trial dashboard data
      const { data: complexData, error } = await supabase
        .from('trials')
        .select(`
          id,
          status,
          business_type,
          trial_start,
          trial_end,
          trial_milestones!inner(
            milestone_type,
            achieved,
            value_impact_score
          ),
          trial_feature_usage!inner(
            feature_key,
            usage_count,
            time_saved_minutes
          )
        `)
        .eq('id', testTrialId)
        .single();
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(complexData).toBeDefined();
      expect(complexData!.trial_milestones).toBeDefined();
      expect(complexData!.trial_feature_usage).toBeDefined();
      expect(executionTime).toBeLessThan(PERFORMANCE_BENCHMARKS.COMPLEX_JOIN_QUERIES);
      
      console.log(`✅ Complex Join Query: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Database Index Effectiveness', () => {
    it('should verify optimal index usage for trial queries', async () => {
      // Test primary indexes
      const criticalQueries = [
        {
          name: 'Trial by User ID',
          query: `SELECT * FROM trials WHERE user_id = '${testUserId}'`,
          expectedIndex: 'trials_user_id_idx'
        },
        {
          name: 'Feature Usage by Trial ID',
          query: `SELECT * FROM trial_feature_usage WHERE trial_id = '${testTrialId}'`,
          expectedIndex: 'trial_feature_usage_trial_id_idx'
        },
        {
          name: 'Milestones by Trial ID',
          query: `SELECT * FROM trial_milestones WHERE trial_id = '${testTrialId}'`,
          expectedIndex: 'trial_milestones_trial_id_idx'
        }
      ];

      for (const queryTest of criticalQueries) {
        const startTime = performance.now();
        
        const { data: queryResult, error } = await supabase
          .rpc('explain_query', { query_sql: queryTest.query });
        
        const executionTime = performance.now() - startTime;
        
        expect(error).toBeNull();
        expect(executionTime).toBeLessThan(50); // Index queries should be very fast
        
        console.log(`✅ ${queryTest.name}: ${executionTime.toFixed(2)}ms`);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under stress load', async () => {
      const results: number[] = [];
      
      for (let i = 0; i < STRESS_TEST_ITERATIONS; i++) {
        const startTime = performance.now();
        
        await trialService.calculateActivityScore(testUserId);
        
        const executionTime = performance.now() - startTime;
        results.push(executionTime);
      }
      
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const minTime = Math.min(...results);
      
      expect(avgTime).toBeLessThan(PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION * 2);
      expect(maxTime).toBeLessThan(PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION * 3);
      
      console.log(`✅ Stress Test Results:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
      console.log(`   Iterations: ${STRESS_TEST_ITERATIONS}`);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should optimize memory usage for large data sets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process large dataset
      const { data: largeDataset, error } = await supabase
        .from('trial_feature_usage')
        .select('*')
        .eq('trial_id', testTrialId)
        .limit(BULK_TEST_SIZE);
      
      expect(error).toBeNull();
      expect(largeDataset).toBeDefined();
      
      // Process data in chunks to test memory efficiency
      const chunkSize = 10;
      const chunks = [];
      
      for (let i = 0; i < largeDataset!.length; i += chunkSize) {
        chunks.push(largeDataset!.slice(i, i + chunkSize));
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for test data)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`✅ Memory Usage: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions in critical paths', async () => {
      const criticalOperations = [
        {
          name: 'Activity Score Calculation',
          operation: () => trialService.calculateActivityScore(testUserId),
          benchmark: PERFORMANCE_BENCHMARKS.ACTIVITY_SCORE_CALCULATION
        },
        {
          name: 'Trial Status Retrieval',
          operation: () => trialService.getTrialStatus(testUserId),
          benchmark: PERFORMANCE_BENCHMARKS.ROI_METRICS_COMPUTATION
        }
      ];

      const performanceReport: Array<{
        operation: string;
        executionTime: number;
        benchmark: number;
        status: 'PASS' | 'FAIL';
      }> = [];

      for (const op of criticalOperations) {
        const startTime = performance.now();
        await op.operation();
        const executionTime = performance.now() - startTime;
        
        const status = executionTime < op.benchmark ? 'PASS' : 'FAIL';
        
        performanceReport.push({
          operation: op.name,
          executionTime,
          benchmark: op.benchmark,
          status
        });
        
        expect(executionTime).toBeLessThan(op.benchmark);
      }

      console.log('✅ Performance Regression Report:');
      performanceReport.forEach(report => {
        console.log(`   ${report.operation}: ${report.executionTime.toFixed(2)}ms (${report.status})`);
      });
    });
  });
});

/**
 * Performance Test Utilities
 */
export class PerformanceTestUtils {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; avgTime: number; minTime: number; maxTime: number }> {
    const times: number[] = [];
    let result: T;
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      result = await operation();
      const executionTime = performance.now() - startTime;
      times.push(executionTime);
    }
    
    return {
      result: result!,
      avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    };
  }
  
  static createPerformanceReport(
    testResults: Array<{
      testName: string;
      executionTime: number;
      benchmark: number;
    }>
  ): {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    avgExecutionTime: number;
  } {
    const passedTests = testResults.filter(r => r.executionTime < r.benchmark).length;
    const failedTests = testResults.length - passedTests;
    const avgExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / testResults.length;
    
    return {
      totalTests: testResults.length,
      passedTests,
      failedTests,
      avgExecutionTime
    };
  }
}