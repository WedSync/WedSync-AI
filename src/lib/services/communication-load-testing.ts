/**
 * WS-155: Guest Communications - Production Load Testing Service
 * Team E - Round 3: Handle 2000+ concurrent messaging operations
 * Feature ID: WS-155
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

interface LoadTestConfig {
  targetConcurrency: number;
  testDurationMs: number;
  rampUpTimeMs: number;
  organizationId: string;
  messageTypes: ('email' | 'sms' | 'push' | 'in_app')[];
}

interface LoadTestResult {
  testId: string;
  concurrentOperations: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  operationsPerSecond: number;
  errorRate: number;
}

interface OperationMetrics {
  operationId: string;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

export class CommunicationLoadTestingService {
  private supabase: any;
  private metrics: OperationMetrics[] = [];
  private activeOperations = new Map<string, Promise<void>>();
  private testRunning = false;
  private abortController?: AbortController;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Run production load test for guest communications
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const testId = `load_test_${Date.now()}`;
    this.testRunning = true;
    this.abortController = new AbortController();
    this.metrics = [];

    try {
      // Log test start
      await this.logTestStart(testId, config);

      // Ramp up to target concurrency
      const rampUpSteps = 10;
      const stepDuration = config.rampUpTimeMs / rampUpSteps;
      const stepSize = Math.ceil(config.targetConcurrency / rampUpSteps);

      for (let step = 1; step <= rampUpSteps && this.testRunning; step++) {
        const currentConcurrency = Math.min(
          step * stepSize,
          config.targetConcurrency,
        );
        await this.adjustConcurrency(currentConcurrency, config);
        await this.delay(stepDuration);
      }

      // Maintain target concurrency for test duration
      const testEndTime = performance.now() + config.testDurationMs;
      while (performance.now() < testEndTime && this.testRunning) {
        await this.maintainConcurrency(config.targetConcurrency, config);
        await this.delay(100); // Check every 100ms
      }

      // Wait for all operations to complete
      await this.waitForOperationsToComplete();

      // Calculate and return results
      return this.calculateResults(testId, config);
    } catch (error) {
      console.error('Load test failed:', error);
      throw error;
    } finally {
      this.testRunning = false;
      this.abortController = undefined;
    }
  }

  /**
   * Stop the running load test
   */
  async stopLoadTest(): Promise<void> {
    this.testRunning = false;
    this.abortController?.abort();
    await this.waitForOperationsToComplete();
  }

  /**
   * Simulate a messaging operation
   */
  private async simulateMessagingOperation(
    config: LoadTestConfig,
    operationId: string,
  ): Promise<void> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      // Simulate different operation types
      const operationType = this.getRandomOperationType();

      switch (operationType) {
        case 'bulk_send':
          await this.simulateBulkSend(config);
          break;
        case 'template_render':
          await this.simulateTemplateRender(config);
          break;
        case 'recipient_query':
          await this.simulateRecipientQuery(config);
          break;
        case 'status_update':
          await this.simulateStatusUpdate(config);
          break;
        default:
          await this.simulateDefaultOperation(config);
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      const endTime = performance.now();
      this.metrics.push({
        operationId,
        startTime,
        endTime,
        success,
        error,
      });
    }
  }

  /**
   * Simulate bulk send operation
   */
  private async simulateBulkSend(config: LoadTestConfig): Promise<void> {
    const recipientCount = Math.floor(Math.random() * 100) + 50; // 50-150 recipients

    // Create communication record
    const { data: communication, error: commError } = await this.supabase
      .from('guest_communications')
      .insert({
        organization_id: config.organizationId,
        message_title: `Load Test Message ${Date.now()}`,
        message_content: 'This is a load test message for performance testing.',
        message_type: 'bulk',
        channels: config.messageTypes,
        status: 'scheduled',
        total_recipients: recipientCount,
        metadata: { test_id: 'load_test', timestamp: new Date().toISOString() },
      })
      .select()
      .single();

    if (commError) throw commError;

    // Simulate bulk recipient insert
    const recipients = Array.from({ length: recipientCount }, (_, i) => ({
      communication_id: communication.id,
      organization_id: config.organizationId,
      recipient_email: `test_${i}@loadtest.com`,
      recipient_name: `Test User ${i}`,
      guest_group: 'test_group',
      email_status: 'pending',
    }));

    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const { error: recipientError } = await this.supabase
        .from('communication_recipients')
        .insert(batch);

      if (recipientError) throw recipientError;
    }
  }

  /**
   * Simulate template rendering operation
   */
  private async simulateTemplateRender(config: LoadTestConfig): Promise<void> {
    // Query templates
    const { data: templates, error } = await this.supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', config.organizationId)
      .eq('is_active', true)
      .limit(10);

    if (error) throw error;

    // Simulate rendering with personalization
    const renderTime = Math.random() * 50 + 10; // 10-60ms render time
    await this.delay(renderTime);
  }

  /**
   * Simulate recipient query operation
   */
  private async simulateRecipientQuery(config: LoadTestConfig): Promise<void> {
    // Complex query with multiple joins and filters
    const { data, error } = await this.supabase
      .from('communication_recipients')
      .select(
        `
        *,
        guest_communications!inner(
          message_title,
          sent_at,
          status
        ),
        delivery_status(
          status,
          delivered_at,
          opened_at
        )
      `,
      )
      .eq('organization_id', config.organizationId)
      .gte(
        'created_at',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(100);

    if (error) throw error;
  }

  /**
   * Simulate status update operation
   */
  private async simulateStatusUpdate(config: LoadTestConfig): Promise<void> {
    // Get recent communications
    const { data: communications, error: fetchError } = await this.supabase
      .from('guest_communications')
      .select('id')
      .eq('organization_id', config.organizationId)
      .eq('status', 'scheduled')
      .limit(5);

    if (fetchError) throw fetchError;

    if (communications && communications.length > 0) {
      const commId =
        communications[Math.floor(Math.random() * communications.length)].id;

      // Update status
      const { error: updateError } = await this.supabase
        .from('guest_communications')
        .update({
          status: 'sending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', commId);

      if (updateError) throw updateError;
    }
  }

  /**
   * Simulate default operation
   */
  private async simulateDefaultOperation(
    config: LoadTestConfig,
  ): Promise<void> {
    // Simple read operation
    const { data, error } = await this.supabase
      .from('guest_communications')
      .select('id, message_title, status, created_at')
      .eq('organization_id', config.organizationId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
  }

  /**
   * Maintain target concurrency level
   */
  private async maintainConcurrency(
    targetConcurrency: number,
    config: LoadTestConfig,
  ): Promise<void> {
    const currentConcurrency = this.activeOperations.size;
    const operationsToStart = targetConcurrency - currentConcurrency;

    for (let i = 0; i < operationsToStart; i++) {
      if (!this.testRunning) break;

      const operationId = `op_${Date.now()}_${i}`;
      const operation = this.simulateMessagingOperation(
        config,
        operationId,
      ).finally(() => {
        this.activeOperations.delete(operationId);
      });

      this.activeOperations.set(operationId, operation);
    }
  }

  /**
   * Adjust concurrency to target level
   */
  private async adjustConcurrency(
    targetConcurrency: number,
    config: LoadTestConfig,
  ): Promise<void> {
    await this.maintainConcurrency(targetConcurrency, config);
  }

  /**
   * Wait for all operations to complete
   */
  private async waitForOperationsToComplete(
    timeoutMs: number = 30000,
  ): Promise<void> {
    const startTime = performance.now();

    while (this.activeOperations.size > 0) {
      if (performance.now() - startTime > timeoutMs) {
        console.warn('Timeout waiting for operations to complete');
        break;
      }

      await this.delay(100);
    }
  }

  /**
   * Calculate load test results
   */
  private calculateResults(
    testId: string,
    config: LoadTestConfig,
  ): LoadTestResult {
    const successfulOps = this.metrics.filter((m) => m.success);
    const failedOps = this.metrics.filter((m) => !m.success);

    const responseTimes = this.metrics.map((m) => m.endTime - m.startTime);
    responseTimes.sort((a, b) => a - b);

    const totalTime =
      Math.max(...this.metrics.map((m) => m.endTime)) -
      Math.min(...this.metrics.map((m) => m.startTime));

    return {
      testId,
      concurrentOperations: config.targetConcurrency,
      totalOperations: this.metrics.length,
      successfulOperations: successfulOps.length,
      failedOperations: failedOps.length,
      averageResponseTimeMs: this.calculateAverage(responseTimes),
      p95ResponseTimeMs: this.calculatePercentile(responseTimes, 95),
      p99ResponseTimeMs: this.calculatePercentile(responseTimes, 99),
      operationsPerSecond: (this.metrics.length / totalTime) * 1000,
      errorRate: (failedOps.length / this.metrics.length) * 100,
    };
  }

  /**
   * Log test start to database
   */
  private async logTestStart(
    testId: string,
    config: LoadTestConfig,
  ): Promise<void> {
    try {
      await this.supabase.from('communication_load_metrics').insert({
        test_id: testId,
        concurrent_operations: config.targetConcurrency,
        metadata: {
          config,
          start_time: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log test start:', error);
    }
  }

  /**
   * Get random operation type for simulation
   */
  private getRandomOperationType(): string {
    const types = [
      'bulk_send',
      'template_render',
      'recipient_query',
      'status_update',
      'default',
    ];

    // Weighted selection - bulk_send is more common
    const weights = [30, 20, 20, 20, 10];
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;

    let weightSum = 0;
    for (let i = 0; i < types.length; i++) {
      weightSum += weights[i];
      if (random <= weightSum) {
        return types[i];
      }
    }

    return 'default';
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate percentile of numbers
   */
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * numbers.length) - 1;
    return numbers[Math.max(0, index)];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verify system can handle 2000+ concurrent operations
   */
  async verify2000ConcurrentOperations(): Promise<boolean> {
    const config: LoadTestConfig = {
      targetConcurrency: 2000,
      testDurationMs: 60000, // 1 minute test
      rampUpTimeMs: 30000, // 30 second ramp up
      organizationId: 'test-org-id',
      messageTypes: ['email', 'sms', 'push', 'in_app'],
    };

    try {
      const result = await this.runLoadTest(config);

      // Success criteria
      const meetsRequirements =
        result.successfulOperations >= result.totalOperations * 0.95 && // 95% success rate
        result.p99ResponseTimeMs < 5000 && // P99 under 5 seconds
        result.operationsPerSecond >= 30; // At least 30 ops/second

      // Log results
      await this.supabase.from('communication_load_metrics').insert({
        test_id: result.testId,
        concurrent_operations: result.concurrentOperations,
        operations_per_second: result.operationsPerSecond,
        average_response_time_ms: result.averageResponseTimeMs,
        p95_response_time_ms: result.p95ResponseTimeMs,
        p99_response_time_ms: result.p99ResponseTimeMs,
        error_rate: result.errorRate,
        metadata: {
          verification: '2000_concurrent',
          meets_requirements: meetsRequirements,
          result,
        },
      });

      return meetsRequirements;
    } catch (error) {
      console.error('2000 concurrent operations verification failed:', error);
      return false;
    }
  }
}
