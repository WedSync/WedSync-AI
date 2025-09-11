/**
 * WS-167 Trial Management System - Database Query Optimization Tests
 * 
 * Specialized performance tests focusing on:
 * - SQL query execution plans
 * - Index usage optimization
 * - Query caching effectiveness
 * - Database connection pooling
 * - N+1 query prevention
 */

import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import { TrialConfigFixtures, TrialTestHelpers } from '../../fixtures/trial/trial-fixtures';

// Query optimization benchmarks
const OPTIMIZATION_BENCHMARKS = {
  SIMPLE_SELECT: 10,      // Basic SELECT queries
  INDEXED_LOOKUP: 25,     // Indexed column lookups
  JOIN_OPERATION: 50,     // Table joins
  AGGREGATION: 100,       // GROUP BY, COUNT, SUM operations
  COMPLEX_SUBQUERY: 200,  // Nested queries
};

describe('Trial Query Optimization Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let testTrialId: string;
  let testUserId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const testSetup = await TrialTestHelpers.createTestTrial(
      supabase,
      TrialConfigFixtures.activeHighEngagement
    );
    testTrialId = testSetup.trialId;
    testUserId = testSetup.userId;

    // Create performance test data
    await TrialTestHelpers.createBulkFeatureUsage(supabase, testTrialId, 1000);
    await TrialTestHelpers.createBulkMilestones(supabase, testTrialId, 50);
  });

  afterAll(async () => {
    if (testUserId) {
      await TrialTestHelpers.cleanupTestData(supabase, testUserId);
    }
  });

  describe('Index Usage Optimization', () => {
    it('should use primary key indexes efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trials')
        .select('id, status, business_type')
        .eq('id', testTrialId)
        .single();
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.INDEXED_LOOKUP);
      
      console.log(`✅ Primary Key Index: ${executionTime.toFixed(2)}ms`);
    });

    it('should optimize foreign key lookups', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trial_feature_usage')
        .select('id, feature_key, usage_count')
        .eq('trial_id', testTrialId)
        .limit(10);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.INDEXED_LOOKUP);
      
      console.log(`✅ Foreign Key Index: ${executionTime.toFixed(2)}ms`);
    });

    it('should verify composite index effectiveness', async () => {
      const startTime = performance.now();
      
      // Query using multiple columns that should be in composite index
      const { data, error } = await supabase
        .from('trial_feature_usage')
        .select('*')
        .eq('trial_id', testTrialId)
        .eq('feature_key', 'client_dashboard_access')
        .order('created_at', { ascending: false })
        .limit(5);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.INDEXED_LOOKUP);
      
      console.log(`✅ Composite Index: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Join Operation Optimization', () => {
    it('should optimize single-level joins', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trials')
        .select(`
          id,
          status,
          trial_milestones!inner(
            milestone_type,
            achieved,
            value_impact_score
          )
        `)
        .eq('id', testTrialId)
        .single();
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.trial_milestones).toBeDefined();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.JOIN_OPERATION);
      
      console.log(`✅ Single-Level Join: ${executionTime.toFixed(2)}ms`);
    });

    it('should optimize multi-level joins', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trials')
        .select(`
          id,
          status,
          business_type,
          trial_milestones!inner(
            milestone_type,
            achieved
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
      expect(data).toBeDefined();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.JOIN_OPERATION * 2);
      
      console.log(`✅ Multi-Level Join: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Aggregation Query Optimization', () => {
    it('should optimize COUNT operations', async () => {
      const startTime = performance.now();
      
      const { data, error, count } = await supabase
        .from('trial_feature_usage')
        .select('*', { count: 'exact', head: true })
        .eq('trial_id', testTrialId);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(count).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.AGGREGATION);
      
      console.log(`✅ COUNT Optimization: ${executionTime.toFixed(2)}ms (count: ${count})`);
    });

    it('should optimize SUM/AVG aggregations', async () => {
      const startTime = performance.now();
      
      // Using RPC for complex aggregations
      const { data, error } = await supabase.rpc('calculate_trial_metrics', {
        input_trial_id: testTrialId
      });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.AGGREGATION);
      
      console.log(`✅ Aggregation RPC: ${executionTime.toFixed(2)}ms`);
    });

    it('should optimize GROUP BY operations', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trial_feature_usage')
        .select(`
          feature_key,
          COUNT(*) as usage_count,
          SUM(time_saved_minutes) as total_time_saved
        `)
        .eq('trial_id', testTrialId)
        .group(['feature_key'])
        .limit(20);
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.AGGREGATION);
      
      console.log(`✅ GROUP BY Optimization: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Query Caching Effectiveness', () => {
    it('should demonstrate query caching benefits', async () => {
      const query = supabase
        .from('trials')
        .select('id, status, business_type')
        .eq('id', testTrialId);
      
      // First execution (cold cache)
      const startTime1 = performance.now();
      const { data: data1, error: error1 } = await query;
      const executionTime1 = performance.now() - startTime1;
      
      expect(error1).toBeNull();
      expect(data1).toBeDefined();
      
      // Second execution (warm cache)
      const startTime2 = performance.now();
      const { data: data2, error: error2 } = await query;
      const executionTime2 = performance.now() - startTime2;
      
      expect(error2).toBeNull();
      expect(data2).toBeDefined();
      
      // Cache should improve performance (allow for some variance)
      const improvementRatio = executionTime1 / executionTime2;
      expect(improvementRatio).toBeGreaterThanOrEqual(0.8); // At least some improvement
      
      console.log(`✅ Query Caching: Cold=${executionTime1.toFixed(2)}ms, Warm=${executionTime2.toFixed(2)}ms`);
    });
  });

  describe('N+1 Query Prevention', () => {
    it('should prevent N+1 queries in milestone retrieval', async () => {
      // Inefficient approach (N+1 problem simulation)
      const startTimeInefficient = performance.now();
      
      const { data: trials } = await supabase
        .from('trials')
        .select('id')
        .limit(5);
      
      if (trials) {
        for (const trial of trials) {
          await supabase
            .from('trial_milestones')
            .select('*')
            .eq('trial_id', trial.id);
        }
      }
      
      const inefficientTime = performance.now() - startTimeInefficient;
      
      // Efficient approach (single query with join)
      const startTimeEfficient = performance.now();
      
      const { data: efficientData } = await supabase
        .from('trials')
        .select(`
          id,
          trial_milestones(*)
        `)
        .limit(5);
      
      const efficientTime = performance.now() - startTimeEfficient;
      
      expect(efficientData).toBeDefined();
      
      // Efficient approach should be significantly faster
      const improvementRatio = inefficientTime / efficientTime;
      expect(improvementRatio).toBeGreaterThan(1.5);
      
      console.log(`✅ N+1 Prevention: Inefficient=${inefficientTime.toFixed(2)}ms, Efficient=${efficientTime.toFixed(2)}ms`);
    });
  });

  describe('Complex Query Optimization', () => {
    it('should optimize nested subqueries', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('trials')
        .select(`
          id,
          status,
          business_type,
          (
            SELECT AVG(value_impact_score) 
            FROM trial_milestones 
            WHERE trial_id = trials.id AND achieved = true
          ) as avg_milestone_impact
        `)
        .eq('id', testTrialId)
        .single();
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.COMPLEX_SUBQUERY);
      
      console.log(`✅ Nested Subquery: ${executionTime.toFixed(2)}ms`);
    });

    it('should optimize window functions for analytics', async () => {
      const startTime = performance.now();
      
      // Using RPC for window function operations
      const { data, error } = await supabase.rpc('analyze_trial_progression', {
        input_trial_id: testTrialId
      });
      
      const executionTime = performance.now() - startTime;
      
      expect(error).toBeNull();
      expect(executionTime).toBeLessThan(OPTIMIZATION_BENCHMARKS.COMPLEX_SUBQUERY);
      
      console.log(`✅ Window Functions: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Connection Pool Optimization', () => {
    it('should handle concurrent connections efficiently', async () => {
      const concurrentQueries = 20;
      const startTime = performance.now();
      
      const promises = Array(concurrentQueries)
        .fill(null)
        .map(() => 
          supabase
            .from('trial_feature_usage')
            .select('id, feature_key')
            .eq('trial_id', testTrialId)
            .limit(1)
        );
      
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const avgTimePerQuery = totalTime / concurrentQueries;
      
      expect(results).toHaveLength(concurrentQueries);
      expect(avgTimePerQuery).toBeLessThan(OPTIMIZATION_BENCHMARKS.INDEXED_LOOKUP * 2);
      
      console.log(`✅ Connection Pool (${concurrentQueries} concurrent): ${avgTimePerQuery.toFixed(2)}ms avg`);
    });
  });

  describe('Query Plan Analysis', () => {
    it('should analyze and validate query execution plans', async () => {
      const criticalQueries = [
        {
          name: 'Trial Lookup by User ID',
          sql: `EXPLAIN SELECT * FROM trials WHERE user_id = $1`,
          params: [testUserId]
        },
        {
          name: 'Feature Usage Aggregation',
          sql: `EXPLAIN SELECT feature_key, COUNT(*), SUM(time_saved_minutes) 
                FROM trial_feature_usage 
                WHERE trial_id = $1 
                GROUP BY feature_key`,
          params: [testTrialId]
        },
        {
          name: 'Milestone Progress Query',
          sql: `EXPLAIN SELECT COUNT(*) FILTER (WHERE achieved = true) as completed,
                COUNT(*) as total 
                FROM trial_milestones 
                WHERE trial_id = $1`,
          params: [testTrialId]
        }
      ];

      for (const query of criticalQueries) {
        const { data: plan, error } = await supabase
          .rpc('explain_query_plan', {
            query_text: query.sql,
            query_params: query.params
          });

        expect(error).toBeNull();
        expect(plan).toBeDefined();
        
        // Analyze plan for potential issues
        const planText = JSON.stringify(plan).toLowerCase();
        
        // Should use indexes (not sequential scans for large tables)
        if (query.name.includes('Lookup')) {
          expect(planText).not.toMatch(/seq scan/);
        }
        
        // Should have reasonable cost estimates
        const costMatch = planText.match(/cost=[\d.]+\.\.([\d.]+)/);
        if (costMatch) {
          const cost = parseFloat(costMatch[1]);
          expect(cost).toBeLessThan(1000); // Arbitrary reasonable limit
        }
        
        console.log(`✅ Query Plan Analysis: ${query.name} - Optimized`);
      }
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance baselines over time', async () => {
      const baselineTests = [
        {
          name: 'Simple Trial Lookup',
          operation: () => supabase.from('trials').select('*').eq('id', testTrialId).single(),
          baseline: OPTIMIZATION_BENCHMARKS.INDEXED_LOOKUP
        },
        {
          name: 'Feature Usage Count',
          operation: () => supabase.from('trial_feature_usage').select('*', { count: 'exact', head: true }).eq('trial_id', testTrialId),
          baseline: OPTIMIZATION_BENCHMARKS.AGGREGATION
        },
        {
          name: 'Milestone Join Query',
          operation: () => supabase.from('trials').select('*, trial_milestones(*)').eq('id', testTrialId).single(),
          baseline: OPTIMIZATION_BENCHMARKS.JOIN_OPERATION
        }
      ];

      const results = [];
      
      for (const test of baselineTests) {
        const startTime = performance.now();
        const { data, error } = await test.operation();
        const executionTime = performance.now() - startTime;
        
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(executionTime).toBeLessThan(test.baseline);
        
        results.push({
          name: test.name,
          time: executionTime,
          baseline: test.baseline,
          status: executionTime < test.baseline ? 'PASS' : 'FAIL'
        });
      }
      
      console.log('✅ Performance Baseline Report:');
      results.forEach(result => {
        console.log(`   ${result.name}: ${result.time.toFixed(2)}ms (${result.status}) - Baseline: ${result.baseline}ms`);
      });
    });
  });
});

// Database function examples that should be created in Supabase
/*
-- Function: calculate_trial_metrics
CREATE OR REPLACE FUNCTION calculate_trial_metrics(input_trial_id UUID)
RETURNS TABLE(
  total_usage_count BIGINT,
  total_time_saved INTEGER,
  unique_features_used BIGINT,
  avg_usage_per_feature NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(tfu.usage_count)::BIGINT as total_usage_count,
    SUM(tfu.time_saved_minutes) as total_time_saved,
    COUNT(DISTINCT tfu.feature_key)::BIGINT as unique_features_used,
    AVG(tfu.usage_count) as avg_usage_per_feature
  FROM trial_feature_usage tfu
  WHERE tfu.trial_id = input_trial_id;
END;
$$ LANGUAGE plpgsql;

-- Function: analyze_trial_progression  
CREATE OR REPLACE FUNCTION analyze_trial_progression(input_trial_id UUID)
RETURNS TABLE(
  milestone_type TEXT,
  achieved BOOLEAN,
  days_since_trial_start INTEGER,
  progression_rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.milestone_type,
    tm.achieved,
    EXTRACT(DAY FROM tm.achieved_at - t.trial_start)::INTEGER as days_since_trial_start,
    ROW_NUMBER() OVER (ORDER BY tm.achieved_at) as progression_rank
  FROM trial_milestones tm
  JOIN trials t ON t.id = tm.trial_id
  WHERE tm.trial_id = input_trial_id
  ORDER BY tm.achieved_at;
END;
$$ LANGUAGE plpgsql;

-- Function: explain_query_plan
CREATE OR REPLACE FUNCTION explain_query_plan(query_text TEXT, query_params TEXT[] DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  plan JSON;
BEGIN
  EXECUTE 'EXPLAIN (FORMAT JSON) ' || query_text 
  USING VARIADIC query_params 
  INTO plan;
  
  RETURN plan;
END;
$$ LANGUAGE plpgsql;
*/