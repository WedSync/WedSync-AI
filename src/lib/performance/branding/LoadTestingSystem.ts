/**
 * WS-221 Team D - Load Testing System for Branding File Uploads
 * Comprehensive load testing and stress testing for file upload operations
 */

export interface LoadTestConfig {
  concurrentUsers: number;
  testDuration: number; // ms
  rampUpTime: number; // ms
  fileSize: {
    min: number; // bytes
    max: number; // bytes
  };
  fileTypes: string[];
  targetEndpoint: string;
  expectedResponseTime: number; // ms
  successRate: number; // percentage
}

export interface LoadTestResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number; // bytes/second
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  errors: Array<{
    timestamp: Date;
    error: string;
    requestId: string;
  }>;
  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
}

export interface UploadTestScenario {
  name: string;
  description: string;
  userCount: number;
  duration: number;
  uploadPattern: 'constant' | 'burst' | 'spike' | 'gradual';
  filePattern: 'small' | 'large' | 'mixed' | 'progressive';
}

export class LoadTestingSystem {
  private static instance: LoadTestingSystem;
  private activeTests = new Map<string, AbortController>();
  private results: LoadTestResult[] = [];

  public static getInstance(): LoadTestingSystem {
    if (!LoadTestingSystem.instance) {
      LoadTestingSystem.instance = new LoadTestingSystem();
    }
    return LoadTestingSystem.instance;
  }

  /**
   * Run comprehensive load test for branding uploads
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const testId = this.generateTestId();
    const abortController = new AbortController();
    this.activeTests.set(testId, abortController);

    const result: LoadTestResult = {
      testId,
      startTime: new Date(),
      endTime: new Date(),
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: {
        initial: this.getCurrentMemoryUsage(),
        peak: 0,
        final: 0,
      },
      errors: [],
      percentiles: {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      },
    };

    try {
      console.log(
        `[LoadTest] Starting test ${testId} with ${config.concurrentUsers} users`,
      );

      // Generate test files
      const testFiles = this.generateTestFiles(config);

      // Run the load test
      const requestPromises: Promise<any>[] = [];
      const responseTimes: number[] = [];
      let currentUsers = 0;
      const rampUpInterval = config.rampUpTime / config.concurrentUsers;

      // Ramp up users gradually
      const rampUpPromise = new Promise<void>((resolve) => {
        const rampUpTimer = setInterval(() => {
          if (
            currentUsers >= config.concurrentUsers ||
            abortController.signal.aborted
          ) {
            clearInterval(rampUpTimer);
            resolve();
            return;
          }

          // Add a new user
          currentUsers++;
          const userPromise = this.simulateUser(
            testId,
            testFiles,
            config,
            abortController.signal,
            responseTimes,
            result,
          );
          requestPromises.push(userPromise);
        }, rampUpInterval);
      });

      await rampUpPromise;

      // Wait for test duration
      await this.sleep(config.testDuration);

      // Stop the test
      abortController.abort();

      // Wait for all requests to complete or timeout
      await Promise.allSettled(requestPromises);

      // Calculate final results
      this.calculateFinalResults(result, responseTimes, config);

      result.endTime = new Date();
      result.memoryUsage.final = this.getCurrentMemoryUsage();

      this.results.push(result);

      console.log(`[LoadTest] Test ${testId} completed:`, {
        success: `${result.successfulRequests}/${result.totalRequests}`,
        avgResponseTime: `${result.averageResponseTime}ms`,
        errorRate: `${result.errorRate}%`,
      });

      return result;
    } catch (error) {
      console.error(`[LoadTest] Test ${testId} failed:`, error);
      result.errors.push({
        timestamp: new Date(),
        error: error.message,
        requestId: 'test-framework',
      });
      throw error;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  /**
   * Run predefined test scenarios
   */
  async runScenario(scenario: UploadTestScenario): Promise<LoadTestResult> {
    const config = this.buildConfigFromScenario(scenario);
    return this.runLoadTest(config);
  }

  /**
   * Run multiple scenarios in sequence
   */
  async runTestSuite(
    scenarios: UploadTestScenario[],
  ): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const scenario of scenarios) {
      console.log(`[LoadTest] Running scenario: ${scenario.name}`);
      try {
        const result = await this.runScenario(scenario);
        results.push(result);

        // Brief pause between scenarios
        await this.sleep(5000);
      } catch (error) {
        console.error(`[LoadTest] Scenario ${scenario.name} failed:`, error);
      }
    }

    return results;
  }

  /**
   * Stress test with increasing load
   */
  async runStressTest(
    baseConfig: LoadTestConfig,
    maxUsers: number,
    step: number = 10,
  ): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];
    let currentUsers = baseConfig.concurrentUsers;

    while (currentUsers <= maxUsers) {
      const config = { ...baseConfig, concurrentUsers: currentUsers };

      console.log(`[StressTest] Testing with ${currentUsers} concurrent users`);

      try {
        const result = await this.runLoadTest(config);
        results.push(result);

        // Check if system is still performing acceptably
        if (
          result.errorRate > 10 ||
          result.averageResponseTime > config.expectedResponseTime * 3
        ) {
          console.warn(
            `[StressTest] Performance degradation detected at ${currentUsers} users`,
          );
          break;
        }

        currentUsers += step;
        await this.sleep(10000); // 10 second break between tests
      } catch (error) {
        console.error(`[StressTest] Failed at ${currentUsers} users:`, error);
        break;
      }
    }

    return results;
  }

  /**
   * Get test results and analytics
   */
  getResults(testId?: string): LoadTestResult[] {
    if (testId) {
      return this.results.filter((r) => r.testId === testId);
    }
    return [...this.results];
  }

  /**
   * Export results to various formats
   */
  exportResults(format: 'json' | 'csv' | 'html' = 'json'): string {
    switch (format) {
      case 'csv':
        return this.exportToCSV();
      case 'html':
        return this.exportToHTML();
      default:
        return JSON.stringify(this.results, null, 2);
    }
  }

  /**
   * Clear all test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Stop all active tests
   */
  stopAllTests(): void {
    this.activeTests.forEach((controller) => {
      controller.abort();
    });
    this.activeTests.clear();
  }

  // Private methods
  private async simulateUser(
    testId: string,
    testFiles: File[],
    config: LoadTestConfig,
    signal: AbortSignal,
    responseTimes: number[],
    result: LoadTestResult,
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + config.testDuration;

    while (Date.now() < endTime && !signal.aborted) {
      try {
        const file = testFiles[Math.floor(Math.random() * testFiles.length)];
        const requestStartTime = performance.now();

        await this.uploadFile(file, config.targetEndpoint, signal);

        const requestEndTime = performance.now();
        const responseTime = requestEndTime - requestStartTime;

        responseTimes.push(responseTime);
        result.totalRequests++;
        result.successfulRequests++;

        // Update memory peak
        const currentMemory = this.getCurrentMemoryUsage();
        if (currentMemory > result.memoryUsage.peak) {
          result.memoryUsage.peak = currentMemory;
        }

        // Random delay between requests (simulate user behavior)
        await this.sleep(Math.random() * 2000 + 500); // 0.5-2.5 seconds
      } catch (error) {
        result.totalRequests++;
        result.failedRequests++;
        result.errors.push({
          timestamp: new Date(),
          error: error.message,
          requestId: `${testId}-${result.totalRequests}`,
        });
      }
    }
  }

  private async uploadFile(
    file: File,
    endpoint: string,
    signal: AbortSignal,
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json();
  }

  private generateTestFiles(config: LoadTestConfig): File[] {
    const files: File[] = [];
    const fileCount = Math.min(config.concurrentUsers * 2, 50); // Generate enough files

    for (let i = 0; i < fileCount; i++) {
      const size =
        Math.floor(
          Math.random() * (config.fileSize.max - config.fileSize.min),
        ) + config.fileSize.min;
      const fileType =
        config.fileTypes[Math.floor(Math.random() * config.fileTypes.length)];
      const extension = this.getExtensionFromMimeType(fileType);

      const buffer = new ArrayBuffer(size);
      const view = new Uint8Array(buffer);

      // Fill with random data
      for (let j = 0; j < size; j++) {
        view[j] = Math.floor(Math.random() * 256);
      }

      const file = new File([buffer], `test-file-${i}.${extension}`, {
        type: fileType,
      });
      files.push(file);
    }

    return files;
  }

  private buildConfigFromScenario(
    scenario: UploadTestScenario,
  ): LoadTestConfig {
    const baseConfig: LoadTestConfig = {
      concurrentUsers: scenario.userCount,
      testDuration: scenario.duration,
      rampUpTime: scenario.duration * 0.1, // 10% of test duration for ramp up
      fileSize: this.getFileSizeFromPattern(scenario.filePattern),
      fileTypes: ['image/jpeg', 'image/png', 'image/webp'],
      targetEndpoint: '/api/branding/upload',
      expectedResponseTime: 2000,
      successRate: 95,
    };

    // Adjust based on upload pattern
    switch (scenario.uploadPattern) {
      case 'burst':
        baseConfig.rampUpTime = scenario.duration * 0.05; // Faster ramp up
        break;
      case 'spike':
        baseConfig.rampUpTime = scenario.duration * 0.02; // Very fast ramp up
        break;
      case 'gradual':
        baseConfig.rampUpTime = scenario.duration * 0.3; // Slower ramp up
        break;
    }

    return baseConfig;
  }

  private getFileSizeFromPattern(pattern: string): {
    min: number;
    max: number;
  } {
    switch (pattern) {
      case 'small':
        return { min: 10 * 1024, max: 100 * 1024 }; // 10KB - 100KB
      case 'large':
        return { min: 1024 * 1024, max: 10 * 1024 * 1024 }; // 1MB - 10MB
      case 'mixed':
        return { min: 10 * 1024, max: 5 * 1024 * 1024 }; // 10KB - 5MB
      case 'progressive':
        return { min: 100 * 1024, max: 2 * 1024 * 1024 }; // 100KB - 2MB
      default:
        return { min: 50 * 1024, max: 500 * 1024 }; // 50KB - 500KB
    }
  }

  private calculateFinalResults(
    result: LoadTestResult,
    responseTimes: number[],
    config: LoadTestConfig,
  ): void {
    if (responseTimes.length === 0) return;

    responseTimes.sort((a, b) => a - b);

    result.averageResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    result.minResponseTime = responseTimes[0];
    result.maxResponseTime = responseTimes[responseTimes.length - 1];
    result.errorRate = (result.failedRequests / result.totalRequests) * 100;

    const testDurationSeconds =
      (result.endTime.getTime() - result.startTime.getTime()) / 1000;
    result.requestsPerSecond = result.totalRequests / testDurationSeconds;

    // Calculate percentiles
    result.percentiles = {
      p50: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p90: responseTimes[Math.floor(responseTimes.length * 0.9)],
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)],
    };

    // Estimate throughput (placeholder - would need actual file sizes)
    result.throughput =
      (result.successfulRequests * 500 * 1024) / testDurationSeconds; // Assume 500KB average
  }

  private getCurrentMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
    }
    return 0;
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensions = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return extensions[mimeType as keyof typeof extensions] || 'bin';
  }

  private generateTestId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private exportToCSV(): string {
    const headers = [
      'testId',
      'startTime',
      'endTime',
      'totalRequests',
      'successfulRequests',
      'failedRequests',
      'averageResponseTime',
      'requestsPerSecond',
      'errorRate',
    ];

    const rows = this.results.map((result) => [
      result.testId,
      result.startTime.toISOString(),
      result.endTime.toISOString(),
      result.totalRequests,
      result.successfulRequests,
      result.failedRequests,
      result.averageResponseTime.toFixed(2),
      result.requestsPerSecond.toFixed(2),
      result.errorRate.toFixed(2),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private exportToHTML(): string {
    const htmlContent = this.results
      .map(
        (result) => `
      <div class="test-result">
        <h3>Test ${result.testId}</h3>
        <p><strong>Duration:</strong> ${result.startTime.toLocaleString()} - ${result.endTime.toLocaleString()}</p>
        <p><strong>Requests:</strong> ${result.successfulRequests}/${result.totalRequests} (${(100 - result.errorRate).toFixed(1)}% success)</p>
        <p><strong>Performance:</strong> ${result.averageResponseTime.toFixed(2)}ms avg, ${result.requestsPerSecond.toFixed(2)} req/s</p>
        <p><strong>Percentiles:</strong> P50: ${result.percentiles.p50}ms, P95: ${result.percentiles.p95}ms, P99: ${result.percentiles.p99}ms</p>
      </div>
    `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head><title>Load Test Results</title></head>
      <body>
        <h1>Branding Upload Load Test Results</h1>
        ${htmlContent}
      </body>
      </html>
    `;
  }
}

// Predefined test scenarios
export const BRANDING_TEST_SCENARIOS: UploadTestScenario[] = [
  {
    name: 'Basic Load Test',
    description: 'Standard load test with mixed file sizes',
    userCount: 10,
    duration: 60000, // 1 minute
    uploadPattern: 'constant',
    filePattern: 'mixed',
  },
  {
    name: 'Mobile Peak Traffic',
    description: 'Simulate mobile users uploading during peak hours',
    userCount: 25,
    duration: 120000, // 2 minutes
    uploadPattern: 'burst',
    filePattern: 'small',
  },
  {
    name: 'Large File Stress Test',
    description: 'Test with high-resolution logo uploads',
    userCount: 5,
    duration: 180000, // 3 minutes
    uploadPattern: 'gradual',
    filePattern: 'large',
  },
  {
    name: 'Weekend Wedding Spike',
    description: 'Simulate Saturday wedding day traffic spike',
    userCount: 50,
    duration: 300000, // 5 minutes
    uploadPattern: 'spike',
    filePattern: 'mixed',
  },
];

export const loadTestingSystem = LoadTestingSystem.getInstance();
