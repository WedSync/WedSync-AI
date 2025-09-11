#!/usr/bin/env tsx

/**
 * RLS Performance Testing Script
 * Verifies that Row Level Security policies don't significantly impact performance
 * 
 * USAGE: npm run test:security:performance
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

interface PerformanceTestResult {
  testName: string;
  operation: string;
  withRLS: boolean;
  recordCount: number;
  averageTime: number;
  medianTime: number;
  minTime: number;
  maxTime: number;
  opsPerSecond: number;
  passed: boolean;
  threshold: number;
  actualOverhead: number;
}

interface PerformanceReport {
  timestamp: Date;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  warningTests: number;
  maxOverheadThreshold: number;
  results: PerformanceTestResult[];
  summary: {
    averageOverhead: number;
    maxOverhead: number;
    problematicQueries: string[];
  };
}

class RLSPerformanceTester {
  private supabase: any;
  private adminSupabase: any;
  private testOrgId: string;
  private testUserId: string;
  private results: PerformanceTestResult[] = [];
  
  // Performance thresholds (in milliseconds)
  private readonly THRESHOLDS = {
    SELECT_SIMPLE: 50,    // Simple SELECT queries
    SELECT_COMPLEX: 200,  // Complex SELECT with JOINs
    INSERT: 100,          // INSERT operations
    UPDATE: 150,          // UPDATE operations
    DELETE: 100           // DELETE operations
  };

  private readonly MAX_OVERHEAD_PERCENTAGE = 30; // 30% max overhead from RLS

  constructor() {
    // Regular client (with RLS)
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Admin client (can bypass RLS for comparison)
    this.adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.testOrgId = randomUUID();
    this.testUserId = randomUUID();
  }

  /**
   * Run complete RLS performance test suite
   */
  async runFullSuite(): Promise<PerformanceReport> {
    console.log('🚀 Starting RLS Performance Test Suite...\n');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run performance tests
      await this.testSelectPerformance();
      await this.testInsertPerformance();
      await this.testUpdatePerformance();
      await this.testDeletePerformance();
      await this.testComplexQueryPerformance();

      // Generate report
      const report = this.generateReport();

      // Cleanup
      await this.cleanupTestEnvironment();

      return report;

    } catch (error) {
      console.error('❌ Performance test suite failed:', error);
      await this.cleanupTestEnvironment();
      throw error;
    }
  }

  /**
   * Setup test environment with data
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🏗️ Setting up test environment...');

    // Create test organization
    const { error: orgError } = await this.adminSupabase
      .from('organizations')
      .insert({
        id: this.testOrgId,
        name: 'Performance Test Org',
        slug: `perf-test-${Date.now()}`,
        subscription_tier: 'PREMIUM'
      });

    if (orgError) throw orgError;

    // Create test user profile
    const { error: userError } = await this.adminSupabase
      .from('user_profiles')
      .insert({
        user_id: this.testUserId,
        organization_id: this.testOrgId,
        email: 'perftest@example.com',
        role: 'ADMIN',
        first_name: 'Performance',
        last_name: 'Test'
      });

    if (userError) throw userError;

    // Create test data for performance testing
    await this.createTestData();

    console.log('✅ Test environment setup complete');
  }

  /**
   * Create test data for performance testing
   */
  private async createTestData(): Promise<void> {
    console.log('📊 Creating test data...');

    const testData = {
      clients: [],
      forms: [],
      suppliers: []
    };

    // Generate test clients
    for (let i = 0; i < 100; i++) {
      testData.clients.push({
        id: randomUUID(),
        organization_id: this.testOrgId,
        first_name: `TestClient${i}`,
        last_name: 'Performance',
        email: `client${i}@perftest.com`,
        phone: `555-000-${String(i).padStart(4, '0')}`,
        status: 'ACTIVE',
        wedding_date: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }

    // Generate test forms
    for (let i = 0; i < 50; i++) {
      testData.forms.push({
        id: randomUUID(),
        organization_id: this.testOrgId,
        title: `Performance Test Form ${i}`,
        description: `Test form for performance testing ${i}`,
        schema: { fields: [] },
        is_published: i % 2 === 0
      });
    }

    // Generate test suppliers
    for (let i = 0; i < 30; i++) {
      testData.suppliers.push({
        id: randomUUID(),
        organization_id: this.testOrgId,
        business_name: `Test Supplier ${i}`,
        contact_email: `supplier${i}@perftest.com`,
        is_published: true,
        category: 'PHOTOGRAPHY'
      });
    }

    // Insert test data in batches
    const { error: clientsError } = await this.adminSupabase
      .from('clients')
      .insert(testData.clients);

    const { error: formsError } = await this.adminSupabase
      .from('forms')
      .insert(testData.forms);

    const { error: suppliersError } = await this.adminSupabase
      .from('suppliers')
      .insert(testData.suppliers);

    if (clientsError || formsError || suppliersError) {
      throw new Error(`Test data creation failed: ${clientsError || formsError || suppliersError}`);
    }

    console.log('✅ Test data created successfully');
  }

  /**
   * Test SELECT query performance with and without RLS
   */
  private async testSelectPerformance(): Promise<void> {
    console.log('🔍 Testing SELECT performance...');

    // Test simple SELECT
    await this.compareQueryPerformance(
      'Simple SELECT - Clients',
      'SELECT',
      () => this.supabase.from('clients').select('*').eq('organization_id', this.testOrgId),
      () => this.adminSupabase.from('clients').select('*').eq('organization_id', this.testOrgId),
      this.THRESHOLDS.SELECT_SIMPLE
    );

    // Test SELECT with filters
    await this.compareQueryPerformance(
      'Filtered SELECT - Active Clients',
      'SELECT',
      () => this.supabase.from('clients').select('*').eq('organization_id', this.testOrgId).eq('status', 'ACTIVE'),
      () => this.adminSupabase.from('clients').select('*').eq('organization_id', this.testOrgId).eq('status', 'ACTIVE'),
      this.THRESHOLDS.SELECT_SIMPLE
    );

    // Test SELECT with ordering and limiting
    await this.compareQueryPerformance(
      'Ordered SELECT - Recent Clients',
      'SELECT',
      () => this.supabase.from('clients').select('*').eq('organization_id', this.testOrgId).order('created_at', { ascending: false }).limit(20),
      () => this.adminSupabase.from('clients').select('*').eq('organization_id', this.testOrgId).order('created_at', { ascending: false }).limit(20),
      this.THRESHOLDS.SELECT_SIMPLE
    );
  }

  /**
   * Test INSERT performance with RLS
   */
  private async testInsertPerformance(): Promise<void> {
    console.log('📝 Testing INSERT performance...');

    // Test single INSERT
    await this.compareQueryPerformance(
      'Single INSERT - Client',
      'INSERT',
      () => this.supabase.from('clients').insert({
        organization_id: this.testOrgId,
        first_name: 'Insert',
        last_name: 'Test',
        email: `inserttest-${Date.now()}@example.com`
      }),
      () => this.adminSupabase.from('clients').insert({
        organization_id: this.testOrgId,
        first_name: 'Insert',
        last_name: 'Test',
        email: `inserttest-admin-${Date.now()}@example.com`
      }),
      this.THRESHOLDS.INSERT
    );

    // Test batch INSERT
    const batchData = Array.from({ length: 10 }, (_, i) => ({
      organization_id: this.testOrgId,
      first_name: 'Batch',
      last_name: `Test${i}`,
      email: `batchtest${i}-${Date.now()}@example.com`
    }));

    await this.compareQueryPerformance(
      'Batch INSERT - 10 Clients',
      'INSERT',
      () => this.supabase.from('clients').insert(batchData),
      () => this.adminSupabase.from('clients').insert(batchData.map(item => ({ ...item, email: item.email.replace('batchtest', 'batchtest-admin') }))),
      this.THRESHOLDS.INSERT * 2 // Allow more time for batch operations
    );
  }

  /**
   * Test UPDATE performance with RLS
   */
  private async testUpdatePerformance(): Promise<void> {
    console.log('✏️ Testing UPDATE performance...');

    // Get a test client ID
    const { data: testClients } = await this.adminSupabase
      .from('clients')
      .select('id')
      .eq('organization_id', this.testOrgId)
      .limit(5);

    if (!testClients || testClients.length === 0) {
      console.warn('No test clients found for UPDATE testing');
      return;
    }

    const clientId = testClients[0].id;

    // Test single UPDATE
    await this.compareQueryPerformance(
      'Single UPDATE - Client',
      'UPDATE',
      () => this.supabase.from('clients').update({ 
        last_name: `Updated-${Date.now()}` 
      }).eq('id', clientId),
      () => this.adminSupabase.from('clients').update({ 
        last_name: `Updated-Admin-${Date.now()}` 
      }).eq('id', clientId),
      this.THRESHOLDS.UPDATE
    );

    // Test batch UPDATE
    const clientIds = testClients.slice(0, 3).map(c => c.id);
    
    await this.compareQueryPerformance(
      'Batch UPDATE - Multiple Clients',
      'UPDATE',
      () => this.supabase.from('clients').update({ 
        notes: `Batch updated ${Date.now()}` 
      }).in('id', clientIds),
      () => this.adminSupabase.from('clients').update({ 
        notes: `Batch updated admin ${Date.now()}` 
      }).in('id', clientIds),
      this.THRESHOLDS.UPDATE
    );
  }

  /**
   * Test DELETE performance with RLS
   */
  private async testDeletePerformance(): Promise<void> {
    console.log('🗑️ Testing DELETE performance...');

    // Create test records for deletion
    const testRecords = Array.from({ length: 5 }, (_, i) => ({
      organization_id: this.testOrgId,
      first_name: 'ToDelete',
      last_name: `Test${i}`,
      email: `delete${i}-${Date.now()}@example.com`
    }));

    const { data: createdRecords } = await this.adminSupabase
      .from('clients')
      .insert(testRecords)
      .select('id');

    if (!createdRecords || createdRecords.length === 0) {
      console.warn('Failed to create test records for DELETE testing');
      return;
    }

    const recordId = createdRecords[0].id;

    // Test single DELETE
    await this.compareQueryPerformance(
      'Single DELETE - Client',
      'DELETE',
      () => this.supabase.from('clients').delete().eq('id', recordId),
      () => this.adminSupabase.from('clients').delete().eq('id', createdRecords[1]?.id),
      this.THRESHOLDS.DELETE
    );

    // Test batch DELETE
    const deleteIds = createdRecords.slice(2).map(r => r.id);
    
    if (deleteIds.length > 0) {
      await this.compareQueryPerformance(
        'Batch DELETE - Multiple Clients',
        'DELETE',
        () => this.supabase.from('clients').delete().in('id', deleteIds.slice(0, Math.floor(deleteIds.length / 2))),
        () => this.adminSupabase.from('clients').delete().in('id', deleteIds.slice(Math.floor(deleteIds.length / 2))),
        this.THRESHOLDS.DELETE
      );
    }
  }

  /**
   * Test complex query performance with JOINs and RLS
   */
  private async testComplexQueryPerformance(): Promise<void> {
    console.log('🔗 Testing complex query performance...');

    // Test complex SELECT with multiple conditions
    await this.compareQueryPerformance(
      'Complex SELECT - Clients with Filters',
      'SELECT',
      () => this.supabase
        .from('clients')
        .select('id, first_name, last_name, email, status, created_at')
        .eq('organization_id', this.testOrgId)
        .eq('status', 'ACTIVE')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
      () => this.adminSupabase
        .from('clients')
        .select('id, first_name, last_name, email, status, created_at')
        .eq('organization_id', this.testOrgId)
        .eq('status', 'ACTIVE')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
      this.THRESHOLDS.SELECT_COMPLEX
    );

    // Test aggregation query
    await this.compareQueryPerformance(
      'Aggregation Query - Count by Status',
      'SELECT',
      () => this.supabase
        .from('clients')
        .select('status', { count: 'exact', head: true })
        .eq('organization_id', this.testOrgId),
      () => this.adminSupabase
        .from('clients')
        .select('status', { count: 'exact', head: true })
        .eq('organization_id', this.testOrgId),
      this.THRESHOLDS.SELECT_COMPLEX
    );
  }

  /**
   * Compare query performance with and without RLS
   */
  private async compareQueryPerformance(
    testName: string,
    operation: string,
    rlsQuery: () => Promise<any>,
    adminQuery: () => Promise<any>,
    threshold: number,
    iterations: number = 10
  ): Promise<void> {
    console.log(`  📊 Running: ${testName}`);

    try {
      // Warm up queries
      await rlsQuery();
      await adminQuery();

      // Test with RLS (regular client)
      const rlsTimes = await this.measureQueryTimes(rlsQuery, iterations);
      
      // Test without RLS (admin client)  
      const adminTimes = await this.measureQueryTimes(adminQuery, iterations);

      // Calculate statistics
      const rlsStats = this.calculateStatistics(rlsTimes);
      const adminStats = this.calculateStatistics(adminTimes);

      // Calculate overhead
      const overhead = ((rlsStats.average - adminStats.average) / adminStats.average) * 100;
      const passed = rlsStats.average <= threshold && overhead <= this.MAX_OVERHEAD_PERCENTAGE;

      // Store results
      this.results.push({
        testName,
        operation,
        withRLS: true,
        recordCount: iterations,
        averageTime: rlsStats.average,
        medianTime: rlsStats.median,
        minTime: rlsStats.min,
        maxTime: rlsStats.max,
        opsPerSecond: 1000 / rlsStats.average,
        passed,
        threshold,
        actualOverhead: overhead
      });

      const status = passed ? '✅' : '❌';
      console.log(`    ${status} RLS: ${rlsStats.average.toFixed(2)}ms avg, Admin: ${adminStats.average.toFixed(2)}ms avg, Overhead: ${overhead.toFixed(1)}%`);

      if (!passed) {
        if (rlsStats.average > threshold) {
          console.log(`    ⚠️  Query exceeds threshold of ${threshold}ms`);
        }
        if (overhead > this.MAX_OVERHEAD_PERCENTAGE) {
          console.log(`    ⚠️  RLS overhead exceeds ${this.MAX_OVERHEAD_PERCENTAGE}% threshold`);
        }
      }

    } catch (error) {
      console.error(`    ❌ Error in ${testName}:`, error);
      
      this.results.push({
        testName,
        operation,
        withRLS: true,
        recordCount: 0,
        averageTime: 0,
        medianTime: 0,
        minTime: 0,
        maxTime: 0,
        opsPerSecond: 0,
        passed: false,
        threshold,
        actualOverhead: 0
      });
    }
  }

  /**
   * Measure query execution times
   */
  private async measureQueryTimes(query: () => Promise<any>, iterations: number): Promise<number[]> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      try {
        await query();
        const end = Date.now();
        times.push(end - start);
      } catch (error) {
        console.warn(`Query iteration ${i + 1} failed:`, error);
        times.push(Number.MAX_SAFE_INTEGER); // Mark as failed
      }
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return times.filter(time => time !== Number.MAX_SAFE_INTEGER);
  }

  /**
   * Calculate performance statistics
   */
  private calculateStatistics(times: number[]): {
    average: number;
    median: number;
    min: number;
    max: number;
  } {
    if (times.length === 0) {
      return { average: 0, median: 0, min: 0, max: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    
    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  /**
   * Generate performance report
   */
  private generateReport(): PerformanceReport {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const warningTests = this.results.filter(r => r.actualOverhead > this.MAX_OVERHEAD_PERCENTAGE * 0.8).length;

    const overheads = this.results.map(r => r.actualOverhead).filter(o => !isNaN(o) && isFinite(o));
    const averageOverhead = overheads.length > 0 ? overheads.reduce((sum, o) => sum + o, 0) / overheads.length : 0;
    const maxOverhead = overheads.length > 0 ? Math.max(...overheads) : 0;

    const problematicQueries = this.results
      .filter(r => !r.passed)
      .map(r => r.testName);

    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (failedTests > 0) {
      overallStatus = 'FAIL';
    } else if (warningTests > 0 || maxOverhead > this.MAX_OVERHEAD_PERCENTAGE * 0.8) {
      overallStatus = 'WARNING';
    }

    return {
      timestamp: new Date(),
      overallStatus,
      totalTests: this.results.length,
      passedTests,
      failedTests,
      warningTests,
      maxOverheadThreshold: this.MAX_OVERHEAD_PERCENTAGE,
      results: this.results,
      summary: {
        averageOverhead,
        maxOverhead,
        problematicQueries
      }
    };
  }

  /**
   * Print performance report
   */
  private printReport(report: PerformanceReport): void {
    console.log('\n📊 RLS Performance Test Report');
    console.log('================================');
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Warnings: ${report.warningTests}`);
    console.log(`Average RLS Overhead: ${report.summary.averageOverhead.toFixed(1)}%`);
    console.log(`Maximum RLS Overhead: ${report.summary.maxOverhead.toFixed(1)}%`);

    if (report.summary.problematicQueries.length > 0) {
      console.log('\n⚠️ Problematic Queries:');
      report.summary.problematicQueries.forEach(query => {
        console.log(`  • ${query}`);
      });
    }

    console.log('\n📈 Detailed Results:');
    console.log('Query'.padEnd(40) + 'Avg Time'.padEnd(12) + 'Threshold'.padEnd(12) + 'Overhead'.padEnd(12) + 'Status');
    console.log('-'.repeat(80));
    
    report.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const overhead = isFinite(result.actualOverhead) ? `${result.actualOverhead.toFixed(1)}%` : 'N/A';
      
      console.log(
        result.testName.padEnd(40) + 
        `${result.averageTime.toFixed(1)}ms`.padEnd(12) + 
        `${result.threshold}ms`.padEnd(12) + 
        overhead.padEnd(12) + 
        status
      );
    });

    if (report.overallStatus === 'PASS') {
      console.log('\n✅ RLS performance is within acceptable limits');
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️ RLS performance has some concerns but is acceptable');
    } else {
      console.log('\n❌ RLS performance issues detected - optimization needed');
    }
  }

  /**
   * Clean up test environment
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');

    try {
      // Delete test organization (cascade will handle related data)
      await this.adminSupabase
        .from('organizations')
        .delete()
        .eq('id', this.testOrgId);

      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.error('⚠️ Cleanup error (non-critical):', error);
    }
  }

  /**
   * Run performance test and return report
   */
  async runPerformanceTest(): Promise<PerformanceReport> {
    const report = await this.runFullSuite();
    
    this.printReport(report);
    
    // Save report to file
    const fs = await import('fs/promises');
    const reportPath = 'rls-performance-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    return report;
  }
}

// Main execution
async function main() {
  const tester = new RLSPerformanceTester();
  
  try {
    const report = await tester.runPerformanceTest();
    
    // Exit with appropriate code
    if (report.overallStatus === 'FAIL') {
      console.log('\n💥 Performance tests failed - RLS optimization required');
      process.exit(1);
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️ Performance tests completed with warnings');
      process.exit(0);
    } else {
      console.log('\n🎉 All performance tests passed successfully');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Performance testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RLSPerformanceTester };