/**
 * WS-150 Audit System Performance Validation
 * Team D Implementation - Batch 13
 * 
 * Validates that audit system queries meet <2 second performance requirement
 * Tests query performance across different scenarios and data volumes
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

interface PerformanceTest {
  name: string;
  description: string;
  query: () => Promise<any>;
  expectedMaxTime: number; // milliseconds
  category: 'basic' | 'complex' | 'analytical' | 'compliance';
}

interface PerformanceResult {
  testName: string;
  executionTime: number;
  passed: boolean;
  rowsReturned: number | null;
  error: string | null;
  category: string;
}

class AuditPerformanceValidator {
  private supabase;
  private testOrganizationId: string;

  constructor() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Use a test organization ID or create one for testing
    this.testOrganizationId = 'test-org-' + Date.now();
  }

  /**
   * Generate test data for performance validation
   */
  async generateTestData(recordCount: number = 100000): Promise<void> {
    console.log(`Generating ${recordCount} test audit records...`);
    
    const batchSize = 1000;
    const batches = Math.ceil(recordCount / batchSize);
    
    const eventTypes = [
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'DATA_READ', 'DATA_UPDATE', 
      'PAYMENT_COMPLETED', 'ADMIN_ACTION', 'API_KEY_USAGE', 'FILE_UPLOAD'
    ];
    
    const eventCategories = [
      'AUTHENTICATION', 'DATA_ACCESS', 'FINANCIAL', 'SYSTEM_SECURITY', 'COMPLIANCE'
    ];
    
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    
    for (let batch = 0; batch < batches; batch++) {
      const records = [];
      const currentBatchSize = Math.min(batchSize, recordCount - batch * batchSize);
      
      for (let i = 0; i < currentBatchSize; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000); // Random date within last year
        
        records.push({
          organization_id: this.testOrganizationId,
          user_id: `user-${Math.floor(Math.random() * 1000)}`,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          event_category: eventCategories[Math.floor(Math.random() * eventCategories.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          event_timestamp: timestamp.toISOString(),
          event_data: {
            test_data: true,
            random_value: Math.random(),
            batch_number: batch,
            record_number: i
          },
          ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          session_id: `session-${Math.floor(Math.random() * 10000)}`,
          response_time_ms: Math.floor(Math.random() * 5000),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      const { error } = await this.supabase
        .from('audit_events')
        .insert(records);
        
      if (error) {
        console.error(`Failed to insert batch ${batch}:`, error);
        throw error;
      }
      
      console.log(`Inserted batch ${batch + 1}/${batches} (${records.length} records)`);
    }
    
    console.log(`Successfully generated ${recordCount} test records`);
  }

  /**
   * Define performance tests
   */
  getPerformanceTests(): PerformanceTest[] {
    return [
      // Basic queries
      {
        name: 'Basic Event Lookup',
        description: 'Fetch recent events for organization',
        category: 'basic',
        expectedMaxTime: 500, // 0.5 seconds
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('id, event_type, event_timestamp, severity')
            .eq('organization_id', this.testOrganizationId)
            .order('event_timestamp', { ascending: false })
            .limit(100);
        }
      },
      
      {
        name: 'Event Type Filter',
        description: 'Filter events by specific type',
        category: 'basic',
        expectedMaxTime: 1000, // 1 second
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .eq('event_type', 'LOGIN_SUCCESS')
            .order('event_timestamp', { ascending: false })
            .limit(500);
        }
      },
      
      {
        name: 'Severity-based Query',
        description: 'Fetch high severity events',
        category: 'basic',
        expectedMaxTime: 800, // 0.8 seconds
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .in('severity', ['HIGH', 'CRITICAL'])
            .order('event_timestamp', { ascending: false })
            .limit(200);
        }
      },
      
      {
        name: 'Date Range Query',
        description: 'Fetch events within specific date range',
        category: 'basic',
        expectedMaxTime: 1200, // 1.2 seconds
        query: async () => {
          const endDate = new Date();
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
          
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .gte('event_timestamp', startDate.toISOString())
            .lte('event_timestamp', endDate.toISOString())
            .order('event_timestamp', { ascending: false });
        }
      },
      
      // Complex queries
      {
        name: 'User Activity Analysis',
        description: 'Analyze user activity patterns',
        category: 'complex',
        expectedMaxTime: 1800, // 1.8 seconds
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('user_id, event_type, event_timestamp, ip_address')
            .eq('organization_id', this.testOrganizationId)
            .not('user_id', 'is', null)
            .order('event_timestamp', { ascending: false })
            .limit(1000);
        }
      },
      
      {
        name: 'Security Event Investigation',
        description: 'Investigate security events with context',
        category: 'complex',
        expectedMaxTime: 1500, // 1.5 seconds
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .eq('event_category', 'SYSTEM_SECURITY')
            .in('severity', ['HIGH', 'CRITICAL'])
            .order('event_timestamp', { ascending: false })
            .limit(100);
        }
      },
      
      {
        name: 'Financial Transaction Audit',
        description: 'Audit financial transactions',
        category: 'complex',
        expectedMaxTime: 1600, // 1.6 seconds
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .eq('event_category', 'FINANCIAL')
            .order('event_timestamp', { ascending: false })
            .limit(500);
        }
      },
      
      // Analytical queries
      {
        name: 'Event Count by Category',
        description: 'Count events by category for dashboards',
        category: 'analytical',
        expectedMaxTime: 2000, // 2 seconds (maximum allowed)
        query: async () => {
          // Since Supabase doesn't support GROUP BY in select, we'll use a workaround
          return await this.supabase
            .from('audit_events')
            .select('event_category')
            .eq('organization_id', this.testOrganizationId);
        }
      },
      
      {
        name: 'Hourly Event Trends',
        description: 'Analyze event trends by hour',
        category: 'analytical',
        expectedMaxTime: 1900, // 1.9 seconds
        query: async () => {
          const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
          
          return await this.supabase
            .from('audit_events')
            .select('event_timestamp, event_category')
            .eq('organization_id', this.testOrganizationId)
            .gte('event_timestamp', last24Hours.toISOString())
            .order('event_timestamp', { ascending: false });
        }
      },
      
      {
        name: 'Critical Events Dashboard',
        description: 'Dashboard query for critical events',
        category: 'analytical',
        expectedMaxTime: 1500, // 1.5 seconds
        query: async () => {
          return await this.supabase
            .from('critical_audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .limit(50);
        }
      },
      
      // Compliance queries
      {
        name: 'Legal Hold Records',
        description: 'Fetch records under legal hold',
        category: 'compliance',
        expectedMaxTime: 1000, // 1 second
        query: async () => {
          return await this.supabase
            .from('audit_events')
            .select('*')
            .eq('organization_id', this.testOrganizationId)
            .eq('legal_hold', true)
            .order('event_timestamp', { ascending: false });
        }
      },
      
      {
        name: 'Retention Policy Query',
        description: 'Query records eligible for archival',
        category: 'compliance',
        expectedMaxTime: 1800, // 1.8 seconds
        query: async () => {
          const archivalDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
          
          return await this.supabase
            .from('audit_events')
            .select('id, event_timestamp, event_category, archived, legal_hold')
            .eq('organization_id', this.testOrganizationId)
            .lt('event_timestamp', archivalDate.toISOString())
            .eq('archived', false)
            .eq('legal_hold', false)
            .limit(1000);
        }
      },
      
      {
        name: 'Compliance Report Query',
        description: 'Generate compliance report data',
        category: 'compliance',
        expectedMaxTime: 1900, // 1.9 seconds
        query: async () => {
          const last90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          
          return await this.supabase
            .from('audit_events')
            .select('event_type, event_category, severity, event_timestamp')
            .eq('organization_id', this.testOrganizationId)
            .gte('event_timestamp', last90Days.toISOString())
            .order('event_timestamp', { ascending: false });
        }
      }
    ];
  }

  /**
   * Run a single performance test
   */
  async runPerformanceTest(test: PerformanceTest): Promise<PerformanceResult> {
    console.log(`Running test: ${test.name}...`);
    
    const startTime = performance.now();
    let result: PerformanceResult;
    
    try {
      const { data, error } = await test.query();
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      if (error) {
        result = {
          testName: test.name,
          executionTime,
          passed: false,
          rowsReturned: null,
          error: error.message,
          category: test.category
        };
      } else {
        result = {
          testName: test.name,
          executionTime,
          passed: executionTime <= test.expectedMaxTime,
          rowsReturned: data?.length || 0,
          error: null,
          category: test.category
        };
      }
    } catch (error) {
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      result = {
        testName: test.name,
        executionTime,
        passed: false,
        rowsReturned: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        category: test.category
      };
    }
    
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const timeStr = `${result.executionTime.toFixed(2)}ms`;
    const expectedStr = `(expected ≤${test.expectedMaxTime}ms)`;
    
    console.log(`  ${status} ${timeStr} ${expectedStr} - ${result.rowsReturned || 0} rows`);
    
    if (!result.passed && result.error) {
      console.log(`  Error: ${result.error}`);
    }
    
    return result;
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<{
    results: PerformanceResult[];
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      averageExecutionTime: number;
      categoryBreakdown: Record<string, { passed: number; failed: number; avgTime: number }>;
    };
  }> {
    console.log('🚀 Starting WS-150 Audit System Performance Validation');
    console.log('=' * 60);
    
    const tests = this.getPerformanceTests();
    const results: PerformanceResult[] = [];
    
    for (const test of tests) {
      const result = await this.runPerformanceTest(test);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Calculate summary
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const averageExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;
    
    // Category breakdown
    const categoryBreakdown: Record<string, { passed: number; failed: number; avgTime: number }> = {};
    
    for (const result of results) {
      if (!categoryBreakdown[result.category]) {
        categoryBreakdown[result.category] = { passed: 0, failed: 0, avgTime: 0 };
      }
      
      if (result.passed) {
        categoryBreakdown[result.category].passed++;
      } else {
        categoryBreakdown[result.category].failed++;
      }
    }
    
    // Calculate average times per category
    for (const category of Object.keys(categoryBreakdown)) {
      const categoryResults = results.filter(r => r.category === category);
      const avgTime = categoryResults.reduce((sum, r) => sum + r.executionTime, 0) / categoryResults.length;
      categoryBreakdown[category].avgTime = avgTime;
    }
    
    return {
      results,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        averageExecutionTime,
        categoryBreakdown
      }
    };
  }

  /**
   * Print test summary
   */
  printSummary(summary: any): void {
    console.log('\n📊 Performance Test Summary');
    console.log('=' * 60);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests} ✅`);
    console.log(`Failed: ${summary.failedTests} ❌`);
    console.log(`Success Rate: ${((summary.passedTests / summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`Average Execution Time: ${summary.averageExecutionTime.toFixed(2)}ms`);
    
    console.log('\n📋 Category Breakdown:');
    for (const [category, stats] of Object.entries(summary.categoryBreakdown)) {
      const categoryStats = stats as any;
      console.log(`  ${category.toUpperCase()}:`);
      console.log(`    Passed: ${categoryStats.passed}`);
      console.log(`    Failed: ${categoryStats.failed}`);
      console.log(`    Average Time: ${categoryStats.avgTime.toFixed(2)}ms`);
    }
    
    if (summary.failedTests > 0) {
      console.log('\n⚠️  Performance Requirements Not Met');
      console.log('Some queries exceeded the 2-second requirement.');
      console.log('Consider optimizing indexes or query patterns.');
    } else {
      console.log('\n🎉 All Performance Requirements Met!');
      console.log('Audit system queries execute within 2-second requirement.');
    }
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...');
    
    const { error } = await this.supabase
      .from('audit_events')
      .delete()
      .eq('organization_id', this.testOrganizationId);
    
    if (error) {
      console.error('Failed to cleanup test data:', error);
    } else {
      console.log('Test data cleaned up successfully');
    }
  }
}

// Main execution
async function main() {
  try {
    const validator = new AuditPerformanceValidator();
    
    // Generate test data (uncomment for full test)
    // await validator.generateTestData(50000);
    
    // Run performance tests
    const { results, summary } = await validator.runAllTests();
    
    // Print summary
    validator.printSummary(summary);
    
    // Generate detailed report
    const reportPath = `./audit-performance-report-${Date.now()}.json`;
    const fs = await import('fs/promises');
    await fs.writeFile(reportPath, JSON.stringify({ results, summary }, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Cleanup (uncomment if test data was generated)
    // await validator.cleanup();
    
    // Exit with appropriate code
    process.exit(summary.failedTests > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Performance validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { AuditPerformanceValidator };