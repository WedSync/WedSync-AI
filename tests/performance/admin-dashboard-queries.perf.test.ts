// Performance tests for admin dashboard queries
import { performance } from 'perf_hooks';
import { createClient } from '@supabase/supabase-js';
import { generateBulkSuppliers } from '../fixtures/customer-success/health-scenarios.fixtures';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  healthScoreCalculation: 100, // ms per supplier
  dashboardLoad: 2000, // ms for initial load
  aggregationQuery: 1000, // ms for aggregation
  paginatedQuery: 500, // ms per page
  complexFilter: 800, // ms for complex filtering
  bulkUpdate: 5000, // ms for bulk operations
  realTimeUpdate: 100, // ms for real-time subscription
  cacheHit: 50, // ms for cached queries
};

// Test database connection
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

describe('Admin Dashboard Query Performance', () => {
  let testSuppliers: any[];
  
  beforeAll(async () => {
    // Generate test data
    testSuppliers = generateBulkSuppliers(1000, 'mixed');
    
    // Insert test data
    const { error } = await supabase
      .from('suppliers')
      .insert(testSuppliers);
      
    if (error) {
      console.error('Failed to insert test data:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    // Clean up test data
    const supplierIds = testSuppliers.map(s => s.supplierId);
    await supabase
      .from('suppliers')
      .delete()
      .in('id', supplierIds);
  });

  describe('Health Score Calculations', () => {
    test('should calculate single health score within threshold', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('calculate_health_score', {
          supplier_id: testSuppliers[0].supplierId
        });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.healthScoreCalculation);
      
      console.log(`Single health score calculation: ${duration.toFixed(2)}ms`);
    });
    
    test('should batch calculate health scores efficiently', async () => {
      const batchSize = 100;
      const supplierIds = testSuppliers.slice(0, batchSize).map(s => s.supplierId);
      
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('batch_calculate_health_scores', {
          supplier_ids: supplierIds
        });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const perSupplierTime = duration / batchSize;
      
      expect(error).toBeNull();
      expect(data).toHaveLength(batchSize);
      expect(perSupplierTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthScoreCalculation);
      
      console.log(`Batch health score calculation: ${duration.toFixed(2)}ms total, ${perSupplierTime.toFixed(2)}ms per supplier`);
    });
    
    test('should handle concurrent health score calculations', async () => {
      const concurrentRequests = 10;
      const promises = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          supabase.rpc('calculate_health_score', {
            supplier_id: testSuppliers[i].supplierId
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const avgTimePerRequest = duration / concurrentRequests;
      
      results.forEach(({ error }) => {
        expect(error).toBeNull();
      });
      
      expect(avgTimePerRequest).toBeLessThan(PERFORMANCE_THRESHOLDS.healthScoreCalculation * 2);
      
      console.log(`Concurrent health score calculations: ${avgTimePerRequest.toFixed(2)}ms average`);
    });
  });

  describe('Dashboard Load Performance', () => {
    test('should load initial dashboard data within threshold', async () => {
      const startTime = performance.now();
      
      // Simulate dashboard load with multiple queries
      const [statsResult, recentResult, atRiskResult, metricsResult] = await Promise.all([
        // Overall statistics
        supabase
          .from('customer_success_stats')
          .select('*')
          .single(),
        
        // Recent activities
        supabase
          .from('supplier_activities')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        
        // At-risk suppliers
        supabase
          .from('suppliers')
          .select('*')
          .in('risk_level', ['high', 'critical'])
          .limit(10),
        
        // Key metrics
        supabase
          .rpc('get_dashboard_metrics')
      ]);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(statsResult.error).toBeNull();
      expect(recentResult.error).toBeNull();
      expect(atRiskResult.error).toBeNull();
      expect(metricsResult.error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.dashboardLoad);
      
      console.log(`Dashboard initial load: ${duration.toFixed(2)}ms`);
    });
    
    test('should handle dashboard refresh efficiently', async () => {
      const refreshCount = 5;
      const durations: number[] = [];
      
      for (let i = 0; i < refreshCount; i++) {
        const startTime = performance.now();
        
        await Promise.all([
          supabase.from('customer_success_stats').select('*').single(),
          supabase.from('supplier_activities').select('*').limit(20)
        ]);
        
        const endTime = performance.now();
        durations.push(endTime - startTime);
        
        // Small delay between refreshes
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / refreshCount;
      
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.dashboardLoad / 2);
      
      console.log(`Dashboard refresh average: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Aggregation Query Performance', () => {
    test('should perform risk level aggregation efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('aggregate_by_risk_level');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregationQuery);
      
      console.log(`Risk level aggregation: ${duration.toFixed(2)}ms`);
    });
    
    test('should calculate time-based metrics efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('calculate_time_series_metrics', {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          interval: 'day'
        });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregationQuery * 1.5);
      
      console.log(`Time series calculation: ${duration.toFixed(2)}ms`);
    });
    
    test('should perform multi-dimensional aggregation', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .rpc('aggregate_by_category_and_subscription');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.aggregationQuery * 2);
      
      console.log(`Multi-dimensional aggregation: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Paginated Query Performance', () => {
    test('should handle pagination efficiently', async () => {
      const pageSize = 50;
      const pageCount = 5;
      const durations: number[] = [];
      
      for (let page = 0; page < pageCount; page++) {
        const startTime = performance.now();
        
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        const endTime = performance.now();
        durations.push(endTime - startTime);
        
        expect(error).toBeNull();
        expect(data).toHaveLength(pageSize);
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / pageCount;
      
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.paginatedQuery);
      
      console.log(`Paginated query average: ${avgDuration.toFixed(2)}ms`);
    });
    
    test('should optimize cursor-based pagination', async () => {
      let lastId = null;
      const pageSize = 100;
      const durations: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const startTime = performance.now();
        
        let query = supabase
          .from('suppliers')
          .select('*')
          .order('id')
          .limit(pageSize);
        
        if (lastId) {
          query = query.gt('id', lastId);
        }
        
        const { data, error } = await query;
        
        const endTime = performance.now();
        durations.push(endTime - startTime);
        
        expect(error).toBeNull();
        
        if (data && data.length > 0) {
          lastId = data[data.length - 1].id;
        }
      }
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      
      expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.paginatedQuery);
      
      console.log(`Cursor-based pagination average: ${avgDuration.toFixed(2)}ms`);
    });
  });

  describe('Complex Filter Performance', () => {
    test('should handle multi-condition filters efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('subscription', 'professional')
        .in('risk_level', ['medium', 'high'])
        .gte('health_score', 40)
        .lte('health_score', 70)
        .gt('login_frequency', 2)
        .order('health_score', { ascending: false });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexFilter);
      
      console.log(`Complex filter query: ${duration.toFixed(2)}ms`);
    });
    
    test('should perform text search efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .textSearch('name', 'wedding');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexFilter);
      
      console.log(`Text search query: ${duration.toFixed(2)}ms`);
    });
    
    test('should handle JOIN queries efficiently', async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          health_scores!inner(
            overall_score,
            calculated_at
          ),
          interventions(
            type,
            status,
            created_at
          )
        `)
        .eq('health_scores.overall_score', 'low')
        .limit(50);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexFilter * 1.5);
      
      console.log(`JOIN query: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operation Performance', () => {
    test('should handle bulk updates efficiently', async () => {
      const updateCount = 100;
      const supplierIds = testSuppliers.slice(0, updateCount).map(s => s.supplierId);
      
      const startTime = performance.now();
      
      const { error } = await supabase
        .from('suppliers')
        .update({ last_checked: new Date().toISOString() })
        .in('id', supplierIds);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkUpdate);
      
      console.log(`Bulk update (${updateCount} records): ${duration.toFixed(2)}ms`);
    });
    
    test('should handle bulk inserts efficiently', async () => {
      const insertData = generateBulkSuppliers(200, 'healthy');
      
      const startTime = performance.now();
      
      const { error } = await supabase
        .from('suppliers')
        .insert(insertData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.bulkUpdate);
      
      console.log(`Bulk insert (200 records): ${duration.toFixed(2)}ms`);
      
      // Clean up
      await supabase
        .from('suppliers')
        .delete()
        .in('id', insertData.map(s => s.supplierId));
    });
  });

  describe('Real-time Subscription Performance', () => {
    test('should establish real-time connection quickly', async () => {
      const startTime = performance.now();
      
      const subscription = supabase
        .channel('dashboard-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        }, () => {})
        .subscribe();
      
      // Wait for subscription to be ready
      await new Promise(resolve => {
        subscription.on('system', { event: 'connected' }, resolve);
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // 1 second for connection
      
      console.log(`Real-time subscription setup: ${duration.toFixed(2)}ms`);
      
      // Clean up
      await subscription.unsubscribe();
    });
    
    test('should handle real-time updates with low latency', async () => {
      const latencies: number[] = [];
      
      const subscription = supabase
        .channel('latency-test')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'suppliers',
          filter: `id=eq.${testSuppliers[0].supplierId}`
        }, (payload) => {
          const latency = Date.now() - payload.commit_timestamp;
          latencies.push(latency);
        })
        .subscribe();
      
      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Perform updates
      for (let i = 0; i < 5; i++) {
        await supabase
          .from('suppliers')
          .update({ health_score: Math.random() * 100 })
          .eq('id', testSuppliers[0].supplierId);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Wait for updates to be received
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      expect(avgLatency).toBeLessThan(PERFORMANCE_THRESHOLDS.realTimeUpdate);
      
      console.log(`Real-time update latency: ${avgLatency.toFixed(2)}ms average`);
      
      await subscription.unsubscribe();
    });
  });

  describe('Cache Performance', () => {
    test('should leverage query caching effectively', async () => {
      const query = {
        table: 'suppliers',
        filters: { risk_level: 'high' },
        limit: 50
      };
      
      // First query (cache miss)
      const startTime1 = performance.now();
      const result1 = await supabase
        .from(query.table)
        .select('*')
        .eq('risk_level', query.filters.risk_level)
        .limit(query.limit);
      const duration1 = performance.now() - startTime1;
      
      // Second query (cache hit)
      const startTime2 = performance.now();
      const result2 = await supabase
        .from(query.table)
        .select('*')
        .eq('risk_level', query.filters.risk_level)
        .limit(query.limit);
      const duration2 = performance.now() - startTime2;
      
      expect(result1.error).toBeNull();
      expect(result2.error).toBeNull();
      expect(duration2).toBeLessThan(duration1 * 0.5); // Cache should be at least 50% faster
      
      console.log(`Cache miss: ${duration1.toFixed(2)}ms, Cache hit: ${duration2.toFixed(2)}ms`);
    });
  });

  describe('Query Optimization', () => {
    test('should use indexes effectively', async () => {
      // Query using indexed columns
      const startTimeIndexed = performance.now();
      const indexedResult = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', testSuppliers[0].supplierId);
      const durationIndexed = performance.now() - startTimeIndexed;
      
      // Query using non-indexed columns (simulated)
      const startTimeNonIndexed = performance.now();
      const nonIndexedResult = await supabase
        .from('suppliers')
        .select('*')
        .ilike('name', '%specific%');
      const durationNonIndexed = performance.now() - startTimeNonIndexed;
      
      expect(indexedResult.error).toBeNull();
      expect(nonIndexedResult.error).toBeNull();
      expect(durationIndexed).toBeLessThan(50); // Indexed queries should be very fast
      
      console.log(`Indexed query: ${durationIndexed.toFixed(2)}ms, Non-indexed query: ${durationNonIndexed.toFixed(2)}ms`);
    });
    
    test('should optimize query plan for complex queries', async () => {
      const startTime = performance.now();
      
      // Complex query with multiple conditions
      const { data, error } = await supabase.rpc('explain_analyze_query', {
        query_text: `
          SELECT s.*, h.overall_score, COUNT(i.id) as intervention_count
          FROM suppliers s
          LEFT JOIN health_scores h ON s.id = h.supplier_id
          LEFT JOIN interventions i ON s.id = i.supplier_id
          WHERE s.risk_level IN ('high', 'critical')
          AND h.calculated_at > NOW() - INTERVAL '7 days'
          GROUP BY s.id, h.overall_score
          ORDER BY h.overall_score DESC
          LIMIT 20
        `
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.complexFilter);
      
      console.log(`Complex optimized query: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Load Testing', () => {
    test('should handle high concurrent load', async () => {
      const concurrentUsers = 50;
      const requestsPerUser = 10;
      const results: { duration: number; success: boolean }[] = [];
      
      const userRequests = async () => {
        const promises = [];
        
        for (let i = 0; i < requestsPerUser; i++) {
          const requestType = Math.floor(Math.random() * 4);
          
          switch (requestType) {
            case 0:
              promises.push(supabase.from('suppliers').select('*').limit(10));
              break;
            case 1:
              promises.push(supabase.rpc('calculate_health_score', {
                supplier_id: testSuppliers[Math.floor(Math.random() * testSuppliers.length)].supplierId
              }));
              break;
            case 2:
              promises.push(supabase.from('customer_success_stats').select('*').single());
              break;
            case 3:
              promises.push(supabase.from('suppliers').select('*').eq('risk_level', 'high'));
              break;
          }
        }
        
        const startTime = performance.now();
        const responses = await Promise.all(promises);
        const duration = performance.now() - startTime;
        
        const success = responses.every(r => !r.error);
        
        return { duration, success };
      };
      
      const startTime = performance.now();
      
      const userPromises = [];
      for (let i = 0; i < concurrentUsers; i++) {
        userPromises.push(userRequests());
      }
      
      const userResults = await Promise.all(userPromises);
      
      const totalDuration = performance.now() - startTime;
      const avgUserDuration = userResults.reduce((sum, r) => sum + r.duration, 0) / concurrentUsers;
      const successRate = (userResults.filter(r => r.success).length / concurrentUsers) * 100;
      
      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(avgUserDuration).toBeLessThan(5000); // 5 seconds per user
      
      console.log(`Load test - ${concurrentUsers} users, ${requestsPerUser} requests each:`);
      console.log(`  Total duration: ${totalDuration.toFixed(2)}ms`);
      console.log(`  Average user duration: ${avgUserDuration.toFixed(2)}ms`);
      console.log(`  Success rate: ${successRate.toFixed(2)}%`);
    });
  });
});

// Helper function to generate performance report
export function generatePerformanceReport(results: any) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      avgDuration: 0
    },
    details: results,
    recommendations: []
  };
  
  // Analyze results and generate recommendations
  if (report.summary.avgDuration > 1000) {
    report.recommendations.push('Consider implementing query result caching');
  }
  
  if (results.bulkOperations?.avgDuration > 3000) {
    report.recommendations.push('Optimize bulk operations with batch processing');
  }
  
  if (results.realTime?.latency > 100) {
    report.recommendations.push('Review real-time subscription configuration');
  }
  
  return report;
}