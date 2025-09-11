#!/usr/bin/env tsx

import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  CONCURRENT_USERS: parseInt(process.env.STRESS_TEST_USERS || '10000'),
  TEST_DURATION: parseInt(process.env.STRESS_TEST_DURATION || '300'), // 5 minutes
  RAMP_UP_TIME: parseInt(process.env.STRESS_TEST_RAMP_UP || '60'), // 1 minute
  RESULTS_DIR: path.join(process.cwd(), 'stress-test-results'),
};

interface TestMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  error?: string;
  userType: 'client' | 'vendor' | 'admin';
  scenario: string;
}

interface TestSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  endpoints: { [key: string]: EndpointMetrics };
}

interface EndpointMetrics {
  count: number;
  avgResponseTime: number;
  errorCount: number;
  errorRate: number;
}

class StressTestRunner {
  private metrics: TestMetrics[] = [];
  private activeWorkers: Worker[] = [];
  private startTime: number = 0;
  private supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  constructor() {
    this.ensureResultsDirectory();
  }

  private ensureResultsDirectory() {
    if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
      fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
    }
  }

  async run(): Promise<void> {
    console.log('🚀 Starting WedSync Stress Test');
    console.log(`📊 Configuration:`);
    console.log(`   - Concurrent Users: ${CONFIG.CONCURRENT_USERS}`);
    console.log(`   - Test Duration: ${CONFIG.TEST_DURATION}s`);
    console.log(`   - Ramp-up Time: ${CONFIG.RAMP_UP_TIME}s`);
    console.log(`   - Target URL: ${CONFIG.BASE_URL}`);
    
    this.startTime = performance.now();
    
    try {
      // Pre-test health check
      await this.performHealthCheck();
      
      // Database baseline metrics
      await this.captureBaselineMetrics();
      
      // Start stress test
      await this.executeStressTest();
      
      // Generate reports
      await this.generateReports();
      
    } catch (error) {
      console.error('❌ Stress test failed:', error);
      process.exit(1);
    }
  }

  private async performHealthCheck(): Promise<void> {
    console.log('🔍 Performing health check...');
    
    const healthResponse = await fetch(`${CONFIG.BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    
    console.log('✅ Health check passed');
  }

  private async captureBaselineMetrics(): Promise<void> {
    console.log('📈 Capturing baseline metrics...');
    
    const baseline = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      testConfig: CONFIG
    };

    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, 'baseline-metrics.json'),
      JSON.stringify(baseline, null, 2)
    );
    
    console.log('✅ Baseline metrics captured');
  }

  private async executeStressTest(): Promise<void> {
    console.log('🔥 Starting stress test execution...');
    
    const usersPerSecond = CONFIG.CONCURRENT_USERS / CONFIG.RAMP_UP_TIME;
    let currentUsers = 0;
    
    // Ramp-up phase
    const rampUpInterval = setInterval(() => {
      const usersToAdd = Math.min(usersPerSecond, CONFIG.CONCURRENT_USERS - currentUsers);
      
      for (let i = 0; i < usersToAdd; i++) {
        this.startUserSimulation(currentUsers + i);
      }
      
      currentUsers += usersToAdd;
      console.log(`📈 Ramped up to ${currentUsers} concurrent users`);
      
      if (currentUsers >= CONFIG.CONCURRENT_USERS) {
        clearInterval(rampUpInterval);
        console.log(`🎯 Target load reached: ${CONFIG.CONCURRENT_USERS} users`);
      }
    }, 1000);

    // Test duration
    await new Promise(resolve => {
      setTimeout(() => {
        console.log('⏱️ Test duration completed, stopping simulation...');
        this.stopAllWorkers();
        resolve(void 0);
      }, (CONFIG.RAMP_UP_TIME + CONFIG.TEST_DURATION) * 1000);
    });
  }

  private async startUserSimulation(userId: number): Promise<void> {
    const scenarios = [
      'client_registration',
      'form_creation', 
      'pdf_upload',
      'payment_flow',
      'vendor_interaction'
    ];
    
    const userTypes = ['client', 'vendor', 'admin'];
    const userType = userTypes[userId % userTypes.length];
    
    // Simulate user behavior every 1-5 seconds
    const interval = setInterval(async () => {
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      await this.simulateUserAction(userId, userType, scenario);
    }, Math.random() * 4000 + 1000);

    // Store interval for cleanup
    this.activeWorkers.push({ terminate: () => clearInterval(interval) } as any);
  }

  private async simulateUserAction(userId: number, userType: string, scenario: string): Promise<void> {
    const startTime = Date.now();
    let endpoint: string;
    let method: string;
    let success = false;
    let statusCode = 0;
    let error: string | undefined;

    try {
      switch (scenario) {
        case 'client_registration':
          endpoint = '/api/clients';
          method = 'POST';
          break;
        case 'form_creation':
          endpoint = '/api/forms';
          method = 'POST';
          break;
        case 'pdf_upload':
          endpoint = '/api/pdf/upload';
          method = 'POST';
          break;
        case 'payment_flow':
          endpoint = '/api/stripe/create-payment-intent';
          method = 'POST';
          break;
        default:
          endpoint = '/api/health';
          method = 'GET';
      }

      const response = await fetch(`${CONFIG.BASE_URL}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
      });
      
      statusCode = response.status;
      success = response.ok;
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const responseTime = Date.now() - startTime;
    
    this.metrics.push({
      timestamp: startTime,
      endpoint,
      method,
      responseTime,
      statusCode,
      success,
      error,
      userType: userType as any,
      scenario
    });
  }

  private stopAllWorkers(): void {
    this.activeWorkers.forEach(worker => {
      if (worker.terminate) worker.terminate();
    });
    this.activeWorkers = [];
  }

  private async generateReports(): Promise<void> {
    console.log('📝 Generating test reports...');
    
    const summary = this.calculateSummary();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Write raw metrics
    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `metrics-${timestamp}.json`),
      JSON.stringify(this.metrics, null, 2)
    );
    
    // Write summary report
    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `summary-${timestamp}.json`),
      JSON.stringify(summary, null, 2)
    );
    
    // Generate HTML report
    await this.generateHtmlReport(summary, timestamp);
    
    console.log('✅ Reports generated successfully');
    console.log(`📁 Results saved to: ${CONFIG.RESULTS_DIR}`);
    
    this.printSummary(summary);
  }

  private calculateSummary(): TestSummary {
    const totalRequests = this.metrics.length;
    const successfulRequests = this.metrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const responseTimes = this.metrics
      .filter(m => m.success)
      .map(m => m.responseTime)
      .sort((a, b) => a - b);
    
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length || 0;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
    
    const testDuration = (performance.now() - this.startTime) / 1000;
    const requestsPerSecond = totalRequests / testDuration;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
    
    // Endpoint breakdown
    const endpoints: { [key: string]: EndpointMetrics } = {};
    
    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpoints[key]) {
        endpoints[key] = { count: 0, avgResponseTime: 0, errorCount: 0, errorRate: 0 };
      }
      
      endpoints[key].count++;
      endpoints[key].avgResponseTime = 
        (endpoints[key].avgResponseTime * (endpoints[key].count - 1) + metric.responseTime) / endpoints[key].count;
      
      if (!metric.success) {
        endpoints[key].errorCount++;
      }
    });
    
    Object.keys(endpoints).forEach(key => {
      endpoints[key].errorRate = (endpoints[key].errorCount / endpoints[key].count) * 100;
    });
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      errorRate,
      endpoints
    };
  }

  private async generateHtmlReport(summary: TestSummary, timestamp: string): Promise<void> {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>WedSync Stress Test Report - ${timestamp}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
            .metric { display: inline-block; margin: 10px; padding: 15px; background: #f9f9f9; border-radius: 4px; }
            .success { color: #27ae60; }
            .warning { color: #f39c12; }
            .error { color: #e74c3c; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>WedSync Stress Test Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>Test Configuration: ${CONFIG.CONCURRENT_USERS} users over ${CONFIG.TEST_DURATION}s</p>
        </div>
        
        <h2>Summary Metrics</h2>
        <div class="metric">
            <strong>Total Requests:</strong><br>
            <span style="font-size: 24px;">${summary.totalRequests.toLocaleString()}</span>
        </div>
        <div class="metric">
            <strong>Success Rate:</strong><br>
            <span class="${summary.errorRate < 1 ? 'success' : summary.errorRate < 5 ? 'warning' : 'error'}" style="font-size: 24px;">
                ${(100 - summary.errorRate).toFixed(2)}%
            </span>
        </div>
        <div class="metric">
            <strong>Avg Response Time:</strong><br>
            <span style="font-size: 24px;">${summary.averageResponseTime.toFixed(0)}ms</span>
        </div>
        <div class="metric">
            <strong>Requests/Second:</strong><br>
            <span style="font-size: 24px;">${summary.requestsPerSecond.toFixed(1)}</span>
        </div>
        
        <h2>Endpoint Performance</h2>
        <table>
            <tr>
                <th>Endpoint</th>
                <th>Requests</th>
                <th>Avg Response Time</th>
                <th>Error Rate</th>
                <th>Status</th>
            </tr>
            ${Object.entries(summary.endpoints).map(([endpoint, metrics]) => `
                <tr>
                    <td>${endpoint}</td>
                    <td>${metrics.count.toLocaleString()}</td>
                    <td>${metrics.avgResponseTime.toFixed(2)}ms</td>
                    <td>${metrics.errorRate.toFixed(2)}%</td>
                    <td class="${metrics.errorRate < 1 ? 'success' : metrics.errorRate < 5 ? 'warning' : 'error'}">
                        ${metrics.errorRate < 1 ? '✅' : metrics.errorRate < 5 ? '⚠️' : '❌'}
                    </td>
                </tr>
            `).join('')}
        </table>
    </body>
    </html>
    `;
    
    fs.writeFileSync(
      path.join(CONFIG.RESULTS_DIR, `report-${timestamp}.html`),
      html
    );
  }

  private printSummary(summary: TestSummary): void {
    console.log('\n🎯 STRESS TEST SUMMARY');
    console.log('========================');
    console.log(`📊 Total Requests: ${summary.totalRequests.toLocaleString()}`);
    console.log(`✅ Successful: ${summary.successfulRequests.toLocaleString()} (${(100 - summary.errorRate).toFixed(2)}%)`);
    console.log(`❌ Failed: ${summary.failedRequests.toLocaleString()} (${summary.errorRate.toFixed(2)}%)`);
    console.log(`⚡ Requests/Second: ${summary.requestsPerSecond.toFixed(1)}`);
    console.log(`⏱️  Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`);
    console.log(`📈 95th Percentile: ${summary.p95ResponseTime.toFixed(2)}ms`);
    console.log(`📈 99th Percentile: ${summary.p99ResponseTime.toFixed(2)}ms`);
    
    console.log('\n🏆 PERFORMANCE ASSESSMENT');
    console.log('==========================');
    
    if (summary.errorRate < 1 && summary.averageResponseTime < 100) {
      console.log('🟢 EXCELLENT - System handles load exceptionally well');
    } else if (summary.errorRate < 5 && summary.averageResponseTime < 500) {
      console.log('🟡 GOOD - System handles load acceptably with room for improvement');
    } else {
      console.log('🔴 NEEDS OPTIMIZATION - System shows signs of stress under load');
    }
    
    console.log(`\n📁 Detailed reports available in: ${CONFIG.RESULTS_DIR}`);
  }
}

// CLI execution
if (require.main === module) {
  const runner = new StressTestRunner();
  runner.run().catch(console.error);
}

export { StressTestRunner };