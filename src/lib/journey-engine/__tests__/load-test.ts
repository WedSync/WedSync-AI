import { performance } from 'perf_hooks';
import { JourneyExecutor } from '../executor';
import { createClient } from '@supabase/supabase-js';

// Load test configuration
const LOAD_TEST_CONFIG = {
  CONCURRENT_EXECUTIONS: 100,
  TOTAL_EXECUTIONS: 1000,
  JOURNEY_TEMPLATE_ID: 'test-journey-1',
  RAMP_UP_TIME_MS: 5000,
  TEST_DURATION_MS: 60000,
  METRICS_INTERVAL_MS: 5000,
};

interface ExecutionMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  stepCount?: number;
  memoryUsage?: number;
}

class JourneyLoadTester {
  private executor: JourneyExecutor;
  private supabase: any;
  private metrics: Map<string, ExecutionMetrics> = new Map();
  private startTime: number = 0;
  private completedCount: number = 0;
  private failedCount: number = 0;

  constructor() {
    this.executor = new JourneyExecutor();
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  /**
   * Run load test with specified configuration
   */
  async runLoadTest() {
    console.log('🚀 Starting Journey Engine Load Test');
    console.log(`Configuration:
      - Concurrent Executions: ${LOAD_TEST_CONFIG.CONCURRENT_EXECUTIONS}
      - Total Executions: ${LOAD_TEST_CONFIG.TOTAL_EXECUTIONS}
      - Ramp-up Time: ${LOAD_TEST_CONFIG.RAMP_UP_TIME_MS}ms
      - Test Duration: ${LOAD_TEST_CONFIG.TEST_DURATION_MS}ms
    `);

    this.startTime = performance.now();

    // Set up test data
    await this.setupTestData();

    // Start metrics reporting
    const metricsInterval = setInterval(() => {
      this.reportMetrics();
    }, LOAD_TEST_CONFIG.METRICS_INTERVAL_MS);

    // Execute load test
    await this.executeLoadTest();

    // Clean up
    clearInterval(metricsInterval);

    // Final report
    this.generateFinalReport();
  }

  /**
   * Set up test journey and clients
   */
  private async setupTestData() {
    console.log('📦 Setting up test data...');

    // Create test journey template
    const { data: journey, error: journeyError } = await this.supabase
      .from('journey_templates')
      .upsert({
        id: LOAD_TEST_CONFIG.JOURNEY_TEMPLATE_ID,
        name: 'Load Test Journey',
        description: 'Journey for load testing',
        vendor_id: 'test-vendor-1',
        organization_id: 'test-org-1',
        status: 'active',
        config: {
          nodes: [
            {
              id: 'start',
              type: 'trigger',
              data: { label: 'Start' },
            },
            {
              id: 'email-1',
              type: 'email',
              data: {
                template: 'welcome_vendor_onboarding',
                trackOpens: true,
              },
            },
            {
              id: 'wait-1',
              type: 'wait',
              data: {
                duration: 1,
                unit: 'seconds',
              },
            },
            {
              id: 'condition-1',
              type: 'condition',
              data: {
                conditions: [
                  {
                    field: 'test_flag',
                    operator: 'equals',
                    value: true,
                  },
                ],
              },
            },
            {
              id: 'sms-1',
              type: 'sms',
              data: {
                template: 'form_reminder',
              },
            },
            {
              id: 'task-1',
              type: 'task',
              data: {
                title: 'Test Task',
                autoComplete: true,
              },
            },
          ],
          edges: [
            { source: 'start', target: 'email-1' },
            { source: 'email-1', target: 'wait-1' },
            { source: 'wait-1', target: 'condition-1' },
            { source: 'condition-1', target: 'sms-1', label: 'true' },
            { source: 'condition-1', target: 'task-1', label: 'false' },
          ],
        },
      })
      .select()
      .single();

    if (journeyError) {
      console.error('Failed to create test journey:', journeyError);
      throw journeyError;
    }

    // Create test clients
    const clients = [];
    for (let i = 0; i < LOAD_TEST_CONFIG.TOTAL_EXECUTIONS; i++) {
      clients.push({
        id: `test-client-${i}`,
        vendor_id: 'test-vendor-1',
        first_name: `Test${i}`,
        last_name: 'Client',
        email: `test${i}@example.com`,
        phone: `+1555000${String(i).padStart(4, '0')}`,
        sms_consent: true,
      });
    }

    // Batch insert clients
    const batchSize = 100;
    for (let i = 0; i < clients.length; i += batchSize) {
      const batch = clients.slice(i, i + batchSize);
      const { error } = await this.supabase.from('clients').upsert(batch);

      if (error) {
        console.error('Failed to create test clients:', error);
      }
    }

    console.log('✅ Test data setup complete');
  }

  /**
   * Execute the load test
   */
  private async executeLoadTest() {
    const executions: Promise<void>[] = [];
    const batchSize = LOAD_TEST_CONFIG.CONCURRENT_EXECUTIONS;
    const rampUpDelay = LOAD_TEST_CONFIG.RAMP_UP_TIME_MS / batchSize;

    console.log('🏃 Starting journey executions...');

    for (let i = 0; i < LOAD_TEST_CONFIG.TOTAL_EXECUTIONS; i++) {
      // Ramp up gradually
      if (i % batchSize === 0 && i > 0) {
        await this.delay(rampUpDelay);
        console.log(
          `  Batch ${Math.floor(i / batchSize)}: ${i} executions started`,
        );
      }

      const execution = this.executeJourney(`test-client-${i}`);
      executions.push(execution);

      // Maintain concurrent execution limit
      if (executions.length >= batchSize) {
        await Promise.race(executions);
        executions.splice(
          executions.findIndex((p) => p === undefined),
          1,
        );
      }
    }

    // Wait for all remaining executions
    console.log('⏳ Waiting for all executions to complete...');
    await Promise.allSettled(executions);
  }

  /**
   * Execute a single journey
   */
  private async executeJourney(clientId: string): Promise<void> {
    const executionId = `exec-${clientId}-${Date.now()}`;
    const startTime = performance.now();

    this.metrics.set(executionId, {
      startTime,
      status: 'pending',
      memoryUsage: process.memoryUsage().heapUsed,
    });

    try {
      // Create execution record
      const { data: execution, error } = await this.supabase
        .from('journey_executions')
        .insert({
          id: executionId,
          template_id: LOAD_TEST_CONFIG.JOURNEY_TEMPLATE_ID,
          client_id: clientId,
          vendor_id: 'test-vendor-1',
          organization_id: 'test-org-1',
          status: 'pending',
          context: {
            test_flag: Math.random() > 0.5,
            load_test: true,
            started_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update status to running
      this.metrics.get(executionId)!.status = 'running';

      // Execute journey
      await this.executor.executeJourney(executionId);

      // Mark as completed
      const endTime = performance.now();
      const metric = this.metrics.get(executionId)!;
      metric.endTime = endTime;
      metric.duration = endTime - startTime;
      metric.status = 'completed';
      this.completedCount++;
    } catch (error) {
      // Mark as failed
      const endTime = performance.now();
      const metric = this.metrics.get(executionId)!;
      metric.endTime = endTime;
      metric.duration = endTime - startTime;
      metric.status = 'failed';
      metric.error = error instanceof Error ? error.message : 'Unknown error';
      this.failedCount++;
    }
  }

  /**
   * Report current metrics
   */
  private reportMetrics() {
    const currentTime = performance.now();
    const elapsedTime = (currentTime - this.startTime) / 1000;

    const completedMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.status === 'completed' && m.duration,
    );

    const avgDuration =
      completedMetrics.length > 0
        ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) /
          completedMetrics.length
        : 0;

    const minDuration =
      completedMetrics.length > 0
        ? Math.min(...completedMetrics.map((m) => m.duration || 0))
        : 0;

    const maxDuration =
      completedMetrics.length > 0
        ? Math.max(...completedMetrics.map((m) => m.duration || 0))
        : 0;

    const throughput = this.completedCount / elapsedTime;

    console.log(`
📊 Metrics Report (${elapsedTime.toFixed(1)}s)
  - Completed: ${this.completedCount}
  - Failed: ${this.failedCount}
  - In Progress: ${this.metrics.size - this.completedCount - this.failedCount}
  - Throughput: ${throughput.toFixed(2)} exec/sec
  - Avg Duration: ${avgDuration.toFixed(2)}ms
  - Min Duration: ${minDuration.toFixed(2)}ms
  - Max Duration: ${maxDuration.toFixed(2)}ms
  - Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB
    `);
  }

  /**
   * Generate final test report
   */
  private generateFinalReport() {
    const totalTime = (performance.now() - this.startTime) / 1000;
    const successRate =
      (this.completedCount / LOAD_TEST_CONFIG.TOTAL_EXECUTIONS) * 100;

    const completedMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.status === 'completed' && m.duration,
    );

    const durations = completedMetrics
      .map((m) => m.duration || 0)
      .sort((a, b) => a - b);
    const p50 = this.getPercentile(durations, 50);
    const p90 = this.getPercentile(durations, 90);
    const p95 = this.getPercentile(durations, 95);
    const p99 = this.getPercentile(durations, 99);

    console.log(`
🎯 Final Load Test Report
===============================
Test Duration: ${totalTime.toFixed(2)}s
Total Executions: ${LOAD_TEST_CONFIG.TOTAL_EXECUTIONS}
Successful: ${this.completedCount}
Failed: ${this.failedCount}
Success Rate: ${successRate.toFixed(2)}%

Performance Metrics:
- P50 Latency: ${p50.toFixed(2)}ms
- P90 Latency: ${p90.toFixed(2)}ms
- P95 Latency: ${p95.toFixed(2)}ms
- P99 Latency: ${p99.toFixed(2)}ms
- Avg Throughput: ${(this.completedCount / totalTime).toFixed(2)} exec/sec
- Peak Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB

Errors:
${this.getErrorSummary()}
===============================
    `);

    // Save detailed report
    this.saveDetailedReport();
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get error summary
   */
  private getErrorSummary(): string {
    const errors = new Map<string, number>();

    Array.from(this.metrics.values())
      .filter((m) => m.status === 'failed' && m.error)
      .forEach((m) => {
        const error = m.error || 'Unknown';
        errors.set(error, (errors.get(error) || 0) + 1);
      });

    if (errors.size === 0) {
      return '  No errors';
    }

    return Array.from(errors.entries())
      .map(([error, count]) => `  - ${error}: ${count}`)
      .join('\n');
  }

  /**
   * Save detailed report to file
   */
  private async saveDetailedReport() {
    const report = {
      config: LOAD_TEST_CONFIG,
      summary: {
        totalExecutions: LOAD_TEST_CONFIG.TOTAL_EXECUTIONS,
        completed: this.completedCount,
        failed: this.failedCount,
        successRate:
          (this.completedCount / LOAD_TEST_CONFIG.TOTAL_EXECUTIONS) * 100,
        totalDuration: (performance.now() - this.startTime) / 1000,
      },
      metrics: Array.from(this.metrics.entries()).map(([id, metric]) => ({
        id,
        ...metric,
      })),
    };

    const fs = require('fs').promises;
    const filename = `load-test-report-${Date.now()}.json`;
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${filename}`);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run load test if executed directly
if (require.main === module) {
  const tester = new JourneyLoadTester();
  tester
    .runLoadTest()
    .then(() => {
      console.log('✅ Load test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    });
}

export { JourneyLoadTester };
