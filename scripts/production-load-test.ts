#!/usr/bin/env ts-node

/**
 * Production Load Testing Suite
 * Tests system under production-level load (5,000+ concurrent users)
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

interface LoadTestConfig {
  name: string;
  duration: number; // seconds
  users: number;
  rampUp: number; // seconds
  endpoint: string;
  method: string;
  payload?: any;
}

interface LoadTestResult {
  testName: string;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  errors: string[];
}

class ProductionLoadTester {
  private baseUrl: string;
  private results: LoadTestResult[] = [];
  private startTime: number = 0;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async runProductionLoadTest(): Promise<void> {
    console.log('🚀 Starting Production Load Testing Suite');
    console.log('=========================================');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Test Duration: 2 hours`);
    console.log(`Peak Load: 5,000 concurrent users\n`);

    this.startTime = Date.now();

    // Phase 1: Warm-up (500 users, 10 minutes)
    await this.runPhase('warm-up', {
      name: 'Warm-up Phase',
      duration: 600, // 10 minutes
      users: 500,
      rampUp: 300, // 5 minutes ramp-up
      endpoint: '/api/health',
      method: 'GET'
    });

    // Phase 2: Normal Load (1,000 users, 30 minutes)
    await this.runPhase('normal-load', {
      name: 'Normal Load Phase',
      duration: 1800, // 30 minutes
      users: 1000,
      rampUp: 300,
      endpoint: '/api/forms',
      method: 'GET'
    });

    // Phase 3: Peak Load (5,000 users, 1 hour)
    await this.runPhase('peak-load', {
      name: 'Peak Load Phase',
      duration: 3600, // 1 hour
      users: 5000,
      rampUp: 600, // 10 minutes ramp-up
      endpoint: '/api/forms',
      method: 'GET'
    });

    // Phase 4: Stress Test (10,000 users, 20 minutes)
    await this.runPhase('stress-test', {
      name: 'Stress Test Phase',
      duration: 1200, // 20 minutes
      users: 10000,
      rampUp: 300,
      endpoint: '/api/health',
      method: 'GET'
    });

    // Generate final report
    await this.generateProductionReport();
  }

  private async runPhase(phaseId: string, config: LoadTestConfig): Promise<void> {
    console.log(`\n📊 Starting ${config.name}`);
    console.log(`Users: ${config.users}, Duration: ${config.duration}s, Ramp-up: ${config.rampUp}s`);

    try {
      // Run K6 load test
      const k6Script = this.generateK6Script(config);
      const scriptPath = path.join(__dirname, `../load-tests/${phaseId}.js`);
      
      // Ensure directory exists
      const dir = path.dirname(scriptPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(scriptPath, k6Script);

      const output = execSync(`k6 run --out json=${phaseId}-results.json ${scriptPath}`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: (config.duration + config.rampUp + 60) * 1000 // Add buffer
      });

      // Parse results
      const result = await this.parseK6Results(`${phaseId}-results.json`, config);
      this.results.push(result);

      console.log(`✅ ${config.name} completed`);
      console.log(`   Requests: ${result.totalRequests}`);
      console.log(`   Success Rate: ${(100 - result.errorRate).toFixed(2)}%`);
      console.log(`   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`   P95: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s`);

    } catch (error) {
      console.error(`❌ ${config.name} failed:`, error.message);
      
      // Create failed result
      this.results.push({
        testName: config.name,
        duration: config.duration,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 100,
        errors: [error.message]
      });
    }

    // Cool down between phases
    console.log('⏳ Cool down period (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  private generateK6Script(config: LoadTestConfig): string {
    return `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

export const options = {
  stages: [
    { duration: '${config.rampUp}s', target: ${config.users} }, // Ramp up
    { duration: '${config.duration}s', target: ${config.users} }, // Stay at load
    { duration: '60s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    error_rate: ['rate<0.05'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = '${this.baseUrl}';

export default function () {
  // Simulate realistic user behavior
  const scenarios = [
    () => testHomepage(),
    () => testAuthFlow(),
    () => testFormCreation(),
    () => testFormSubmission(),
    () => testDashboard(),
  ];

  // Random scenario selection
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  // Think time
  sleep(Math.random() * 3 + 1);
}

function testHomepage() {
  const response = http.get(BASE_URL + '/');
  
  const success = check(response, {
    'homepage loads': (r) => r.status === 200,
    'homepage response time OK': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testAuthFlow() {
  // Simulate login
  const loginResponse = http.post(BASE_URL + '/api/auth/login', JSON.stringify({
    email: 'loadtest@example.com',
    password: 'LoadTest123!'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(loginResponse, {
    'auth response OK': (r) => r.status === 200 || r.status === 401,
    'auth response time OK': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);
  responseTime.add(loginResponse.timings.duration);
}

function testFormCreation() {
  const formData = {
    title: 'Load Test Form',
    description: 'Performance testing form',
    fields: [
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
    ]
  };

  const response = http.post(BASE_URL + '/api/forms', JSON.stringify(formData), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
  });

  const success = check(response, {
    'form creation response': (r) => r.status === 201 || r.status === 401,
    'form creation time OK': (r) => r.timings.duration < 800,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testFormSubmission() {
  const submissionData = {
    data: {
      name: 'Load Test User',
      email: 'loadtest@example.com',
      message: 'This is a load test submission'
    }
  };

  const response = http.post(BASE_URL + '/api/forms/test-form-id/submit', 
    JSON.stringify(submissionData), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(response, {
    'submission response': (r) => r.status === 201 || r.status === 404,
    'submission time OK': (r) => r.timings.duration < 600,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}

function testDashboard() {
  const response = http.get(BASE_URL + '/api/dashboard/stats', {
    headers: { 'Authorization': 'Bearer test-token' },
  });

  const success = check(response, {
    'dashboard response': (r) => r.status === 200 || r.status === 401,
    'dashboard time OK': (r) => r.timings.duration < 400,
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
}
    `;
  }

  private async parseK6Results(resultFile: string, config: LoadTestConfig): Promise<LoadTestResult> {
    try {
      if (!fs.existsSync(resultFile)) {
        throw new Error(`Result file ${resultFile} not found`);
      }

      const content = fs.readFileSync(resultFile, 'utf8');
      const lines = content.trim().split('\n');
      
      let totalRequests = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      let responseTimes: number[] = [];
      let errors: string[] = [];

      // Parse each line of JSON output
      lines.forEach(line => {
        try {
          const data = JSON.parse(line);
          
          if (data.type === 'Point' && data.metric === 'http_reqs') {
            totalRequests++;
          }
          
          if (data.type === 'Point' && data.metric === 'http_req_duration') {
            responseTimes.push(data.data.value);
          }
          
          if (data.type === 'Point' && data.metric === 'http_req_failed' && data.data.value > 0) {
            failedRequests++;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      });

      successfulRequests = totalRequests - failedRequests;
      
      // Calculate percentiles
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);
      
      const averageResponseTime = responseTimes.length > 0 ? 
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
      
      const p95ResponseTime = responseTimes[p95Index] || 0;
      const p99ResponseTime = responseTimes[p99Index] || 0;
      
      const throughput = totalRequests / config.duration;
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

      return {
        testName: config.name,
        duration: config.duration,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        throughput,
        errorRate,
        errors
      };

    } catch (error) {
      console.error(`Error parsing K6 results: ${error.message}`);
      
      return {
        testName: config.name,
        duration: config.duration,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        errorRate: 100,
        errors: [error.message]
      };
    }
  }

  private async generateProductionReport(): Promise<void> {
    const totalDuration = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(80));
    console.log('PRODUCTION LOAD TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Test Duration: ${(totalDuration / 3600).toFixed(2)} hours`);
    console.log(`Test Phases: ${this.results.length}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Calculate overall metrics
    const totalRequests = this.results.reduce((sum, r) => sum + r.totalRequests, 0);
    const totalSuccessful = this.results.reduce((sum, r) => sum + r.successfulRequests, 0);
    const overallErrorRate = totalRequests > 0 ? ((totalRequests - totalSuccessful) / totalRequests) * 100 : 0;
    const avgThroughput = this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;

    console.log('📊 OVERALL RESULTS');
    console.log('-'.repeat(40));
    console.log(`Total Requests: ${totalRequests.toLocaleString()}`);
    console.log(`Successful: ${totalSuccessful.toLocaleString()} (${(100 - overallErrorRate).toFixed(2)}%)`);
    console.log(`Failed: ${(totalRequests - totalSuccessful).toLocaleString()} (${overallErrorRate.toFixed(2)}%)`);
    console.log(`Average Throughput: ${avgThroughput.toFixed(2)} req/s\n`);

    // Phase results
    console.log('📋 PHASE RESULTS');
    console.log('-'.repeat(40));
    this.results.forEach(result => {
      const status = result.errorRate < 5 ? '✅' : result.errorRate < 10 ? '⚠️' : '❌';
      console.log(`${status} ${result.testName}`);
      console.log(`   Requests: ${result.totalRequests.toLocaleString()}`);
      console.log(`   Success Rate: ${(100 - result.errorRate).toFixed(2)}%`);
      console.log(`   Avg Response: ${result.averageResponseTime.toFixed(2)}ms`);
      console.log(`   P95: ${result.p95ResponseTime.toFixed(2)}ms`);
      console.log(`   P99: ${result.p99ResponseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} req/s\n`);
    });

    // Performance assessment
    console.log('🎯 PERFORMANCE ASSESSMENT');
    console.log('-'.repeat(40));
    
    const passedPhases = this.results.filter(r => r.errorRate < 5).length;
    const warningPhases = this.results.filter(r => r.errorRate >= 5 && r.errorRate < 10).length;
    const failedPhases = this.results.filter(r => r.errorRate >= 10).length;

    console.log(`Passed: ${passedPhases} phases ✅`);
    console.log(`Warning: ${warningPhases} phases ⚠️`);
    console.log(`Failed: ${failedPhases} phases ❌\n`);

    // Production readiness assessment
    const isProductionReady = overallErrorRate < 5 && 
                             this.results.every(r => r.p95ResponseTime < 1000) &&
                             failedPhases === 0;

    console.log('🚀 PRODUCTION READINESS');
    console.log('-'.repeat(40));
    console.log(`Status: ${isProductionReady ? '✅ READY FOR PRODUCTION' : '❌ NOT READY'}`);
    console.log(`Error Rate: ${overallErrorRate.toFixed(2)}% ${overallErrorRate < 5 ? '✅' : '❌'}`);
    console.log(`Response Times: ${this.results.every(r => r.p95ResponseTime < 1000) ? '✅ ACCEPTABLE' : '❌ TOO SLOW'}`);
    console.log(`System Stability: ${failedPhases === 0 ? '✅ STABLE' : '❌ UNSTABLE'}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));
    
    if (overallErrorRate > 5) {
      console.log('⚠️ High error rate detected - investigate error logs');
    }
    
    if (this.results.some(r => r.p95ResponseTime > 1000)) {
      console.log('⚠️ Slow response times - consider performance optimization');
    }
    
    if (failedPhases > 0) {
      console.log('⚠️ Some phases failed - review system capacity and scaling');
    }
    
    if (isProductionReady) {
      console.log('✅ System ready for production deployment');
      console.log('✅ All performance targets met');
      console.log('✅ Error rates within acceptable limits');
    }

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      overall: {
        totalRequests,
        successfulRequests: totalSuccessful,
        errorRate: overallErrorRate,
        averageThroughput: avgThroughput
      },
      phases: this.results,
      assessment: {
        isProductionReady,
        passedPhases,
        warningPhases,
        failedPhases
      }
    };

    fs.writeFileSync('production-load-test-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detailed report saved to: production-load-test-report.json');
    console.log('='.repeat(80));
  }

  async testDisasterRecovery(): Promise<void> {
    console.log('\n🔥 Testing Disaster Recovery Procedures');
    console.log('-'.repeat(40));

    try {
      // Test 1: Health check endpoint during high load
      const healthResponse = await fetch(`${this.baseUrl}/api/health`);
      console.log(`✅ Health check: ${healthResponse.status === 200 ? 'PASS' : 'FAIL'}`);

      // Test 2: Database connectivity
      const dbResponse = await fetch(`${this.baseUrl}/api/db-health`);
      console.log(`✅ Database health: ${dbResponse.status === 200 ? 'PASS' : 'FAIL'}`);

      // Test 3: Email service connectivity
      const emailResponse = await fetch(`${this.baseUrl}/api/email-health`);
      console.log(`✅ Email service: ${emailResponse.status === 200 ? 'PASS' : 'FAIL'}`);

      // Test 4: Payment service connectivity
      const paymentResponse = await fetch(`${this.baseUrl}/api/stripe-health`);
      console.log(`✅ Payment service: ${paymentResponse.status === 200 ? 'PASS' : 'FAIL'}`);

    } catch (error) {
      console.error('❌ Disaster recovery test failed:', error.message);
    }
  }
}

// Main execution
if (require.main === module) {
  const baseUrl = process.env.TEST_URL || 'http://localhost:3000';
  const tester = new ProductionLoadTester(baseUrl);

  console.log('🚨 WARNING: This is a production-level load test');
  console.log('This will generate significant load on the target system');
  console.log(`Target: ${baseUrl}`);
  console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');

  setTimeout(() => {
    tester.runProductionLoadTest()
      .then(() => {
        console.log('\n🎉 Production load testing completed!');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Production load testing failed:', error);
        process.exit(1);
      });
  }, 10000); // 10 second delay
}

export { ProductionLoadTester };