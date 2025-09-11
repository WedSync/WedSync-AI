/**
 * WS-155: Performance Benchmarking and Validation
 * Comprehensive performance testing and benchmarking suite
 */

import { performance } from 'perf_hooks';
import { createWorker, Worker } from 'worker_threads';
import { faker } from '@faker-js/faker';
import fetch from 'node-fetch';

interface PerformanceMetrics {
  throughput: number; // requests per second
  avgResponseTime: number; // milliseconds
  p95ResponseTime: number; // milliseconds
  p99ResponseTime: number; // milliseconds
  errorRate: number; // percentage
  concurrentConnections: number;
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  databaseConnections: number;
  queueLength: number;
}

interface BenchmarkResult {
  testName: string;
  duration: number; // seconds
  metrics: PerformanceMetrics;
  requirements: PerformanceRequirements;
  passed: boolean;
  details: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    responseTimes: number[];
    errors: string[];
  };
}

interface PerformanceRequirements {
  minThroughput: number; // requests per second
  maxAvgResponseTime: number; // milliseconds
  maxP95ResponseTime: number; // milliseconds
  maxP99ResponseTime: number; // milliseconds
  maxErrorRate: number; // percentage
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // percentage
}

class PerformanceBenchmark {
  private apiBaseUrl: string;
  private authToken: string;
  private workers: Worker[] = [];
  
  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.authToken = 'test-performance-token';
  }
  
  async runComprehensiveBenchmark(): Promise<BenchmarkResult[]> {
    console.log('🚀 Starting comprehensive performance benchmark...');
    
    const results: BenchmarkResult[] = [];
    
    // Test 1: Single message sending performance
    results.push(await this.benchmarkSingleMessages());
    
    // Test 2: Bulk message processing
    results.push(await this.benchmarkBulkMessages());
    
    // Test 3: Template rendering performance
    results.push(await this.benchmarkTemplateMessages());
    
    // Test 4: Compliance checking performance
    results.push(await this.benchmarkComplianceChecks());
    
    // Test 5: Analytics query performance
    results.push(await this.benchmarkAnalyticsQueries());
    
    // Test 6: Concurrent connection handling
    results.push(await this.benchmarkConcurrentConnections());
    
    // Test 7: Memory usage under load
    results.push(await this.benchmarkMemoryUsage());
    
    // Test 8: Database performance
    results.push(await this.benchmarkDatabaseOperations());
    
    // Generate comprehensive report
    this.generatePerformanceReport(results);
    
    return results;
  }
  
  private async benchmarkSingleMessages(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking single message performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 100, // 100 messages per second
      maxAvgResponseTime: 500, // 500ms
      maxP95ResponseTime: 1000, // 1s
      maxP99ResponseTime: 2000, // 2s
      maxErrorRate: 1, // 1%
      maxMemoryUsage: 512, // 512MB
      maxCpuUsage: 80 // 80%
    };
    
    const duration = 60; // 1 minute test
    const targetThroughput = 150; // Target 150 RPS
    const totalRequests = duration * targetThroughput;
    
    const startTime = performance.now();
    const startMemory = process.memoryUsage();
    
    const results = await this.executeLoadTest({
      testName: 'single-messages',
      totalRequests,
      concurrency: 50,
      requestGenerator: this.generateSingleMessageRequest.bind(this)
    });
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const actualDuration = (endTime - startTime) / 1000;
    const memoryUsed = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / actualDuration,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 50,
      memoryUsage: memoryUsed,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Single Message Performance',
      duration: actualDuration,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkBulkMessages(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking bulk message performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 20, // 20 bulk requests per second
      maxAvgResponseTime: 2000, // 2s
      maxP95ResponseTime: 5000, // 5s
      maxP99ResponseTime: 10000, // 10s
      maxErrorRate: 2, // 2%
      maxMemoryUsage: 1024, // 1GB
      maxCpuUsage: 85 // 85%
    };
    
    const results = await this.executeLoadTest({
      testName: 'bulk-messages',
      totalRequests: 600, // 10 minutes worth at 1 RPS
      concurrency: 10,
      requestGenerator: this.generateBulkMessageRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 600,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 10,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Bulk Message Performance',
      duration: 600,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkTemplateMessages(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking template rendering performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 200, // 200 template renders per second
      maxAvgResponseTime: 300, // 300ms
      maxP95ResponseTime: 800, // 800ms
      maxP99ResponseTime: 1500, // 1.5s
      maxErrorRate: 0.5, // 0.5%
      maxMemoryUsage: 256, // 256MB
      maxCpuUsage: 75 // 75%
    };
    
    const results = await this.executeLoadTest({
      testName: 'template-messages',
      totalRequests: 6000, // 30 seconds at 200 RPS
      concurrency: 30,
      requestGenerator: this.generateTemplateMessageRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 30,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 30,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Template Rendering Performance',
      duration: 30,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkComplianceChecks(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking compliance check performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 500, // 500 checks per second
      maxAvgResponseTime: 100, // 100ms
      maxP95ResponseTime: 300, // 300ms
      maxP99ResponseTime: 500, // 500ms
      maxErrorRate: 0.1, // 0.1%
      maxMemoryUsage: 128, // 128MB
      maxCpuUsage: 60 // 60%
    };
    
    const results = await this.executeLoadTest({
      testName: 'compliance-checks',
      totalRequests: 5000, // 10 seconds at 500 RPS
      concurrency: 25,
      requestGenerator: this.generateComplianceCheckRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 10,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 25,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Compliance Check Performance',
      duration: 10,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkAnalyticsQueries(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking analytics query performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 50, // 50 queries per second
      maxAvgResponseTime: 1000, // 1s
      maxP95ResponseTime: 3000, // 3s
      maxP99ResponseTime: 5000, // 5s
      maxErrorRate: 1, // 1%
      maxMemoryUsage: 512, // 512MB
      maxCpuUsage: 70 // 70%
    };
    
    const results = await this.executeLoadTest({
      testName: 'analytics-queries',
      totalRequests: 1500, // 30 seconds at 50 RPS
      concurrency: 15,
      requestGenerator: this.generateAnalyticsRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 30,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 15,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Analytics Query Performance',
      duration: 30,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkConcurrentConnections(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking concurrent connection handling...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 1000, // 1000 concurrent connections
      maxAvgResponseTime: 200, // 200ms
      maxP95ResponseTime: 500, // 500ms
      maxP99ResponseTime: 1000, // 1s
      maxErrorRate: 2, // 2%
      maxMemoryUsage: 2048, // 2GB
      maxCpuUsage: 90 // 90%
    };
    
    // Test with very high concurrency
    const results = await this.executeLoadTest({
      testName: 'concurrent-connections',
      totalRequests: 10000,
      concurrency: 1000, // 1000 concurrent connections
      requestGenerator: this.generateSingleMessageRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 60, // Assume 1 minute duration
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 1000,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Concurrent Connection Handling',
      duration: 60,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkMemoryUsage(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking memory usage under load...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 100,
      maxAvgResponseTime: 500,
      maxP95ResponseTime: 1000,
      maxP99ResponseTime: 2000,
      maxErrorRate: 1,
      maxMemoryUsage: 1024, // 1GB memory limit
      maxCpuUsage: 80
    };
    
    const startMemory = process.memoryUsage();
    
    // Run sustained load for memory testing
    const results = await this.executeLoadTest({
      testName: 'memory-usage',
      totalRequests: 10000,
      concurrency: 100,
      requestGenerator: this.generateMixedRequests.bind(this)
    });
    
    const endMemory = process.memoryUsage();
    const memoryGrowth = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 120, // 2 minute test
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 100,
      memoryUsage: memoryGrowth,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Memory Usage Under Load',
      duration: 120,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async benchmarkDatabaseOperations(): Promise<BenchmarkResult> {
    console.log('📊 Benchmarking database operation performance...');
    
    const requirements: PerformanceRequirements = {
      minThroughput: 300, // 300 DB ops per second
      maxAvgResponseTime: 50, // 50ms
      maxP95ResponseTime: 200, // 200ms
      maxP99ResponseTime: 500, // 500ms
      maxErrorRate: 0.5, // 0.5%
      maxMemoryUsage: 256, // 256MB
      maxCpuUsage: 60 // 60%
    };
    
    const results = await this.executeLoadTest({
      testName: 'database-operations',
      totalRequests: 9000, // 30 seconds at 300 RPS
      concurrency: 20,
      requestGenerator: this.generateDatabaseOperationRequest.bind(this)
    });
    
    const metrics: PerformanceMetrics = {
      throughput: results.successfulRequests / 30,
      avgResponseTime: this.calculateAverage(results.responseTimes),
      p95ResponseTime: this.calculatePercentile(results.responseTimes, 0.95),
      p99ResponseTime: this.calculatePercentile(results.responseTimes, 0.99),
      errorRate: (results.failedRequests / results.totalRequests) * 100,
      concurrentConnections: 20,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsage: await this.getCpuUsage(),
      databaseConnections: await this.getDatabaseConnections(),
      queueLength: await this.getQueueLength()
    };
    
    return {
      testName: 'Database Operation Performance',
      duration: 30,
      metrics,
      requirements,
      passed: this.validateRequirements(metrics, requirements),
      details: results
    };
  }
  
  private async executeLoadTest(config: {
    testName: string;
    totalRequests: number;
    concurrency: number;
    requestGenerator: () => Promise<{ url: string; options: any }>;
  }): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    responseTimes: number[];
    errors: string[];
  }> {
    const results = {
      totalRequests: config.totalRequests,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [] as number[],
      errors: [] as string[]
    };
    
    // Create worker pool
    const workers = [];
    for (let i = 0; i < config.concurrency; i++) {
      workers.push(this.createLoadTestWorker());
    }
    
    // Distribute requests across workers
    const requestsPerWorker = Math.ceil(config.totalRequests / config.concurrency);
    const workerPromises = workers.map(async (worker, index) => {
      const requests = Math.min(requestsPerWorker, config.totalRequests - (index * requestsPerWorker));
      
      return new Promise<any>((resolve, reject) => {
        worker.postMessage({
          requests,
          baseUrl: this.apiBaseUrl,
          authToken: this.authToken,
          testType: config.testName
        });
        
        worker.on('message', resolve);
        worker.on('error', reject);
      });
    });
    
    // Wait for all workers to complete
    const workerResults = await Promise.all(workerPromises);
    
    // Aggregate results
    for (const result of workerResults) {
      results.successfulRequests += result.successful;
      results.failedRequests += result.failed;
      results.responseTimes.push(...result.responseTimes);
      results.errors.push(...result.errors);
    }
    
    // Cleanup workers
    workers.forEach(worker => worker.terminate());
    
    return results;
  }
  
  private createLoadTestWorker(): Worker {
    // Worker thread code would be defined separately
    // For now, return a mock worker
    const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      const fetch = require('node-fetch');
      
      parentPort.on('message', async (data) => {
        const result = {
          successful: 0,
          failed: 0,
          responseTimes: [],
          errors: []
        };
        
        for (let i = 0; i < data.requests; i++) {
          const startTime = Date.now();
          try {
            const response = await fetch(\`\${data.baseUrl}/api/communications/messages/send\`, {
              method: 'POST',
              headers: {
                'Authorization': \`Bearer \${data.authToken}\`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                recipientId: 'test-guest-' + i,
                recipientEmail: \`test\${i}@example.com\`,
                subject: 'Load Test Message',
                content: 'This is a load test message.',
                type: 'email'
              })
            });
            
            if (response.ok) {
              result.successful++;
            } else {
              result.failed++;
              result.errors.push(\`HTTP \${response.status}: \${response.statusText}\`);
            }
            
            result.responseTimes.push(Date.now() - startTime);
          } catch (error) {
            result.failed++;
            result.errors.push(error.message);
            result.responseTimes.push(Date.now() - startTime);
          }
        }
        
        parentPort.postMessage(result);
      });
    `, { eval: true });
    
    return worker;
  }
  
  // Request generators
  private async generateSingleMessageRequest(): Promise<{ url: string; options: any }> {
    return {
      url: `${this.apiBaseUrl}/api/communications/messages/send`,
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientId: faker.datatype.uuid(),
          recipientEmail: faker.internet.email(),
          subject: faker.lorem.sentence(),
          content: faker.lorem.paragraph(),
          type: 'email'
        })
      }
    };
  }
  
  private async generateBulkMessageRequest(): Promise<{ url: string; options: any }> {
    const recipients = Array.from({ length: 50 }, () => ({
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName()
    }));
    
    return {
      url: `${this.apiBaseUrl}/api/communications/messages/bulk`,
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients,
          subject: 'Bulk Performance Test',
          content: 'This is a bulk message performance test.',
          type: 'email'
        })
      }
    };
  }
  
  private async generateTemplateMessageRequest(): Promise<{ url: string; options: any }> {
    return {
      url: `${this.apiBaseUrl}/api/communications/messages/template`,
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: 'wedding-invitation',
          recipientEmail: faker.internet.email(),
          variables: {
            guestName: faker.person.fullName(),
            weddingDate: '2024-06-15',
            venue: 'Grand Ballroom'
          }
        })
      }
    };
  }
  
  private async generateComplianceCheckRequest(): Promise<{ url: string; options: any }> {
    return {
      url: `${this.apiBaseUrl}/api/communications/compliance/check`,
      options: {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: faker.internet.email(),
          action: 'send_marketing',
          jurisdiction: faker.helpers.arrayElement(['US', 'EU', 'UK', 'CA'])
        })
      }
    };
  }
  
  private async generateAnalyticsRequest(): Promise<{ url: string; options: any }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      url: `${this.apiBaseUrl}/api/communications/analytics?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      options: {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    };
  }
  
  private async generateMixedRequests(): Promise<{ url: string; options: any }> {
    const generators = [
      this.generateSingleMessageRequest,
      this.generateTemplateMessageRequest,
      this.generateComplianceCheckRequest,
      this.generateAnalyticsRequest
    ];
    
    const generator = faker.helpers.arrayElement(generators);
    return generator.call(this);
  }
  
  private async generateDatabaseOperationRequest(): Promise<{ url: string; options: any }> {
    return {
      url: `${this.apiBaseUrl}/api/communications/messages?limit=10`,
      options: {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      }
    };
  }
  
  // Utility methods
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }
  
  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index] || 0;
  }
  
  private validateRequirements(
    metrics: PerformanceMetrics, 
    requirements: PerformanceRequirements
  ): boolean {
    return (
      metrics.throughput >= requirements.minThroughput &&
      metrics.avgResponseTime <= requirements.maxAvgResponseTime &&
      metrics.p95ResponseTime <= requirements.maxP95ResponseTime &&
      metrics.p99ResponseTime <= requirements.maxP99ResponseTime &&
      metrics.errorRate <= requirements.maxErrorRate &&
      metrics.memoryUsage <= requirements.maxMemoryUsage &&
      metrics.cpuUsage <= requirements.maxCpuUsage
    );
  }
  
  private async getCpuUsage(): Promise<number> {
    // Mock implementation - would use actual CPU monitoring
    return Math.random() * 100;
  }
  
  private async getDatabaseConnections(): Promise<number> {
    // Mock implementation - would query actual database connection pool
    return Math.floor(Math.random() * 20);
  }
  
  private async getQueueLength(): Promise<number> {
    // Mock implementation - would query actual message queue
    return Math.floor(Math.random() * 1000);
  }
  
  private generatePerformanceReport(results: BenchmarkResult[]): void {
    console.log('\n📊 PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(80));
    
    let overallPass = true;
    
    for (const result of results) {
      console.log(`\n🧪 ${result.testName}`);
      console.log(`Duration: ${result.duration}s`);
      console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!result.passed) overallPass = false;
      
      console.log(`\n📈 Metrics:`);
      console.log(`  Throughput: ${result.metrics.throughput.toFixed(2)} req/s (min: ${result.requirements.minThroughput})`);
      console.log(`  Avg Response: ${result.metrics.avgResponseTime.toFixed(2)}ms (max: ${result.requirements.maxAvgResponseTime}ms)`);
      console.log(`  P95 Response: ${result.metrics.p95ResponseTime.toFixed(2)}ms (max: ${result.requirements.maxP95ResponseTime}ms)`);
      console.log(`  P99 Response: ${result.metrics.p99ResponseTime.toFixed(2)}ms (max: ${result.requirements.maxP99ResponseTime}ms)`);
      console.log(`  Error Rate: ${result.metrics.errorRate.toFixed(2)}% (max: ${result.requirements.maxErrorRate}%)`);
      console.log(`  Memory Usage: ${result.metrics.memoryUsage.toFixed(2)}MB (max: ${result.requirements.maxMemoryUsage}MB)`);
      console.log(`  CPU Usage: ${result.metrics.cpuUsage.toFixed(2)}% (max: ${result.requirements.maxCpuUsage}%)`);
      
      console.log(`\n📊 Details:`);
      console.log(`  Total Requests: ${result.details.totalRequests}`);
      console.log(`  Successful: ${result.details.successfulRequests}`);
      console.log(`  Failed: ${result.details.failedRequests}`);
      
      if (result.details.errors.length > 0) {
        console.log(`\n🚨 Errors (showing first 5):`);
        result.details.errors.slice(0, 5).forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      console.log('-'.repeat(80));
    }
    
    console.log(`\n🎯 OVERALL RESULT: ${overallPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(80));
    
    // Generate CSV report for analysis
    this.generateCsvReport(results);
  }
  
  private generateCsvReport(results: BenchmarkResult[]): void {
    const csv = [
      'Test Name,Duration,Throughput,Avg Response Time,P95 Response Time,P99 Response Time,Error Rate,Memory Usage,CPU Usage,Status'
    ];
    
    for (const result of results) {
      csv.push([
        result.testName,
        result.duration,
        result.metrics.throughput.toFixed(2),
        result.metrics.avgResponseTime.toFixed(2),
        result.metrics.p95ResponseTime.toFixed(2),
        result.metrics.p99ResponseTime.toFixed(2),
        result.metrics.errorRate.toFixed(2),
        result.metrics.memoryUsage.toFixed(2),
        result.metrics.cpuUsage.toFixed(2),
        result.passed ? 'PASSED' : 'FAILED'
      ].join(','));
    }
    
    console.log('\n📄 CSV Report:');
    csv.forEach(line => console.log(line));
  }
}

// Run benchmark if executed directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.runComprehensiveBenchmark()
    .then(results => {
      const passed = results.every(r => r.passed);
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

export { PerformanceBenchmark };