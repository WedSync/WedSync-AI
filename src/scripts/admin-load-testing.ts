/**
 * Admin Load Testing Suite - WS-229
 * Tests admin quick actions under peak wedding season loads
 * Features: Mobile simulation, concurrent users, performance measurement
 */

import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import { logger } from '@/lib/monitoring/structured-logger';

interface LoadTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  testDurationMinutes: number;
  rampUpSeconds: number;
  adminToken: string;
  mobilePercentage: number; // Percentage of mobile users
  peakLoadMultiplier: number; // Simulate peak wedding season
}

interface TestResult {
  action: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  isMobile: boolean;
  timestamp: number;
  errorMessage?: string;
}

interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughputRPS: number;
  errorRate: number;
  mobileVsDesktopPerformance: {
    mobile: { avgResponseTime: number; errorRate: number };
    desktop: { avgResponseTime: number; errorRate: number };
  };
  actionPerformance: Record<
    string,
    {
      requests: number;
      avgResponseTime: number;
      errorRate: number;
      slowestResponse: number;
    }
  >;
  memoryUsage: {
    peak: number;
    average: number;
    current: number;
  };
}

class AdminLoadTester {
  private config: LoadTestConfig;
  private results: TestResult[] = [];
  private activeUsers: number = 0;
  private testStartTime: number = 0;
  private memoryUsage: number[] = [];

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  async runLoadTest(): Promise<LoadTestMetrics> {
    console.log('🚀 Starting Admin Load Test');
    console.log(`Configuration:`, this.config);

    this.testStartTime = Date.now();

    // Start memory monitoring
    const memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      this.memoryUsage.push(usage.heapUsed / 1024 / 1024); // MB
    }, 1000);

    // Create user simulation promises
    const userPromises: Promise<void>[] = [];
    const totalUsers =
      this.config.concurrentUsers * this.config.peakLoadMultiplier;

    console.log(
      `📈 Simulating ${totalUsers} concurrent users (${Math.round((totalUsers * this.config.mobilePercentage) / 100)} mobile)`,
    );

    // Ramp up users gradually
    const rampUpInterval = (this.config.rampUpSeconds * 1000) / totalUsers;

    for (let i = 0; i < totalUsers; i++) {
      const isMobile = Math.random() < this.config.mobilePercentage / 100;
      const delay = i * rampUpInterval;

      const userPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          this.simulateUser(i, isMobile).finally(resolve);
        }, delay);
      });

      userPromises.push(userPromise);
    }

    // Wait for test duration
    await Promise.race([
      Promise.all(userPromises),
      this.sleep(this.config.testDurationMinutes * 60 * 1000),
    ]);

    clearInterval(memoryMonitor);

    console.log('📊 Analyzing results...');
    return this.analyzeResults();
  }

  private async simulateUser(userId: number, isMobile: boolean): Promise<void> {
    this.activeUsers++;
    const userAgent = isMobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

    const testEndTime =
      this.testStartTime + this.config.testDurationMinutes * 60 * 1000;

    try {
      while (Date.now() < testEndTime) {
        // Simulate typical admin workflow
        await this.executeAdminWorkflow(userId, isMobile, userAgent);

        // Variable delay between actions (1-5 seconds)
        const delay = 1000 + Math.random() * 4000;

        // Peak hours have shorter delays (more frantic admin activity)
        const adjustedDelay = delay / this.config.peakLoadMultiplier;
        await this.sleep(adjustedDelay);
      }
    } catch (error) {
      logger.error(`User ${userId} simulation error`, { error, isMobile });
    } finally {
      this.activeUsers--;
    }
  }

  private async executeAdminWorkflow(
    userId: number,
    isMobile: boolean,
    userAgent: string,
  ): Promise<void> {
    const workflows = [
      // Critical emergency workflow
      ['get-system-status', 'acknowledge-alerts', 'get-system-status'],

      // Performance monitoring workflow
      ['get-system-status', 'get-performance-metrics', 'clear-cache'],

      // User management workflow
      ['get-system-status', 'emergency-user-suspend'],

      // Backup and maintenance workflow
      ['get-system-status', 'emergency-backup', 'maintenance-mode'],

      // Monitoring and recovery workflow
      ['get-system-status', 'get-performance-metrics', 'force-logout-all'],
    ];

    const workflow = workflows[Math.floor(Math.random() * workflows.length)];

    for (const action of workflow) {
      await this.executeAction(action, userId, isMobile, userAgent);

      // Small delay between workflow steps
      await this.sleep(100 + Math.random() * 200);
    }
  }

  private async executeAction(
    action: string,
    userId: number,
    isMobile: boolean,
    userAgent: string,
  ): Promise<void> {
    const startTime = performance.now();
    let result: TestResult = {
      action,
      responseTime: 0,
      statusCode: 0,
      success: false,
      isMobile,
      timestamp: Date.now(),
    };

    try {
      let url: string;
      let method: string;
      let body: any = null;

      // Configure request based on action
      switch (action) {
        case 'get-system-status':
        case 'get-performance-metrics':
          url = `${this.config.baseUrl}/api/admin/quick-actions`;
          method = 'GET';
          break;

        default:
          url = `${this.config.baseUrl}/api/admin/quick-actions`;
          method = 'POST';
          body = JSON.stringify({
            action,
            timestamp: new Date().toISOString(),
            clientInfo: {
              isMobile,
              userAgent,
              viewport: isMobile ? '375x667' : '1920x1080',
              userId: `load-test-${userId}`,
            },
          });
          break;
      }

      const requestOptions: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.adminToken}`,
          'User-Agent': userAgent,
          'X-Test-User-Id': `load-test-${userId}`,
          'X-Test-Mobile': isMobile.toString(),
        },
        timeout: 30000, // 30 second timeout
      };

      if (body) {
        requestOptions.body = body;
      }

      const response = await fetch(url, requestOptions);
      const endTime = performance.now();

      result.responseTime = endTime - startTime;
      result.statusCode = response.status;
      result.success = response.ok;

      if (!response.ok) {
        const errorText = await response.text();
        result.errorMessage = `HTTP ${response.status}: ${errorText}`;
      }
    } catch (error) {
      const endTime = performance.now();
      result.responseTime = endTime - startTime;
      result.statusCode = 0;
      result.success = false;
      result.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
    }

    this.results.push(result);
  }

  private analyzeResults(): LoadTestMetrics {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = this.results
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    const testDurationSeconds = (Date.now() - this.testStartTime) / 1000;
    const throughputRPS = totalRequests / testDurationSeconds;

    const errorRate = (failedRequests / totalRequests) * 100;

    // Mobile vs Desktop performance
    const mobileResults = this.results.filter((r) => r.isMobile);
    const desktopResults = this.results.filter((r) => !r.isMobile);

    const mobileAvgResponseTime =
      mobileResults.length > 0
        ? mobileResults.reduce((sum, r) => sum + r.responseTime, 0) /
          mobileResults.length
        : 0;
    const mobileErrorRate =
      mobileResults.length > 0
        ? (mobileResults.filter((r) => !r.success).length /
            mobileResults.length) *
          100
        : 0;

    const desktopAvgResponseTime =
      desktopResults.length > 0
        ? desktopResults.reduce((sum, r) => sum + r.responseTime, 0) /
          desktopResults.length
        : 0;
    const desktopErrorRate =
      desktopResults.length > 0
        ? (desktopResults.filter((r) => !r.success).length /
            desktopResults.length) *
          100
        : 0;

    // Action-specific performance
    const actionGroups = new Map<string, TestResult[]>();
    this.results.forEach((result) => {
      if (!actionGroups.has(result.action)) {
        actionGroups.set(result.action, []);
      }
      actionGroups.get(result.action)!.push(result);
    });

    const actionPerformance: Record<string, any> = {};
    for (const [action, results] of actionGroups) {
      const actionResponseTimes = results.map((r) => r.responseTime);
      const actionSuccessCount = results.filter((r) => r.success).length;

      actionPerformance[action] = {
        requests: results.length,
        avgResponseTime:
          actionResponseTimes.reduce((sum, rt) => sum + rt, 0) /
          actionResponseTimes.length,
        errorRate:
          ((results.length - actionSuccessCount) / results.length) * 100,
        slowestResponse: Math.max(...actionResponseTimes),
      };
    }

    // Memory usage analysis
    const memoryUsage = {
      peak: Math.max(...this.memoryUsage),
      average:
        this.memoryUsage.reduce((sum, usage) => sum + usage, 0) /
        this.memoryUsage.length,
      current: this.memoryUsage[this.memoryUsage.length - 1] || 0,
    };

    const metrics: LoadTestMetrics = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime: Math.round(p95ResponseTime),
      p99ResponseTime: Math.round(p99ResponseTime),
      throughputRPS: Math.round(throughputRPS * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      mobileVsDesktopPerformance: {
        mobile: {
          avgResponseTime: Math.round(mobileAvgResponseTime),
          errorRate: Math.round(mobileErrorRate * 100) / 100,
        },
        desktop: {
          avgResponseTime: Math.round(desktopAvgResponseTime),
          errorRate: Math.round(desktopErrorRate * 100) / 100,
        },
      },
      actionPerformance,
      memoryUsage: {
        peak: Math.round(memoryUsage.peak),
        average: Math.round(memoryUsage.average),
        current: Math.round(memoryUsage.current),
      },
    };

    this.printResults(metrics);
    return metrics;
  }

  private printResults(metrics: LoadTestMetrics): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ADMIN LOAD TEST RESULTS');
    console.log('='.repeat(80));

    console.log('\n📈 OVERALL PERFORMANCE:');
    console.log(`  Total Requests: ${metrics.totalRequests.toLocaleString()}`);
    console.log(
      `  Successful: ${metrics.successfulRequests.toLocaleString()} (${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  Failed: ${metrics.failedRequests.toLocaleString()} (${metrics.errorRate}%)`,
    );
    console.log(`  Throughput: ${metrics.throughputRPS} requests/second`);

    console.log('\n⏱️ RESPONSE TIMES:');
    console.log(`  Average: ${metrics.averageResponseTime}ms`);
    console.log(`  95th percentile: ${metrics.p95ResponseTime}ms`);
    console.log(`  99th percentile: ${metrics.p99ResponseTime}ms`);

    console.log('\n📱 MOBILE vs DESKTOP:');
    console.log(
      `  Mobile - Avg Response: ${metrics.mobileVsDesktopPerformance.mobile.avgResponseTime}ms, Error Rate: ${metrics.mobileVsDesktopPerformance.mobile.errorRate}%`,
    );
    console.log(
      `  Desktop - Avg Response: ${metrics.mobileVsDesktopPerformance.desktop.avgResponseTime}ms, Error Rate: ${metrics.mobileVsDesktopPerformance.desktop.errorRate}%`,
    );

    console.log('\n🎬 ACTION PERFORMANCE:');
    for (const [action, perf] of Object.entries(metrics.actionPerformance)) {
      console.log(
        `  ${action}: ${perf.requests} requests, ${perf.avgResponseTime}ms avg, ${perf.errorRate.toFixed(1)}% error rate, ${perf.slowestResponse}ms slowest`,
      );
    }

    console.log('\n🧠 MEMORY USAGE:');
    console.log(`  Peak: ${metrics.memoryUsage.peak}MB`);
    console.log(`  Average: ${metrics.memoryUsage.average}MB`);
    console.log(`  Current: ${metrics.memoryUsage.current}MB`);

    // Performance assessment
    console.log('\n🏆 PERFORMANCE ASSESSMENT:');

    const assessments: string[] = [];

    if (metrics.errorRate > 5) {
      assessments.push(
        `❌ HIGH ERROR RATE (${metrics.errorRate}%) - Target: <1%`,
      );
    } else if (metrics.errorRate > 1) {
      assessments.push(`⚠️ Elevated error rate (${metrics.errorRate}%)`);
    } else {
      assessments.push(`✅ Error rate acceptable (${metrics.errorRate}%)`);
    }

    if (metrics.p95ResponseTime > 2000) {
      assessments.push(
        `❌ SLOW P95 RESPONSE TIME (${metrics.p95ResponseTime}ms) - Target: <500ms`,
      );
    } else if (metrics.p95ResponseTime > 500) {
      assessments.push(
        `⚠️ P95 response time above target (${metrics.p95ResponseTime}ms)`,
      );
    } else {
      assessments.push(
        `✅ P95 response time excellent (${metrics.p95ResponseTime}ms)`,
      );
    }

    if (
      metrics.mobileVsDesktopPerformance.mobile.avgResponseTime >
      metrics.mobileVsDesktopPerformance.desktop.avgResponseTime * 1.5
    ) {
      assessments.push(
        `❌ MOBILE PERFORMANCE LAG - Mobile is ${((metrics.mobileVsDesktopPerformance.mobile.avgResponseTime / metrics.mobileVsDesktopPerformance.desktop.avgResponseTime - 1) * 100).toFixed(0)}% slower`,
      );
    } else {
      assessments.push(`✅ Mobile performance comparable to desktop`);
    }

    if (metrics.throughputRPS < 10) {
      assessments.push(
        `❌ LOW THROUGHPUT (${metrics.throughputRPS} RPS) - Target: >50 RPS`,
      );
    } else if (metrics.throughputRPS < 50) {
      assessments.push(
        `⚠️ Throughput below target (${metrics.throughputRPS} RPS)`,
      );
    } else {
      assessments.push(
        `✅ Throughput excellent (${metrics.throughputRPS} RPS)`,
      );
    }

    assessments.forEach((assessment) => console.log(`  ${assessment}`));

    console.log('\n' + '='.repeat(80));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Test configurations for different scenarios
export const testConfigs = {
  // Peak wedding season (May-October Saturdays)
  peakWeddingDay: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    concurrentUsers: 50,
    testDurationMinutes: 10,
    rampUpSeconds: 30,
    adminToken: process.env.ADMIN_TEST_TOKEN || 'test-token',
    mobilePercentage: 70, // Admins often use mobile during events
    peakLoadMultiplier: 3, // 3x normal load during peak
  },

  // Normal business day
  normalDay: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    concurrentUsers: 10,
    testDurationMinutes: 5,
    rampUpSeconds: 15,
    adminToken: process.env.ADMIN_TEST_TOKEN || 'test-token',
    mobilePercentage: 40,
    peakLoadMultiplier: 1,
  },

  // Emergency response scenario
  emergency: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    concurrentUsers: 25,
    testDurationMinutes: 3,
    rampUpSeconds: 5, // Quick ramp up for emergency
    adminToken: process.env.ADMIN_TEST_TOKEN || 'test-token',
    mobilePercentage: 80, // Emergency often handled on mobile
    peakLoadMultiplier: 2,
  },
};

// CLI runner
if (require.main === module) {
  const scenario = process.argv[2] || 'normalDay';
  const config = testConfigs[scenario as keyof typeof testConfigs];

  if (!config) {
    console.error(`Unknown scenario: ${scenario}`);
    console.log('Available scenarios:', Object.keys(testConfigs).join(', '));
    process.exit(1);
  }

  console.log(`Running load test scenario: ${scenario}`);

  const tester = new AdminLoadTester(config);
  tester
    .runLoadTest()
    .then((metrics) => {
      console.log('\n✅ Load test completed successfully');

      // Exit with error code if performance targets not met
      const criticalIssues =
        metrics.errorRate > 5 ||
        metrics.p95ResponseTime > 2000 ||
        metrics.throughputRPS < 10;

      process.exit(criticalIssues ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Load test failed:', error);
      process.exit(1);
    });
}

export { AdminLoadTester, LoadTestMetrics, TestResult };
