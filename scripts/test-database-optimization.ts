#!/usr/bin/env tsx
/**
 * TEAM D - DATABASE OPTIMIZATION TESTING SUITE
 * =============================================
 * Comprehensive testing for database indexes optimization
 * Tests migration success, index effectiveness, and performance validation
 * Created: 2025-01-21
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

// Initialize Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  testName: string;
  category: string;
  passed: boolean;
  duration: number;
  details: any;
  error?: string;
}

interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  totalDuration: number;
}

class DatabaseOptimizationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Database Optimization Test Suite');
    console.log('=' .repeat(60));

    const testSuites = [
      await this.testMigrationIntegrity(),
      await this.testIndexExistence(),
      await this.testIndexEffectiveness(),
      await this.testQueryPerformance(),
      await this.testJourneyQueries(),
      await this.testAnalyticsQueries(),
      await this.testMonitoringSystem(),
      await this.testPerformanceValidation()
    ];

    this.generateSummaryReport(testSuites);
  }

  async testMigrationIntegrity(): Promise<TestSuite> {
    console.log('\n📋 Testing Migration Integrity...');
    const suite: TestSuite = {
      name: 'Migration Integrity',
      description: 'Verify all optimization migrations were applied successfully',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Verify migration log entries
    const migrationTest = await this.runTest(
      'migration_log_verification',
      'migration',
      async () => {
        const { data, error } = await supabaseService
          .from('migration_log')
          .select('*')
          .in('version', ['016', '017', '018'])
          .order('applied_at', { ascending: false });

        if (error) throw error;
        
        const requiredMigrations = ['016', '017', '018'];
        const appliedMigrations = data.map(m => m.version);
        const missingMigrations = requiredMigrations.filter(v => !appliedMigrations.includes(v));

        return {
          appliedMigrations: appliedMigrations.length,
          requiredMigrations: requiredMigrations.length,
          missingMigrations,
          success: missingMigrations.length === 0
        };
      }
    );
    suite.tests.push(migrationTest);

    // Test 2: Verify system configuration entries
    const configTest = await this.runTest(
      'system_config_verification',
      'migration',
      async () => {
        const { data, error } = await supabaseService
          .from('system_config')
          .select('key, value')
          .like('key', '%performance%')
          .or('key.like.%journey%,key.like.%index%');

        if (error) throw error;

        const requiredConfigs = [
          'performance.target_query_time_ms',
          'performance.auto_optimization_enabled',
          'journey.max_execution_time_ms',
          'index_monitoring.collection_interval'
        ];

        const existingConfigs = data.map(c => c.key);
        const missingConfigs = requiredConfigs.filter(k => !existingConfigs.includes(k));

        return {
          existingConfigs: existingConfigs.length,
          requiredConfigs: requiredConfigs.length,
          missingConfigs,
          success: missingConfigs.length === 0
        };
      }
    );
    suite.tests.push(configTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testIndexExistence(): Promise<TestSuite> {
    console.log('\n🗂️  Testing Index Existence...');
    const suite: TestSuite = {
      name: 'Index Existence',
      description: 'Verify all required indexes were created',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Verify journey indexes
    const journeyIndexTest = await this.runTest(
      'journey_indexes_verification',
      'indexes',
      async () => {
        const { data, error } = await supabaseService.rpc('sql', {
          query: `
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND (indexname LIKE '%journey%' OR tablename LIKE 'journey%')
            ORDER BY tablename, indexname;
          `
        });

        if (error) throw error;

        const expectedIndexes = [
          'idx_journey_instances_composite_performance',
          'idx_journey_instances_execution_state',
          'idx_journey_instances_analytics',
          'idx_node_executions_performance_composite',
          'idx_journey_events_processing_pipeline'
        ];

        const existingIndexes = data.map((idx: any) => idx.indexname);
        const missingIndexes = expectedIndexes.filter(idx => !existingIndexes.includes(idx));

        return {
          totalIndexes: existingIndexes.length,
          expectedIndexes: expectedIndexes.length,
          missingIndexes,
          success: missingIndexes.length === 0
        };
      }
    );
    suite.tests.push(journeyIndexTest);

    // Test 2: Verify materialized views
    const materializedViewTest = await this.runTest(
      'materialized_views_verification',
      'indexes',
      async () => {
        const { data, error } = await supabaseService.rpc('sql', {
          query: `
            SELECT matviewname 
            FROM pg_matviews 
            WHERE schemaname = 'public'
            ORDER BY matviewname;
          `
        });

        if (error) throw error;

        const expectedViews = [
          'mv_journey_execution_analytics',
          'mv_journey_node_performance',
          'mv_dashboard_metrics',
          'mv_vendor_performance'
        ];

        const existingViews = data.map((view: any) => view.matviewname);
        const missingViews = expectedViews.filter(view => !existingViews.includes(view));

        return {
          totalViews: existingViews.length,
          expectedViews: expectedViews.length,
          missingViews,
          success: missingViews.length === 0
        };
      }
    );
    suite.tests.push(materializedViewTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testIndexEffectiveness(): Promise<TestSuite> {
    console.log('\n📊 Testing Index Effectiveness...');
    const suite: TestSuite = {
      name: 'Index Effectiveness',
      description: 'Verify indexes are being used effectively',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Index usage statistics
    const indexUsageTest = await this.runTest(
      'index_usage_statistics',
      'effectiveness',
      async () => {
        const { data, error } = await supabaseService
          .from('v_index_usage_realtime')
          .select('*')
          .order('scan_count', { ascending: false });

        if (error) throw error;

        const totalIndexes = data.length;
        const usedIndexes = data.filter((idx: any) => idx.scan_count > 0).length;
        const highEfficiencyIndexes = data.filter((idx: any) => 
          idx.efficiency_percent > 80 && idx.scan_count > 10
        ).length;

        return {
          totalIndexes,
          usedIndexes,
          highEfficiencyIndexes,
          usageRatio: totalIndexes > 0 ? (usedIndexes / totalIndexes * 100).toFixed(2) : 0,
          success: usageRatio > 70 // At least 70% of indexes should be used
        };
      }
    );
    suite.tests.push(indexUsageTest);

    // Test 2: Table scan analysis
    const tableScanTest = await this.runTest(
      'table_scan_analysis',
      'effectiveness',
      async () => {
        const { data, error } = await supabaseService
          .from('v_table_scan_analysis')
          .select('*')
          .order('live_tuples', { ascending: false });

        if (error) throw error;

        const tablesNeedingIndexes = data.filter((table: any) => 
          table.health_status === 'needs_indexes'
        ).length;
        
        const tablesNeedingVacuum = data.filter((table: any) => 
          table.health_status === 'needs_vacuum'
        ).length;

        const healthyTables = data.filter((table: any) => 
          table.health_status === 'healthy'
        ).length;

        return {
          totalTables: data.length,
          healthyTables,
          tablesNeedingIndexes,
          tablesNeedingVacuum,
          healthRatio: data.length > 0 ? (healthyTables / data.length * 100).toFixed(2) : 0,
          success: tablesNeedingIndexes === 0 && healthyTables > data.length * 0.8
        };
      }
    );
    suite.tests.push(tableScanTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testQueryPerformance(): Promise<TestSuite> {
    console.log('\n⚡ Testing Query Performance...');
    const suite: TestSuite = {
      name: 'Query Performance',
      description: 'Verify query execution times meet target performance',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Run performance test suite
    const performanceTest = await this.runTest(
      'performance_test_suite',
      'performance',
      async () => {
        const { data, error } = await supabaseService.rpc('run_all_performance_tests');

        if (error) throw error;

        return {
          totalTests: data.total_tests,
          passedTests: data.passed_tests,
          failedTests: data.failed_tests,
          successRate: data.success_rate_percent,
          avgPerformance: data.average_performance_ms,
          success: data.success_rate_percent >= 80 && data.average_performance_ms <= 50
        };
      }
    );
    suite.tests.push(performanceTest);

    // Test 2: Journey query performance
    const journeyPerformanceTest = await this.runTest(
      'journey_query_performance',
      'performance',
      async () => {
        const { data, error } = await supabaseService.rpc('run_all_performance_tests', {
          p_test_category: 'journey'
        });

        if (error) throw error;

        return {
          totalJourneyTests: data.total_tests,
          passedJourneyTests: data.passed_tests,
          journeySuccessRate: data.success_rate_percent,
          avgJourneyPerformance: data.average_performance_ms,
          success: data.success_rate_percent >= 85 && data.average_performance_ms <= 25
        };
      }
    );
    suite.tests.push(journeyPerformanceTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testJourneyQueries(): Promise<TestSuite> {
    console.log('\n🛤️  Testing Journey Queries...');
    const suite: TestSuite = {
      name: 'Journey Queries',
      description: 'Test specific journey-related query patterns',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Journey analytics query
    const analyticsTest = await this.runTest(
      'journey_analytics_query',
      'journey',
      async () => {
        const startTime = Date.now();
        const { data, error } = await supabaseService
          .from('mv_journey_execution_analytics')
          .select('*')
          .limit(20);

        const duration = Date.now() - startTime;

        if (error) throw error;

        return {
          rowsReturned: data.length,
          executionTime: duration,
          success: duration <= 50 // Target: sub-50ms for materialized view
        };
      }
    );
    suite.tests.push(analyticsTest);

    // Test 2: Journey performance dashboard
    const dashboardTest = await this.runTest(
      'journey_performance_dashboard',
      'journey',
      async () => {
        const startTime = Date.now();
        const { data, error } = await supabaseService
          .from('v_journey_performance_dashboard')
          .select('*')
          .single();

        const duration = Date.now() - startTime;

        if (error) throw error;

        return {
          dataPoints: Object.keys(data).length,
          executionTime: duration,
          healthScore: data.performance_health_score,
          success: duration <= 100 && data.performance_health_score >= 70
        };
      }
    );
    suite.tests.push(dashboardTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testAnalyticsQueries(): Promise<TestSuite> {
    console.log('\n📈 Testing Analytics Queries...');
    const suite: TestSuite = {
      name: 'Analytics Queries',
      description: 'Test analytics and reporting query performance',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Dashboard metrics view
    const dashboardMetricsTest = await this.runTest(
      'dashboard_metrics_query',
      'analytics',
      async () => {
        const startTime = Date.now();
        const { data, error } = await supabaseService
          .from('mv_dashboard_metrics')
          .select('*')
          .limit(10);

        const duration = Date.now() - startTime;

        if (error) throw error;

        return {
          organizationsAnalyzed: data.length,
          executionTime: duration,
          avgQueryTime: data.length > 0 ? 
            data.reduce((sum: number, org: any) => sum + (org.avg_query_time_ms || 0), 0) / data.length : 0,
          success: duration <= 100
        };
      }
    );
    suite.tests.push(dashboardMetricsTest);

    // Test 2: Performance monitoring dashboard
    const performanceMonitoringTest = await this.runTest(
      'performance_monitoring_dashboard',
      'analytics',
      async () => {
        const startTime = Date.now();
        const { data, error } = await supabaseService
          .from('v_performance_monitoring_dashboard')
          .select('*')
          .single();

        const duration = Date.now() - startTime;

        if (error) throw error;

        return {
          executionTime: duration,
          systemHealthScore: data.system_performance_health_score,
          criticalIssues: data.critical_slow_queries,
          success: duration <= 75 && data.system_performance_health_score >= 80
        };
      }
    );
    suite.tests.push(performanceMonitoringTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testMonitoringSystem(): Promise<TestSuite> {
    console.log('\n🔍 Testing Monitoring System...');
    const suite: TestSuite = {
      name: 'Monitoring System',
      description: 'Test index monitoring and analysis functions',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Index monitoring cycle
    const monitoringCycleTest = await this.runTest(
      'index_monitoring_cycle',
      'monitoring',
      async () => {
        const { data, error } = await supabaseService.rpc('run_index_monitoring_cycle');

        if (error) throw error;

        return {
          statsCollected: data.stats_collected,
          recommendationsCreated: data.recommendations_created,
          status: data.status,
          success: data.status === 'success' && data.stats_collected > 0
        };
      }
    );
    suite.tests.push(monitoringCycleTest);

    // Test 2: Index health report
    const healthReportTest = await this.runTest(
      'index_health_report',
      'monitoring',
      async () => {
        const { data, error } = await supabaseService.rpc('generate_index_health_report');

        if (error) throw error;

        const criticalIssues = data.filter((item: any) => item.status === 'critical').length;
        const goodMetrics = data.filter((item: any) => item.status === 'good').length;

        return {
          totalMetrics: data.length,
          criticalIssues,
          goodMetrics,
          healthRatio: data.length > 0 ? (goodMetrics / data.length * 100).toFixed(2) : 0,
          success: criticalIssues === 0 && goodMetrics > data.length * 0.7
        };
      }
    );
    suite.tests.push(healthReportTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  async testPerformanceValidation(): Promise<TestSuite> {
    console.log('\n✅ Testing Performance Validation...');
    const suite: TestSuite = {
      name: 'Performance Validation',
      description: 'Test performance validation and reporting system',
      tests: [],
      passed: 0,
      failed: 0,
      totalDuration: 0
    };

    // Test 1: Performance report generation
    const reportTest = await this.runTest(
      'performance_report_generation',
      'validation',
      async () => {
        const { data, error } = await supabaseService.rpc('generate_performance_report', {
          p_days_back: 1
        });

        if (error) throw error;

        const passingTests = data.filter((test: any) => test.status === 'passing').length;
        const failingTests = data.filter((test: any) => test.status === 'failing').length;
        const warningTests = data.filter((test: any) => test.status === 'warning').length;

        return {
          totalTests: data.length,
          passingTests,
          failingTests,
          warningTests,
          passingRatio: data.length > 0 ? (passingTests / data.length * 100).toFixed(2) : 0,
          success: failingTests === 0 && passingTests > data.length * 0.8
        };
      }
    );
    suite.tests.push(reportTest);

    // Test 2: Index effectiveness validation
    const effectivenessTest = await this.runTest(
      'index_effectiveness_validation',
      'validation',
      async () => {
        const { data, error } = await supabaseService.rpc('validate_index_effectiveness');

        if (error) throw error;

        const highEffectivenessIndexes = data.filter((idx: any) => idx.effectiveness_score >= 80).length;
        const lowEffectivenessIndexes = data.filter((idx: any) => idx.effectiveness_score < 50).length;

        return {
          totalIndexesAnalyzed: data.length,
          highEffectivenessIndexes,
          lowEffectivenessIndexes,
          avgEffectivenessScore: data.length > 0 ? 
            data.reduce((sum: number, idx: any) => sum + idx.effectiveness_score, 0) / data.length : 0,
          success: lowEffectivenessIndexes === 0 && highEffectivenessIndexes > data.length * 0.6
        };
      }
    );
    suite.tests.push(effectivenessTest);

    suite.passed = suite.tests.filter(t => t.passed).length;
    suite.failed = suite.tests.filter(t => !t.passed).length;
    suite.totalDuration = suite.tests.reduce((sum, t) => sum + t.duration, 0);

    return suite;
  }

  private async runTest(
    testName: string,
    category: string,
    testFn: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log(`  ⏳ Running ${testName}...`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        testName,
        category,
        passed: result.success,
        duration,
        details: result
      };

      if (testResult.passed) {
        console.log(`  ✅ ${testName} passed (${duration}ms)`);
      } else {
        console.log(`  ❌ ${testName} failed (${duration}ms)`);
        console.log(`     Details:`, result);
      }

      return testResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  💥 ${testName} crashed (${duration}ms)`);
      console.log(`     Error:`, error);

      return {
        testName,
        category,
        passed: false,
        duration,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private generateSummaryReport(testSuites: TestSuite[]): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE OPTIMIZATION TEST SUMMARY');
    console.log('='.repeat(60));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    testSuites.forEach(suite => {
      totalTests += suite.tests.length;
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalDuration += suite.totalDuration;

      console.log(`\n${suite.name}:`);
      console.log(`  Tests: ${suite.tests.length} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
      console.log(`  Duration: ${suite.totalDuration}ms`);
      
      if (suite.failed > 0) {
        const failedTests = suite.tests.filter(t => !t.passed);
        failedTests.forEach(test => {
          console.log(`  ❌ ${test.testName}: ${test.error || 'Test conditions not met'}`);
        });
      }
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`OVERALL RESULTS:`);
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed} (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
    console.log(`  Failed: ${totalFailed} (${((totalFailed/totalTests)*100).toFixed(1)}%)`);
    console.log(`  Total Duration: ${totalDuration}ms`);
    console.log(`  Average Test Duration: ${(totalDuration/totalTests).toFixed(1)}ms`);

    const successRate = (totalPassed / totalTests) * 100;
    if (successRate >= 90) {
      console.log('\n🎉 EXCELLENT! Database optimization is performing exceptionally well.');
    } else if (successRate >= 80) {
      console.log('\n✅ GOOD! Database optimization is performing well with minor issues.');
    } else if (successRate >= 70) {
      console.log('\n⚠️  WARNING! Database optimization has some issues that need attention.');
    } else {
      console.log('\n🚨 CRITICAL! Database optimization has significant issues requiring immediate attention.');
    }

    console.log('\n='.repeat(60));
  }
}

// Main execution
async function main() {
  try {
    const tester = new DatabaseOptimizationTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { DatabaseOptimizationTester };