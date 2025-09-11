#!/usr/bin/env tsx

/**
 * API Authentication Load Testing Script
 * Tests API authentication performance under load to ensure security doesn't compromise performance
 * 
 * USAGE: npm run test:security:load
 */

import { randomUUID } from 'crypto';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  requestsPerUser: number;
  testDuration: number; // seconds
  rampUpTime: number; // seconds
  endpoints: TestEndpoint[];
}

interface TestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requiresAuth: boolean;
  expectedStatus: number[];
  payload?: any;
  weight: number; // Probability weight for endpoint selection
}

interface LoadTestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  authFailures: number;
  timeoutFailures: number;
  networkFailures: number;
  statusCodes: Record<number, number>;
}

interface LoadTestReport {
  timestamp: Date;
  config: LoadTestConfig;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  totalDuration: number;
  totalRequests: number;
  totalSuccessful: number;
  totalFailed: number;
  overallRPS: number;
  overallErrorRate: number;
  averageResponseTime: number;
  results: LoadTestResult[];
  authenticationMetrics: {
    totalAuthRequests: number;
    successfulAuth: number;
    failedAuth: number;
    averageAuthTime: number;
    authTimeouts: number;
  };
  performanceThresholds: {
    maxResponseTime: number;
    maxErrorRate: number;
    minRequestsPerSecond: number;
  };
  issues: string[];
}

class APIAuthenticationLoadTester {
  private config: LoadTestConfig;
  private results: Map<string, LoadTestResult> = new Map();
  private authTokens: string[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(config?: Partial<LoadTestConfig>) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      concurrentUsers: 10,
      requestsPerUser: 50,
      testDuration: 60, // 1 minute
      rampUpTime: 10, // 10 seconds
      endpoints: [
        // Authentication endpoints
        {
          path: '/api/auth/signin',
          method: 'POST',
          requiresAuth: false,
          expectedStatus: [200, 401],
          payload: {
            email: 'test@example.com',
            password: 'wrongpassword'
          },
          weight: 0.1 // 10% of requests
        },
        
        // Protected API endpoints
        {
          path: '/api/clients',
          method: 'GET',
          requiresAuth: true,
          expectedStatus: [200, 401],
          weight: 0.25 // 25% of requests
        },
        
        {
          path: '/api/suppliers',
          method: 'GET',
          requiresAuth: true,
          expectedStatus: [200, 401],
          weight: 0.2 // 20% of requests
        },
        
        {
          path: '/api/forms',
          method: 'GET',
          requiresAuth: true,
          expectedStatus: [200, 401],
          weight: 0.15 // 15% of requests
        },
        
        {
          path: '/api/clients',
          method: 'POST',
          requiresAuth: true,
          expectedStatus: [201, 400, 401],
          payload: {
            first_name: 'Load',
            last_name: 'Test',
            email: `loadtest-${randomUUID()}@example.com`
          },
          weight: 0.1 // 10% of requests
        },
        
        {
          path: '/api/forms',
          method: 'POST',
          requiresAuth: true,
          expectedStatus: [201, 400, 401],
          payload: {
            title: `Load Test Form ${Date.now()}`,
            description: 'Test form for load testing',
            schema: { fields: [] }
          },
          weight: 0.1 // 10% of requests
        },
        
        // Public endpoints (should handle high load)
        {
          path: '/api/health',
          method: 'GET',
          requiresAuth: false,
          expectedStatus: [200],
          weight: 0.1 // 10% of requests
        }
      ],
      ...config
    };

    this.initializeResults();
  }

  /**
   * Initialize result tracking for all endpoints
   */
  private initializeResults(): void {
    this.config.endpoints.forEach(endpoint => {
      const key = `${endpoint.method} ${endpoint.path}`;
      this.results.set(key, {
        endpoint: endpoint.path,
        method: endpoint.method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        minResponseTime: Number.MAX_SAFE_INTEGER,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        requestsPerSecond: 0,
        errorRate: 0,
        authFailures: 0,
        timeoutFailures: 0,
        networkFailures: 0,
        statusCodes: {}
      });
    });
  }

  /**
   * Run the complete load test suite
   */
  async runLoadTest(): Promise<LoadTestReport> {
    console.log('🚀 Starting API Authentication Load Test...\n');
    
    console.log(`Configuration:`);
    console.log(`  • Base URL: ${this.config.baseUrl}`);
    console.log(`  • Concurrent Users: ${this.config.concurrentUsers}`);
    console.log(`  • Requests per User: ${this.config.requestsPerUser}`);
    console.log(`  • Test Duration: ${this.config.testDuration}s`);
    console.log(`  • Ramp-up Time: ${this.config.rampUpTime}s\n`);

    try {
      this.startTime = Date.now();

      // Generate test authentication tokens (simulate valid sessions)
      await this.generateTestTokens();

      // Run concurrent load test
      await this.runConcurrentLoadTest();

      this.endTime = Date.now();

      // Generate and return report
      const report = this.generateReport();
      this.printReport(report);

      return report;

    } catch (error) {
      console.error('❌ Load test execution failed:', error);
      this.endTime = Date.now();
      throw error;
    }
  }

  /**
   * Generate test authentication tokens (simulate authenticated sessions)
   */
  private async generateTestTokens(): Promise<void> {
    console.log('🔑 Generating test authentication tokens...');

    // For testing purposes, we'll use mock tokens
    // In a real scenario, these would be valid JWT tokens from actual authentication
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      this.authTokens.push(`mock-jwt-token-${i}-${randomUUID()}`);
    }

    console.log(`✅ Generated ${this.authTokens.length} test tokens\n`);
  }

  /**
   * Run concurrent load test with multiple virtual users
   */
  private async runConcurrentLoadTest(): Promise<void> {
    console.log('🏃‍♂️ Starting concurrent load test...\n');

    const promises: Promise<void>[] = [];
    const rampUpDelay = (this.config.rampUpTime * 1000) / this.config.concurrentUsers;

    for (let i = 0; i < this.config.concurrentUsers; i++) {
      const delay = i * rampUpDelay;
      const userToken = this.authTokens[i];
      
      promises.push(
        new Promise(async (resolve) => {
          // Stagger user start times (ramp-up)
          await new Promise(r => setTimeout(r, delay));
          
          await this.simulateUser(i, userToken);
          resolve();
        })
      );
    }

    // Wait for all virtual users to complete
    await Promise.all(promises);

    console.log('\n✅ All virtual users completed');
  }

  /**
   * Simulate a virtual user making API requests
   */
  private async simulateUser(userId: number, authToken: string): Promise<void> {
    const userStartTime = Date.now();
    const testEndTime = userStartTime + (this.config.testDuration * 1000);
    let requestCount = 0;

    console.log(`👤 User ${userId} started`);

    while (Date.now() < testEndTime && requestCount < this.config.requestsPerUser) {
      try {
        // Select random endpoint based on weights
        const endpoint = this.selectRandomEndpoint();
        
        // Make API request
        await this.makeAPIRequest(endpoint, authToken);
        
        requestCount++;

        // Brief delay between requests (simulate realistic usage)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // 50-150ms

      } catch (error) {
        console.error(`User ${userId} request failed:`, error);
      }
    }

    console.log(`👤 User ${userId} completed ${requestCount} requests`);
  }

  /**
   * Select random endpoint based on configured weights
   */
  private selectRandomEndpoint(): TestEndpoint {
    const totalWeight = this.config.endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    // Fallback to first endpoint
    return this.config.endpoints[0];
  }

  /**
   * Make an API request and record metrics
   */
  private async makeAPIRequest(endpoint: TestEndpoint, authToken: string): Promise<void> {
    const key = `${endpoint.method} ${endpoint.path}`;
    const result = this.results.get(key)!;
    
    const startTime = Date.now();
    let response: Response | null = null;
    let error: any = null;

    try {
      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication if required
      if (endpoint.requiresAuth) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Make the request
      response = await fetch(`${this.config.baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers,
        body: endpoint.payload ? JSON.stringify(endpoint.payload) : undefined,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Record metrics
      result.totalRequests++;
      
      if (endpoint.expectedStatus.includes(response.status)) {
        result.successfulRequests++;
      } else {
        result.failedRequests++;
        
        // Track specific failure types
        if (response.status === 401) {
          result.authFailures++;
        }
      }

      // Record response time
      result.minResponseTime = Math.min(result.minResponseTime, responseTime);
      result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);
      
      // Update average response time
      const totalTime = result.averageResponseTime * (result.totalRequests - 1) + responseTime;
      result.averageResponseTime = totalTime / result.totalRequests;

      // Record status code
      result.statusCodes[response.status] = (result.statusCodes[response.status] || 0) + 1;

    } catch (error_) {
      error = error_;
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      result.totalRequests++;
      result.failedRequests++;

      // Categorize error types
      if (error_.name === 'AbortError') {
        result.timeoutFailures++;
      } else {
        result.networkFailures++;
      }

      // Still record response time for failed requests
      result.minResponseTime = Math.min(result.minResponseTime, responseTime);
      result.maxResponseTime = Math.max(result.maxResponseTime, responseTime);
      
      const totalTime = result.averageResponseTime * (result.totalRequests - 1) + responseTime;
      result.averageResponseTime = totalTime / result.totalRequests;
    }
  }

  /**
   * Generate comprehensive load test report
   */
  private generateReport(): LoadTestReport {
    const totalDuration = (this.endTime - this.startTime) / 1000; // seconds
    
    // Calculate overall metrics
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalResponseTime = 0;
    let authRequests = 0;
    let authSuccessful = 0;
    let authFailed = 0;
    let totalAuthTime = 0;
    let authTimeouts = 0;

    // Finalize results for each endpoint
    this.results.forEach((result, key) => {
      if (result.totalRequests > 0) {
        // Calculate derived metrics
        result.requestsPerSecond = result.totalRequests / totalDuration;
        result.errorRate = (result.failedRequests / result.totalRequests) * 100;
        
        // Fix min response time if no requests were made
        if (result.minResponseTime === Number.MAX_SAFE_INTEGER) {
          result.minResponseTime = 0;
        }

        // Update totals
        totalRequests += result.totalRequests;
        totalSuccessful += result.successfulRequests;
        totalFailed += result.failedRequests;
        totalResponseTime += result.averageResponseTime * result.totalRequests;

        // Track auth-related metrics
        const [method, path] = key.split(' ');
        if (path.includes('/auth/') || result.authFailures > 0) {
          authRequests += result.totalRequests;
          authSuccessful += result.successfulRequests;
          authFailed += result.authFailures;
          totalAuthTime += result.averageResponseTime * result.totalRequests;
          authTimeouts += result.timeoutFailures;
        }
      }
    });

    const overallRPS = totalRequests / totalDuration;
    const overallErrorRate = totalRequests > 0 ? (totalFailed / totalRequests) * 100 : 0;
    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    // Performance thresholds
    const thresholds = {
      maxResponseTime: 2000, // 2 seconds
      maxErrorRate: 5, // 5%
      minRequestsPerSecond: 10 // 10 RPS minimum
    };

    // Identify issues
    const issues: string[] = [];
    
    if (averageResponseTime > thresholds.maxResponseTime) {
      issues.push(`Average response time (${averageResponseTime.toFixed(0)}ms) exceeds threshold (${thresholds.maxResponseTime}ms)`);
    }
    
    if (overallErrorRate > thresholds.maxErrorRate) {
      issues.push(`Error rate (${overallErrorRate.toFixed(1)}%) exceeds threshold (${thresholds.maxErrorRate}%)`);
    }
    
    if (overallRPS < thresholds.minRequestsPerSecond) {
      issues.push(`Requests per second (${overallRPS.toFixed(1)}) below minimum threshold (${thresholds.minRequestsPerSecond})`);
    }

    // Check for authentication issues
    const authFailureRate = authRequests > 0 ? (authFailed / authRequests) * 100 : 0;
    if (authFailureRate > 10) { // More than 10% auth failures
      issues.push(`High authentication failure rate (${authFailureRate.toFixed(1)}%)`);
    }

    // Determine overall status
    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';
    if (issues.length > 0) {
      overallStatus = overallErrorRate > 10 || averageResponseTime > 5000 ? 'FAIL' : 'WARNING';
    }

    return {
      timestamp: new Date(),
      config: this.config,
      overallStatus,
      totalDuration,
      totalRequests,
      totalSuccessful,
      totalFailed,
      overallRPS,
      overallErrorRate,
      averageResponseTime,
      results: Array.from(this.results.values()),
      authenticationMetrics: {
        totalAuthRequests: authRequests,
        successfulAuth: authSuccessful,
        failedAuth: authFailed,
        averageAuthTime: authRequests > 0 ? totalAuthTime / authRequests : 0,
        authTimeouts
      },
      performanceThresholds: thresholds,
      issues
    };
  }

  /**
   * Print comprehensive load test report
   */
  private printReport(report: LoadTestReport): void {
    console.log('\n📊 API Authentication Load Test Report');
    console.log('=======================================');
    console.log(`Overall Status: ${report.overallStatus}`);
    console.log(`Test Duration: ${report.totalDuration.toFixed(1)}s`);
    console.log(`Total Requests: ${report.totalRequests}`);
    console.log(`Successful: ${report.totalSuccessful} (${((report.totalSuccessful/report.totalRequests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${report.totalFailed} (${report.overallErrorRate.toFixed(1)}%)`);
    console.log(`Overall RPS: ${report.overallRPS.toFixed(1)}`);
    console.log(`Average Response Time: ${report.averageResponseTime.toFixed(0)}ms`);

    // Authentication metrics
    if (report.authenticationMetrics.totalAuthRequests > 0) {
      console.log('\n🔐 Authentication Metrics:');
      console.log(`Auth Requests: ${report.authenticationMetrics.totalAuthRequests}`);
      console.log(`Auth Success Rate: ${((report.authenticationMetrics.successfulAuth/report.authenticationMetrics.totalAuthRequests)*100).toFixed(1)}%`);
      console.log(`Auth Failures: ${report.authenticationMetrics.failedAuth}`);
      console.log(`Auth Timeouts: ${report.authenticationMetrics.authTimeouts}`);
      console.log(`Average Auth Time: ${report.authenticationMetrics.averageAuthTime.toFixed(0)}ms`);
    }

    // Issues
    if (report.issues.length > 0) {
      console.log('\n⚠️ Issues Detected:');
      report.issues.forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }

    // Detailed endpoint results
    console.log('\n📈 Endpoint Performance:');
    console.log('Endpoint'.padEnd(25) + 'Method'.padEnd(8) + 'Requests'.padEnd(10) + 'Success%'.padEnd(10) + 'Avg Time'.padEnd(10) + 'RPS'.padEnd(8) + 'Status');
    console.log('-'.repeat(90));

    report.results.forEach(result => {
      if (result.totalRequests > 0) {
        const successRate = ((result.successfulRequests / result.totalRequests) * 100).toFixed(1);
        const status = result.errorRate > 10 ? '❌' : result.errorRate > 5 ? '⚠️' : '✅';
        
        console.log(
          result.endpoint.padEnd(25) +
          result.method.padEnd(8) +
          result.totalRequests.toString().padEnd(10) +
          `${successRate}%`.padEnd(10) +
          `${result.averageResponseTime.toFixed(0)}ms`.padEnd(10) +
          result.requestsPerSecond.toFixed(1).padEnd(8) +
          status
        );
      }
    });

    // Performance thresholds
    console.log('\n📏 Performance Thresholds:');
    console.log(`Max Response Time: ${report.performanceThresholds.maxResponseTime}ms`);
    console.log(`Max Error Rate: ${report.performanceThresholds.maxErrorRate}%`);
    console.log(`Min Requests/Second: ${report.performanceThresholds.minRequestsPerSecond}`);

    if (report.overallStatus === 'PASS') {
      console.log('\n✅ API authentication performance is satisfactory under load');
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️ API authentication performance has some concerns');
    } else {
      console.log('\n❌ API authentication performance issues detected - optimization needed');
    }
  }

  /**
   * Save report to file
   */
  private async saveReport(report: LoadTestReport): Promise<void> {
    const fs = await import('fs/promises');
    const reportPath = `api-auth-load-test-report-${Date.now()}.json`;
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Run load test with custom configuration
   */
  async runWithConfig(config: Partial<LoadTestConfig>): Promise<LoadTestReport> {
    this.config = { ...this.config, ...config };
    this.initializeResults();
    
    const report = await this.runLoadTest();
    await this.saveReport(report);
    
    return report;
  }
}

// Predefined test configurations
const TEST_CONFIGS = {
  light: {
    concurrentUsers: 5,
    requestsPerUser: 20,
    testDuration: 30
  },
  moderate: {
    concurrentUsers: 20,
    requestsPerUser: 50,
    testDuration: 60
  },
  heavy: {
    concurrentUsers: 50,
    requestsPerUser: 100,
    testDuration: 120
  },
  spike: {
    concurrentUsers: 100,
    requestsPerUser: 10,
    testDuration: 30,
    rampUpTime: 5
  }
};

// Main execution
async function main() {
  const testType = process.argv[2] || 'moderate';
  
  if (!TEST_CONFIGS[testType as keyof typeof TEST_CONFIGS]) {
    console.error('❌ Invalid test type. Available: light, moderate, heavy, spike');
    process.exit(1);
  }

  console.log(`🎯 Running ${testType} load test configuration\n`);
  
  const tester = new APIAuthenticationLoadTester();
  
  try {
    const config = TEST_CONFIGS[testType as keyof typeof TEST_CONFIGS];
    const report = await tester.runWithConfig(config);
    
    // Exit with appropriate code
    if (report.overallStatus === 'FAIL') {
      console.log('\n💥 Load test failed - performance optimization required');
      process.exit(1);
    } else if (report.overallStatus === 'WARNING') {
      console.log('\n⚠️ Load test completed with warnings');
      process.exit(0);
    } else {
      console.log('\n🎉 Load test passed successfully');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Load test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { APIAuthenticationLoadTester, type LoadTestConfig, type LoadTestReport };