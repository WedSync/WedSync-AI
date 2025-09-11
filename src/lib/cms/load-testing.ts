interface LoadTestConfig {
  concurrentUsers: number;
  testDurationMs: number;
  rampUpTimeMs: number;
  operations: TestOperation[];
  targetEndpoints: string[];
  maxResponseTimeMs: number;
  errorRateThreshold: number;
}

interface TestOperation {
  name: string;
  weight: number; // Probability weight (0-1)
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  headers?: Record<string, string>;
  expectedStatus?: number[];
}

interface LoadTestResult {
  config: LoadTestConfig;
  startTime: number;
  endTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number; // requests per second
  operationResults: Map<string, OperationResult>;
  errors: TestError[];
}

interface OperationResult {
  operationName: string;
  totalRequests: number;
  successfulRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  responseTimes: number[];
}

interface TestError {
  timestamp: number;
  operation: string;
  error: string;
  responseTime: number;
  statusCode?: number;
}

/**
 * CMS Load Testing Framework
 * Tests concurrent content operations under load
 */
export class CMSLoadTester {
  private isRunning = false;
  private results: LoadTestResult[] = [];

  /**
   * Run comprehensive load test for CMS operations
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    if (this.isRunning) {
      throw new Error('Load test already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log(
      `Starting load test with ${config.concurrentUsers} concurrent users for ${config.testDurationMs}ms`,
    );

    try {
      const result = await this.executeLoadTest(config, startTime);
      this.results.push(result);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private async executeLoadTest(
    config: LoadTestConfig,
    startTime: number,
  ): Promise<LoadTestResult> {
    const workers: Promise<OperationResult>[] = [];
    const allErrors: TestError[] = [];
    const operationResults = new Map<string, OperationResult>();

    // Initialize operation results
    config.operations.forEach((op) => {
      operationResults.set(op.name, {
        operationName: op.name,
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimes: [],
      });
    });

    // Create concurrent workers with ramp-up
    const rampUpInterval = config.rampUpTimeMs / config.concurrentUsers;

    for (let i = 0; i < config.concurrentUsers; i++) {
      const workerPromise = this.createWorker(
        config,
        startTime,
        i * rampUpInterval,
        (error) => allErrors.push(error),
      );
      workers.push(workerPromise);
    }

    // Wait for all workers to complete
    const workerResults = await Promise.all(workers);

    // Aggregate results
    let totalRequests = 0;
    let successfulRequests = 0;
    const allResponseTimes: number[] = [];

    workerResults.forEach((workerResult) => {
      const existing = operationResults.get(workerResult.operationName);
      if (existing) {
        existing.totalRequests += workerResult.totalRequests;
        existing.successfulRequests += workerResult.successfulRequests;
        existing.responseTimes.push(...workerResult.responseTimes);
        existing.minResponseTime = Math.min(
          existing.minResponseTime,
          workerResult.minResponseTime,
        );
        existing.maxResponseTime = Math.max(
          existing.maxResponseTime,
          workerResult.maxResponseTime,
        );

        // Recalculate average
        existing.averageResponseTime =
          existing.responseTimes.reduce((a, b) => a + b, 0) /
          existing.responseTimes.length;
      }

      totalRequests += workerResult.totalRequests;
      successfulRequests += workerResult.successfulRequests;
      allResponseTimes.push(...workerResult.responseTimes);
    });

    const endTime = Date.now();
    const testDuration = endTime - startTime;

    // Calculate percentiles
    const sortedTimes = allResponseTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      config,
      startTime,
      endTime,
      totalRequests,
      successfulRequests,
      failedRequests: totalRequests - successfulRequests,
      averageResponseTime:
        allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      errorRate: ((totalRequests - successfulRequests) / totalRequests) * 100,
      throughput: (totalRequests / testDuration) * 1000, // requests per second
      operationResults,
      errors: allErrors,
    };
  }

  private async createWorker(
    config: LoadTestConfig,
    testStartTime: number,
    delayMs: number,
    onError: (error: TestError) => void,
  ): Promise<OperationResult> {
    // Wait for ramp-up delay
    await this.sleep(delayMs);

    const workerResult: OperationResult = {
      operationName: 'worker',
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: [],
    };

    const endTime = testStartTime + config.testDurationMs;

    while (Date.now() < endTime) {
      const operation = this.selectOperation(config.operations);
      const requestStartTime = Date.now();

      try {
        const response = await this.executeOperation(operation);
        const responseTime = Date.now() - requestStartTime;

        workerResult.totalRequests++;
        workerResult.responseTimes.push(responseTime);
        workerResult.minResponseTime = Math.min(
          workerResult.minResponseTime,
          responseTime,
        );
        workerResult.maxResponseTime = Math.max(
          workerResult.maxResponseTime,
          responseTime,
        );

        if (
          response.ok ||
          (operation.expectedStatus &&
            operation.expectedStatus.includes(response.status))
        ) {
          workerResult.successfulRequests++;
        } else {
          onError({
            timestamp: Date.now(),
            operation: operation.name,
            error: `HTTP ${response.status}: ${response.statusText}`,
            responseTime,
            statusCode: response.status,
          });
        }

        // Check response time threshold
        if (responseTime > config.maxResponseTimeMs) {
          onError({
            timestamp: Date.now(),
            operation: operation.name,
            error: `Response time exceeded threshold: ${responseTime}ms > ${config.maxResponseTimeMs}ms`,
            responseTime,
          });
        }
      } catch (error) {
        const responseTime = Date.now() - requestStartTime;
        workerResult.totalRequests++;

        onError({
          timestamp: Date.now(),
          operation: operation.name,
          error: error instanceof Error ? error.message : String(error),
          responseTime,
        });
      }

      // Small delay between requests to simulate user behavior
      await this.sleep(Math.random() * 100 + 50);
    }

    workerResult.averageResponseTime =
      workerResult.responseTimes.reduce((a, b) => a + b, 0) /
      workerResult.responseTimes.length;
    return workerResult;
  }

  private selectOperation(operations: TestOperation[]): TestOperation {
    const random = Math.random();
    let cumulative = 0;

    for (const operation of operations) {
      cumulative += operation.weight;
      if (random <= cumulative) {
        return operation;
      }
    }

    return operations[operations.length - 1];
  }

  private async executeOperation(operation: TestOperation): Promise<Response> {
    const url = operation.endpoint;
    const options: RequestInit = {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers,
      },
    };

    if (
      operation.payload &&
      ['POST', 'PUT', 'PATCH'].includes(operation.method)
    ) {
      options.body = JSON.stringify(operation.payload);
    }

    return fetch(url, options);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get load test history and analytics
   */
  getTestHistory(): LoadTestResult[] {
    return [...this.results];
  }

  /**
   * Generate performance report
   */
  generateReport(result: LoadTestResult): string {
    const report = `
=== CMS Load Test Report ===
Test Duration: ${result.endTime - result.startTime}ms
Concurrent Users: ${result.config.concurrentUsers}
Target Endpoints: ${result.config.targetEndpoints.join(', ')}

=== Overall Results ===
Total Requests: ${result.totalRequests}
Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(2)}%)
Failed: ${result.failedRequests} (${result.errorRate.toFixed(2)}%)
Throughput: ${result.throughput.toFixed(2)} requests/second

=== Response Times ===
Average: ${result.averageResponseTime.toFixed(2)}ms
95th Percentile: ${result.p95ResponseTime.toFixed(2)}ms
99th Percentile: ${result.p99ResponseTime.toFixed(2)}ms

=== Operation Breakdown ===
${Array.from(result.operationResults.entries())
  .map(
    ([name, opResult]) => `
${name}:
  - Requests: ${opResult.totalRequests}
  - Success Rate: ${((opResult.successfulRequests / opResult.totalRequests) * 100).toFixed(2)}%
  - Avg Response Time: ${opResult.averageResponseTime.toFixed(2)}ms
  - Min/Max: ${opResult.minResponseTime}ms / ${opResult.maxResponseTime}ms
`,
  )
  .join('')}

=== Performance Assessment ===
${this.assessPerformance(result)}

${
  result.errors.length > 0
    ? `
=== Top Errors ===
${result.errors
  .slice(0, 5)
  .map(
    (error) => `
[${new Date(error.timestamp).toISOString()}] ${error.operation}: ${error.error}
`,
  )
  .join('')}
`
    : 'No errors recorded.'
}
    `.trim();

    return report;
  }

  private assessPerformance(result: LoadTestResult): string {
    const assessments: string[] = [];

    // Response time assessment
    if (result.averageResponseTime < 100) {
      assessments.push('✅ Excellent response times');
    } else if (result.averageResponseTime < 500) {
      assessments.push('✅ Good response times');
    } else if (result.averageResponseTime < 1000) {
      assessments.push('⚠️ Acceptable response times');
    } else {
      assessments.push('❌ Poor response times - optimization needed');
    }

    // Error rate assessment
    if (result.errorRate < 1) {
      assessments.push('✅ Excellent error rate');
    } else if (result.errorRate < 5) {
      assessments.push('✅ Good error rate');
    } else if (result.errorRate < 10) {
      assessments.push('⚠️ Acceptable error rate');
    } else {
      assessments.push('❌ High error rate - stability issues detected');
    }

    // Throughput assessment
    const expectedThroughput = result.config.concurrentUsers * 2; // 2 requests per second per user
    if (result.throughput >= expectedThroughput) {
      assessments.push('✅ Good throughput');
    } else {
      assessments.push('⚠️ Lower than expected throughput');
    }

    return assessments.join('\n');
  }
}

/**
 * Predefined test configurations for common scenarios
 */
export const CMS_LOAD_TEST_SCENARIOS = {
  // Basic functionality test
  SMOKE_TEST: {
    concurrentUsers: 5,
    testDurationMs: 30000, // 30 seconds
    rampUpTimeMs: 5000, // 5 seconds
    maxResponseTimeMs: 2000,
    errorRateThreshold: 5,
    operations: [
      {
        name: 'get_content_list',
        weight: 0.4,
        endpoint: '/api/cms/content',
        method: 'GET' as const,
        expectedStatus: [200],
      },
      {
        name: 'create_content',
        weight: 0.2,
        endpoint: '/api/cms/content',
        method: 'POST' as const,
        payload: {
          title: 'Load Test Content',
          content: 'Test content for load testing',
          content_type: 'page',
        },
        expectedStatus: [201],
      },
      {
        name: 'upload_media',
        weight: 0.2,
        endpoint: '/api/cms/media/upload',
        method: 'POST' as const,
        expectedStatus: [200, 201],
      },
      {
        name: 'search_content',
        weight: 0.2,
        endpoint: '/api/cms/content/search?q=test',
        method: 'GET' as const,
        expectedStatus: [200],
      },
    ],
    targetEndpoints: ['/api/cms/content', '/api/cms/media'],
  },

  // High load test
  STRESS_TEST: {
    concurrentUsers: 50,
    testDurationMs: 300000, // 5 minutes
    rampUpTimeMs: 30000, // 30 seconds
    maxResponseTimeMs: 5000,
    errorRateThreshold: 10,
    operations: [
      {
        name: 'get_content_list',
        weight: 0.5,
        endpoint: '/api/cms/content',
        method: 'GET' as const,
      },
      {
        name: 'create_content',
        weight: 0.25,
        endpoint: '/api/cms/content',
        method: 'POST' as const,
        payload: {
          title: 'Stress Test Content',
          content:
            'Large content payload for stress testing with lots of text to simulate real usage patterns and test system performance under load.',
          content_type: 'blog',
        },
      },
      {
        name: 'update_content',
        weight: 0.15,
        endpoint: '/api/cms/content/1',
        method: 'PUT' as const,
        payload: {
          title: 'Updated Content',
          content: 'Updated content for stress testing',
        },
      },
      {
        name: 'cache_operations',
        weight: 0.1,
        endpoint: '/api/cms/cache/stats',
        method: 'GET' as const,
      },
    ],
    targetEndpoints: ['/api/cms/content', '/api/cms/media', '/api/cms/cache'],
  },

  // Mobile-focused test
  MOBILE_TEST: {
    concurrentUsers: 25,
    testDurationMs: 120000, // 2 minutes
    rampUpTimeMs: 15000, // 15 seconds
    maxResponseTimeMs: 3000, // Stricter for mobile
    errorRateThreshold: 3,
    operations: [
      {
        name: 'mobile_content_list',
        weight: 0.6,
        endpoint: '/api/cms/content?mobile_optimized=true',
        method: 'GET' as const,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      },
      {
        name: 'mobile_media_upload',
        weight: 0.3,
        endpoint: '/api/cms/media/upload',
        method: 'POST' as const,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      },
      {
        name: 'mobile_search',
        weight: 0.1,
        endpoint: '/api/cms/content/search?mobile=true&q=wedding',
        method: 'GET' as const,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      },
    ],
    targetEndpoints: ['/api/cms/content', '/api/cms/media'],
  },
};

export default CMSLoadTester;
