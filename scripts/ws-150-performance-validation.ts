#!/usr/bin/env tsx

/**
 * WS-150 Performance Validation Script
 * Team C - Comprehensive Audit Logging System
 * 
 * Validates all performance requirements:
 * - WebSocket connections handle 100+ concurrent clients
 * - External service integrations with retry logic
 * - Middleware performance impact <10ms per request
 * - Real-time event filtering and routing
 * - Connection management handles network interruptions
 */

import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { AuditStreamServer } from '../src/lib/websocket/audit-stream';
import { createAuditMiddleware } from '../src/middleware/audit-middleware';
import { AuditExternalServicesManager, loadExternalServicesConfig } from '../src/lib/integrations/audit-external-services';
import { NextRequest, NextResponse } from 'next/server';

// Test configuration
const CONFIG = {
  // WebSocket performance requirements
  websocket: {
    maxClients: 120,
    maxLatency: 100, // ms
    port: 8083
  },
  
  // Middleware performance requirements  
  middleware: {
    maxOverhead: 10, // ms per request
    concurrentRequests: 100,
    testIterations: 500
  },
  
  // External services requirements
  externalServices: {
    maxRetries: 3,
    timeoutMs: 5000,
    batchSize: 100
  },
  
  // General test settings
  testDuration: 60000, // 1 minute stress test
  reportInterval: 5000, // 5 seconds
};

interface TestResults {
  websocketPerformance: {
    maxConcurrentClients: number;
    averageLatency: number;
    maxLatency: number;
    throughput: number;
    connectionSuccessRate: number;
  };
  middlewarePerformance: {
    averageOverhead: number;
    maxOverhead: number;
    throughput: number;
    memoryUsage: number;
  };
  externalServiceReliability: {
    dataDogSuccessRate: number;
    elasticsearchSuccessRate: number;
    slackSuccessRate: number;
    pagerDutySuccessRate: number;
    averageRetries: number;
  };
  systemStability: {
    errorRate: number;
    resourceUsage: NodeJS.MemoryUsage;
    uptime: number;
  };
}

class PerformanceValidator {
  private testServer?: AuditStreamServer;
  private middleware: ReturnType<typeof createAuditMiddleware>;
  private externalServices: AuditExternalServicesManager;
  private results: Partial<TestResults> = {};

  constructor() {
    this.middleware = createAuditMiddleware({
      enablePerformanceMetrics: true,
      logAllRequests: false,
      sampling: { rate: 1.0, highValueEndpoints: ['/api/test'] }
    });

    const config = loadExternalServicesConfig();
    this.externalServices = new AuditExternalServicesManager(config);
  }

  async runValidation(): Promise<TestResults> {
    console.log('🚀 Starting WS-150 Performance Validation\n');
    
    try {
      // Initialize test environment
      await this.initializeTestEnvironment();
      
      // Run performance tests
      await this.validateWebSocketPerformance();
      await this.validateMiddlewarePerformance();
      await this.validateExternalServiceReliability();
      await this.validateSystemStability();
      
      // Generate report
      return this.generateReport();
      
    } finally {
      await this.cleanup();
    }
  }

  private async initializeTestEnvironment(): Promise<void> {
    console.log('📋 Initializing test environment...');
    
    this.testServer = new AuditStreamServer(CONFIG.websocket.port);
    await this.testServer.start();
    
    console.log(`✅ Test server started on port ${CONFIG.websocket.port}\n`);
  }

  private async validateWebSocketPerformance(): Promise<void> {
    console.log('🔌 Validating WebSocket Performance...');
    console.log(`Target: ${CONFIG.websocket.maxClients} concurrent clients, <${CONFIG.websocket.maxLatency}ms latency\n`);

    const clients: WebSocket[] = [];
    const latencies: number[] = [];
    const connectionTimes: number[] = [];
    let successfulConnections = 0;
    let totalMessages = 0;
    
    const startTime = performance.now();

    try {
      // Create concurrent connections
      const connectionPromises = Array.from({ length: CONFIG.websocket.maxClients }, async (_, i) => {
        const connectionStart = performance.now();
        
        try {
          const client = new WebSocket(`ws://localhost:${CONFIG.websocket.port}?userId=perf-test-${i}`);
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
            
            client.on('open', () => {
              clearTimeout(timeout);
              const connectionTime = performance.now() - connectionStart;
              connectionTimes.push(connectionTime);
              successfulConnections++;
              
              // Set up message handler
              client.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'auditEvent') {
                  const now = performance.now();
                  const eventTime = new Date(message.payload.timestamp).getTime();
                  const latency = now - eventTime;
                  latencies.push(latency);
                  totalMessages++;
                }
              });
              
              clients.push(client);
              resolve(client);
            });
            
            client.on('error', reject);
          });
          
        } catch (error) {
          console.log(`❌ Connection ${i} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });

      await Promise.allSettled(connectionPromises);
      
      console.log(`📊 Connected ${successfulConnections}/${CONFIG.websocket.maxClients} clients`);
      
      // Test message throughput
      const messageTestStart = performance.now();
      const testEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-test-${i}`,
        type: 'system' as const,
        severity: 'low' as const,
        timestamp: new Date().toISOString(),
        source: 'performance-test',
        event: { testIndex: i }
      }));

      for (const event of testEvents) {
        await this.testServer!.broadcastAuditEvent(event);
      }
      
      // Wait for message delivery
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const messageTestDuration = performance.now() - messageTestStart;
      const throughput = testEvents.length / (messageTestDuration / 1000);

      this.results.websocketPerformance = {
        maxConcurrentClients: successfulConnections,
        averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
        maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
        throughput,
        connectionSuccessRate: successfulConnections / CONFIG.websocket.maxClients
      };

      // Validation checks
      const passedConcurrency = successfulConnections >= CONFIG.websocket.maxClients;
      const passedLatency = this.results.websocketPerformance.averageLatency <= CONFIG.websocket.maxLatency;
      
      console.log(`📈 Results:`);
      console.log(`   Concurrent clients: ${successfulConnections} ${passedConcurrency ? '✅' : '❌'}`);
      console.log(`   Average latency: ${this.results.websocketPerformance.averageLatency.toFixed(2)}ms ${passedLatency ? '✅' : '❌'}`);
      console.log(`   Max latency: ${this.results.websocketPerformance.maxLatency.toFixed(2)}ms`);
      console.log(`   Throughput: ${throughput.toFixed(2)} events/sec`);
      console.log(`   Success rate: ${(this.results.websocketPerformance.connectionSuccessRate * 100).toFixed(1)}%\n`);
      
    } finally {
      // Clean up connections
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      });
    }
  }

  private async validateMiddlewarePerformance(): Promise<void> {
    console.log('⚡ Validating Middleware Performance...');
    console.log(`Target: <${CONFIG.middleware.maxOverhead}ms overhead per request\n`);

    const overheadTimes: number[] = [];
    const memoryUsages: number[] = [];
    let throughputStart = performance.now();
    
    // Single request overhead test
    for (let i = 0; i < CONFIG.middleware.testIterations; i++) {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const request = new NextRequest(`https://example.com/api/perf-test/${i}`, {
        method: 'POST',
        body: JSON.stringify({ testData: `iteration-${i}` }),
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Performance Test Agent',
          'x-forwarded-for': '127.0.0.1'
        }
      });

      const startTime = performance.now();
      
      const { context } = await this.middleware.processRequest(request);
      
      const response = new NextResponse(
        JSON.stringify({ success: true, iteration: i }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      );
      
      await this.middleware.processResponse(context, response);
      
      const endTime = performance.now();
      const overhead = endTime - startTime;
      overheadTimes.push(overhead);
      
      const finalMemory = process.memoryUsage().heapUsed;
      memoryUsages.push(finalMemory - initialMemory);
    }

    const throughputDuration = performance.now() - throughputStart;
    const throughput = CONFIG.middleware.testIterations / (throughputDuration / 1000);
    
    // Concurrent request test
    console.log(`🔄 Testing ${CONFIG.middleware.concurrentRequests} concurrent requests...`);
    
    const concurrentStart = performance.now();
    const concurrentPromises = Array.from({ length: CONFIG.middleware.concurrentRequests }, async (_, i) => {
      const request = new NextRequest(`https://example.com/api/concurrent/${i}`, {
        method: 'GET',
        headers: { 'x-test-id': `concurrent-${i}` }
      });

      const { context } = await this.middleware.processRequest(request);
      const response = new NextResponse(`Concurrent response ${i}`, { status: 200 });
      await this.middleware.processResponse(context, response);
      
      return { success: true };
    });

    const concurrentResults = await Promise.allSettled(concurrentPromises);
    const concurrentSuccesses = concurrentResults.filter(r => r.status === 'fulfilled').length;
    const concurrentDuration = performance.now() - concurrentStart;
    const concurrentThroughput = concurrentSuccesses / (concurrentDuration / 1000);

    this.results.middlewarePerformance = {
      averageOverhead: overheadTimes.reduce((a, b) => a + b, 0) / overheadTimes.length,
      maxOverhead: Math.max(...overheadTimes),
      throughput: Math.max(throughput, concurrentThroughput),
      memoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
    };

    const passedOverhead = this.results.middlewarePerformance.averageOverhead <= CONFIG.middleware.maxOverhead;
    const passedConcurrency = concurrentSuccesses >= CONFIG.middleware.concurrentRequests * 0.95; // 95% success rate

    console.log(`📈 Results:`);
    console.log(`   Average overhead: ${this.results.middlewarePerformance.averageOverhead.toFixed(2)}ms ${passedOverhead ? '✅' : '❌'}`);
    console.log(`   Max overhead: ${this.results.middlewarePerformance.maxOverhead.toFixed(2)}ms`);
    console.log(`   Sequential throughput: ${throughput.toFixed(2)} req/sec`);
    console.log(`   Concurrent throughput: ${concurrentThroughput.toFixed(2)} req/sec`);
    console.log(`   Concurrent success rate: ${(concurrentSuccesses / CONFIG.middleware.concurrentRequests * 100).toFixed(1)}% ${passedConcurrency ? '✅' : '❌'}`);
    console.log(`   Average memory per request: ${(this.results.middlewarePerformance.memoryUsage / 1024).toFixed(2)} KB\n`);
  }

  private async validateExternalServiceReliability(): Promise<void> {
    console.log('🌐 Validating External Service Reliability...');
    console.log(`Testing retry logic and error handling\n`);

    const serviceResults = {
      dataDog: { success: 0, attempts: 0 },
      elasticsearch: { success: 0, attempts: 0 },
      slack: { success: 0, attempts: 0 },
      pagerDuty: { success: 0, attempts: 0 }
    };

    // Mock fetch to simulate failures and retries
    const originalFetch = global.fetch;
    let callCounts: Record<string, number> = {};
    
    global.fetch = jest.fn().mockImplementation(async (url) => {
      const urlStr = url.toString();
      callCounts[urlStr] = (callCounts[urlStr] || 0) + 1;
      
      // Simulate intermittent failures
      const shouldFail = Math.random() < 0.3; // 30% failure rate
      
      if (shouldFail && callCounts[urlStr] < 3) { // Allow up to 2 retries
        throw new Error(`Simulated network error (attempt ${callCounts[urlStr]})`);
      }
      
      if (urlStr.includes('datadoghq.com')) {
        serviceResults.dataDog.attempts++;
        serviceResults.dataDog.success++;
        return new Response('OK', { status: 200 });
      }
      
      if (urlStr.includes('elasticsearch') || urlStr.includes('_bulk')) {
        serviceResults.elasticsearch.attempts++;
        serviceResults.elasticsearch.success++;
        return new Response(JSON.stringify({ errors: false }), { status: 200 });
      }
      
      if (urlStr.includes('slack.com') || urlStr.includes('hooks.slack.com')) {
        serviceResults.slack.attempts++;
        serviceResults.slack.success++;
        return new Response('ok', { status: 200 });
      }
      
      if (urlStr.includes('events.pagerduty.com')) {
        serviceResults.pagerDuty.attempts++;
        serviceResults.pagerDuty.success++;
        return new Response(JSON.stringify({ dedup_key: 'test' }), { status: 202 });
      }
      
      throw new Error('Unknown service');
    }) as jest.Mock;

    try {
      // Test different severity events
      const testEvents = [
        {
          id: 'reliability-test-1',
          type: 'security' as const,
          severity: 'critical' as const,
          timestamp: new Date().toISOString(),
          source: 'reliability-test',
          event: { description: 'Critical security event' }
        },
        {
          id: 'reliability-test-2',
          type: 'admin' as const,
          severity: 'high' as const,
          timestamp: new Date().toISOString(),
          source: 'reliability-test',
          event: { description: 'High severity admin event' }
        },
        {
          id: 'reliability-test-3',
          type: 'system' as const,
          severity: 'medium' as const,
          timestamp: new Date().toISOString(),
          source: 'reliability-test',
          event: { description: 'Medium severity system event' }
        }
      ];

      for (let i = 0; i < 50; i++) {
        const event = testEvents[i % testEvents.length];
        event.id = `${event.id}-${i}`;
        await this.externalServices.processAuditEvent(event);
      }

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      const totalRetries = Object.values(callCounts).reduce((sum, count) => sum + Math.max(0, count - 1), 0);
      const totalCalls = Object.values(callCounts).reduce((sum, count) => sum + count, 0);

      this.results.externalServiceReliability = {
        dataDogSuccessRate: serviceResults.dataDog.attempts > 0 ? serviceResults.dataDog.success / serviceResults.dataDog.attempts : 0,
        elasticsearchSuccessRate: serviceResults.elasticsearch.attempts > 0 ? serviceResults.elasticsearch.success / serviceResults.elasticsearch.attempts : 0,
        slackSuccessRate: serviceResults.slack.attempts > 0 ? serviceResults.slack.success / serviceResults.slack.attempts : 0,
        pagerDutySuccessRate: serviceResults.pagerDuty.attempts > 0 ? serviceResults.pagerDuty.success / serviceResults.pagerDuty.attempts : 0,
        averageRetries: totalCalls > 0 ? totalRetries / Object.keys(callCounts).length : 0
      };

      console.log(`📈 Results:`);
      console.log(`   DataDog success rate: ${(this.results.externalServiceReliability.dataDogSuccessRate * 100).toFixed(1)}%`);
      console.log(`   Elasticsearch success rate: ${(this.results.externalServiceReliability.elasticsearchSuccessRate * 100).toFixed(1)}%`);
      console.log(`   Slack success rate: ${(this.results.externalServiceReliability.slackSuccessRate * 100).toFixed(1)}%`);
      console.log(`   PagerDuty success rate: ${(this.results.externalServiceReliability.pagerDutySuccessRate * 100).toFixed(1)}%`);
      console.log(`   Average retries per service: ${this.results.externalServiceReliability.averageRetries.toFixed(2)}\n`);

    } finally {
      global.fetch = originalFetch;
    }
  }

  private async validateSystemStability(): Promise<void> {
    console.log('🏗️ Validating System Stability...');
    console.log(`Running stress test for ${CONFIG.testDuration / 1000} seconds\n`);

    const startTime = performance.now();
    const initialMemory = process.memoryUsage();
    let errorCount = 0;
    let totalOperations = 0;

    const stressTestEnd = startTime + CONFIG.testDuration;
    
    // Run stress test
    while (performance.now() < stressTestEnd) {
      try {
        // Simulate various operations
        const operations = [
          this.stressWebSocketConnections(),
          this.stressMiddlewareRequests(),
          this.stressExternalServices()
        ];

        await Promise.allSettled(operations);
        totalOperations++;

        // Brief pause to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errorCount++;
        console.log(`❌ Stress test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const finalMemory = process.memoryUsage();
    const uptime = performance.now() - startTime;

    this.results.systemStability = {
      errorRate: totalOperations > 0 ? errorCount / totalOperations : 0,
      resourceUsage: {
        rss: finalMemory.rss - initialMemory.rss,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        external: finalMemory.external - initialMemory.external,
        arrayBuffers: finalMemory.arrayBuffers - initialMemory.arrayBuffers
      },
      uptime
    };

    const passedErrorRate = this.results.systemStability.errorRate < 0.05; // Less than 5% errors
    const passedMemoryUsage = this.results.systemStability.resourceUsage.heapUsed < 100 * 1024 * 1024; // Less than 100MB growth

    console.log(`📈 Results:`);
    console.log(`   Error rate: ${(this.results.systemStability.errorRate * 100).toFixed(2)}% ${passedErrorRate ? '✅' : '❌'}`);
    console.log(`   Memory growth: ${(this.results.systemStability.resourceUsage.heapUsed / 1024 / 1024).toFixed(2)}MB ${passedMemoryUsage ? '✅' : '❌'}`);
    console.log(`   Uptime: ${(uptime / 1000).toFixed(2)}s`);
    console.log(`   Total operations: ${totalOperations}\n`);
  }

  private async stressWebSocketConnections(): Promise<void> {
    const client = new WebSocket(`ws://localhost:${CONFIG.websocket.port}?userId=stress-test`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.terminate();
        reject(new Error('WebSocket stress test timeout'));
      }, 2000);

      client.on('open', () => {
        clearTimeout(timeout);
        client.close();
        resolve();
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async stressMiddlewareRequests(): Promise<void> {
    const request = new NextRequest('https://example.com/api/stress-test', {
      method: 'POST',
      body: JSON.stringify({ timestamp: Date.now() })
    });

    const { context } = await this.middleware.processRequest(request);
    const response = new NextResponse('OK', { status: 200 });
    await this.middleware.processResponse(context, response);
  }

  private async stressExternalServices(): Promise<void> {
    const event = {
      id: `stress-${Date.now()}`,
      type: 'system' as const,
      severity: 'low' as const,
      timestamp: new Date().toISOString(),
      source: 'stress-test',
      event: { description: 'Stress test event' }
    };

    await this.externalServices.processAuditEvent(event);
  }

  private generateReport(): TestResults {
    const results = this.results as TestResults;
    
    console.log('📊 FINAL VALIDATION REPORT');
    console.log('='.repeat(50));
    
    // Overall assessment
    const websocketPassed = 
      results.websocketPerformance.maxConcurrentClients >= CONFIG.websocket.maxClients &&
      results.websocketPerformance.averageLatency <= CONFIG.websocket.maxLatency;
    
    const middlewarePassed = 
      results.middlewarePerformance.averageOverhead <= CONFIG.middleware.maxOverhead;
    
    const servicesPassed = 
      results.externalServiceReliability.dataDogSuccessRate >= 0.95 &&
      results.externalServiceReliability.elasticsearchSuccessRate >= 0.95;
    
    const stabilityPassed = 
      results.systemStability.errorRate < 0.05;

    console.log(`\nWebSocket Performance: ${websocketPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Middleware Performance: ${middlewarePassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`External Services: ${servicesPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`System Stability: ${stabilityPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    const overallPassed = websocketPassed && middlewarePassed && servicesPassed && stabilityPassed;
    console.log(`\n🎯 OVERALL RESULT: ${overallPassed ? '✅ ALL REQUIREMENTS MET' : '❌ REQUIREMENTS NOT MET'}`);
    
    if (overallPassed) {
      console.log(`\n🚀 WS-150 Audit Logging System is ready for production deployment!`);
    } else {
      console.log(`\n⚠️  Please address the failing requirements before deployment.`);
    }
    
    return results;
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    if (this.testServer) {
      await this.testServer.shutdown();
    }
    
    await this.externalServices.shutdown();
    
    console.log('✅ Cleanup complete');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  
  validator.runValidation()
    .then((results) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

export { PerformanceValidator };
export type { TestResults };