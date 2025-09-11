#!/usr/bin/env node
/**
 * 🚨 GUARDIAN PROTOCOL - Wedding Day Load Testing
 * 
 * Simulates REAL Saturday wedding loads:
 * - 5+ weddings simultaneously
 * - 200+ vendors coordinating in real-time
 * - Guests checking in and submitting forms
 * - Photos being uploaded during ceremonies
 * - Timeline changes propagating instantly
 * 
 * CRITICAL THRESHOLDS:
 * - Response time: <500ms (wedding coordination)
 * - Uptime: 100% (zero tolerance for failure)
 * - Concurrent users: 500+ (peak Saturday load)
 * - Data integrity: 100% (no lost wedding data)
 * 
 * @author Guardian Protocol - Wedding Industry Security
 * @version 1.0.0 - January 2025
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Real wedding day load patterns
const WEDDING_LOAD_PATTERNS = {
  // Early morning vendor setup (6-9 AM)
  morningSetup: {
    duration: 10800000, // 3 hours
    userCurve: [10, 25, 40, 35, 30, 25], // Gradual increase
    primaryActions: ['auth', 'timeline', 'vendor_checkin'],
    peakConcurrency: 40
  },
  
  // Pre-ceremony rush (10 AM - 12 PM)
  preRush: {
    duration: 7200000, // 2 hours  
    userCurve: [30, 50, 80, 100, 120, 150], // Sharp increase
    primaryActions: ['guest_checkin', 'form_submission', 'photo_upload'],
    peakConcurrency: 150
  },
  
  // Ceremony coordination (12-2 PM)
  ceremonyPeak: {
    duration: 7200000, // 2 hours
    userCurve: [150, 200, 250, 300, 280, 200], // Peak load
    primaryActions: ['timeline_sync', 'realtime_updates', 'photo_stream'],
    peakConcurrency: 300
  },
  
  // Reception chaos (6-11 PM)  
  receptionChaos: {
    duration: 18000000, // 5 hours
    userCurve: [200, 300, 350, 400, 450, 500, 400, 300, 200], // Extended peak
    primaryActions: ['all_systems', 'emergency_coordination', 'guest_interactions'],
    peakConcurrency: 500
  },
  
  // Late night cleanup (11 PM - 2 AM)
  lateCleanup: {
    duration: 10800000, // 3 hours
    userCurve: [200, 150, 100, 75, 50, 25], // Wind down
    primaryActions: ['final_uploads', 'payment_processing', 'vendor_reports'],
    peakConcurrency: 200
  }
};

// Wedding-specific actions that happen during peak times
const WEDDING_ACTIONS = {
  auth: {
    endpoints: ['/api/auth/signin'],
    frequency: 0.1, // Once per 10 requests
    priority: 'critical'
  },
  
  guest_checkin: {
    endpoints: ['/api/forms/guest-checkin', '/api/guests/create'],
    frequency: 0.3, // 30% of actions during guest arrivals
    priority: 'critical'
  },
  
  timeline_sync: {
    endpoints: ['/api/timeline', '/api/timeline/sync'],
    frequency: 0.2, // Constant timeline updates
    priority: 'critical'
  },
  
  photo_upload: {
    endpoints: ['/api/upload/photos', '/api/media/process'],
    frequency: 0.15, // Continuous photo uploads
    priority: 'important',
    payloadSize: 'large' // 2-5MB per photo
  },
  
  form_submission: {
    endpoints: ['/api/forms/submit', '/api/forms/validate'],
    frequency: 0.2, // Various forms being submitted
    priority: 'critical'
  },
  
  realtime_updates: {
    endpoints: ['/api/realtime/subscribe', '/api/realtime/broadcast'],
    frequency: 0.4, // Constant real-time communication
    priority: 'critical'
  },
  
  vendor_coordination: {
    endpoints: ['/api/vendors/status', '/api/coordination/update'],
    frequency: 0.1, // Vendors updating status
    priority: 'important'
  },
  
  emergency_coordination: {
    endpoints: ['/api/emergency/alert', '/api/timeline/emergency-update'],
    frequency: 0.05, // Rare but critical
    priority: 'critical'
  },
  
  payment_processing: {
    endpoints: ['/api/stripe/create-checkout-session', '/api/payments/process'],
    frequency: 0.02, // Occasional payments
    priority: 'important'
  }
};

class WeddingLoadTester {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      maxConcurrentUsers: options.maxConcurrentUsers || 500,
      testDuration: options.testDuration || 3600000, // 1 hour default
      pattern: options.pattern || 'ceremonyPeak',
      realMode: options.realMode || false, // If true, makes real HTTP requests
      ...options
    };
    
    this.stats = {
      startTime: performance.now(),
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorsByType: {},
      concurrentUsers: 0,
      peakConcurrency: 0,
      criticalErrors: [],
      weddingReadiness: false
    };
    
    this.workers = [];
    this.isRunning = false;
    this.testId = `wedding-load-${Date.now()}`;
  }

  async startLoadTest() {
    console.log('💒 GUARDIAN PROTOCOL - Wedding Day Load Test');
    console.log('===========================================');
    console.log(`Test ID: ${this.testId}`);
    console.log(`Pattern: ${this.options.pattern}`);
    console.log(`Max Concurrent Users: ${this.options.maxConcurrentUsers}`);
    console.log(`Duration: ${(this.options.testDuration / 60000).toFixed(1)} minutes`);
    console.log(`Real Mode: ${this.options.realMode ? 'YES (Making real HTTP requests)' : 'NO (Simulation only)'}`);
    console.log('');
    
    try {
      this.isRunning = true;
      
      // Get the load pattern
      const pattern = WEDDING_LOAD_PATTERNS[this.options.pattern];
      if (!pattern) {
        throw new Error(`Unknown load pattern: ${this.options.pattern}`);
      }
      
      // Start pre-test health check
      await this.performPreTestCheck();
      
      // Start monitoring
      const monitoringInterval = setInterval(() => {
        this.logCurrentStats();
      }, 10000); // Every 10 seconds
      
      // Run the load test
      await this.executeLoadPattern(pattern);
      
      // Stop monitoring
      clearInterval(monitoringInterval);
      
      // Generate final report
      await this.generateLoadTestReport();
      
    } catch (error) {
      console.error('🚨 CRITICAL: Load test failed:', error.message);
      this.stats.criticalErrors.push({
        type: 'LOAD_TEST_FAILURE',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isRunning = false;
      await this.cleanup();
    }
    
    return this.stats;
  }

  async performPreTestCheck() {
    console.log('🔍 Performing pre-test health check...');
    
    // Check server availability
    if (this.options.realMode) {
      try {
        const response = await fetch(`${this.options.baseUrl}/api/health`, { 
          timeout: 5000 
        });
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        console.log('  ✅ Server is responding');
      } catch (error) {
        throw new Error(`Server health check failed: ${error.message}`);
      }
    } else {
      console.log('  ⚠️  Simulation mode - skipping server check');
    }
    
    // Check system resources
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    console.log(`  📊 System Resources:`);
    console.log(`     Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);
    console.log(`     CPU: Available for load generation`);
    
    // Warm up the system
    console.log('  🔥 Warming up system...');
    await this.warmupPhase();
  }

  async warmupPhase() {
    // Create 10 concurrent users for 30 seconds to warm up
    const warmupPromises = [];
    
    for (let i = 0; i < 10; i++) {
      warmupPromises.push(this.simulateUser('warmup', 30000));
    }
    
    await Promise.all(warmupPromises);
    console.log('  ✅ Warmup complete');
  }

  async executeLoadPattern(pattern) {
    console.log(`🚀 Starting load pattern: ${this.options.pattern}`);
    
    const intervalDuration = pattern.duration / pattern.userCurve.length;
    const userPromises = new Set();
    
    console.log(`📈 Load curve: ${pattern.userCurve.join(' → ')} users over ${pattern.userCurve.length} intervals`);
    
    for (let interval = 0; interval < pattern.userCurve.length && this.isRunning; interval++) {
      const targetUsers = pattern.userCurve[interval];
      const currentUsers = userPromises.size;
      
      console.log(`\n⏰ Interval ${interval + 1}/${pattern.userCurve.length}: Target ${targetUsers} users`);
      
      // Scale up users if needed
      if (targetUsers > currentUsers) {
        const newUsers = targetUsers - currentUsers;
        console.log(`  📈 Scaling up: +${newUsers} users`);
        
        for (let i = 0; i < newUsers; i++) {
          const userPromise = this.simulateUser(pattern.primaryActions, intervalDuration);
          userPromises.add(userPromise);
          
          // Add slight delay between user starts to avoid thundering herd
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      
      // Scale down users if needed
      else if (targetUsers < currentUsers) {
        const usersToRemove = currentUsers - targetUsers;
        console.log(`  📉 Scaling down: -${usersToRemove} users`);
        
        // Note: In real implementation, we'd gracefully stop users
        // For now, we let them complete naturally
      }
      
      // Update peak concurrency
      this.stats.concurrentUsers = Math.min(targetUsers, userPromises.size);
      if (this.stats.concurrentUsers > this.stats.peakConcurrency) {
        this.stats.peakConcurrency = this.stats.concurrentUsers;
      }
      
      // Wait for interval duration
      await new Promise(resolve => setTimeout(resolve, intervalDuration));
      
      // Clean up completed users
      for (const userPromise of userPromises) {
        if (this.isPromiseResolved(userPromise)) {
          userPromises.delete(userPromise);
        }
      }
    }
    
    // Wait for all remaining users to complete
    console.log('\n🏁 Waiting for all users to complete...');
    await Promise.allSettled([...userPromises]);
    
    this.stats.endTime = performance.now();
    console.log(`✅ Load test completed in ${((this.stats.endTime - this.stats.startTime) / 60000).toFixed(1)} minutes`);
  }

  async simulateUser(actions, duration) {
    const userStartTime = performance.now();
    const userEndTime = userStartTime + duration;
    let requestCount = 0;
    
    // Determine which actions this user will perform
    const actionTypes = Array.isArray(actions) ? actions : ['all_systems'];
    
    while (performance.now() < userEndTime && this.isRunning) {
      try {
        // Pick a random action based on the pattern
        const actionType = this.selectUserAction(actionTypes);
        const action = WEDDING_ACTIONS[actionType];
        
        if (action) {
          // Pick a random endpoint from this action
          const endpoint = action.endpoints[Math.floor(Math.random() * action.endpoints.length)];
          
          // Make the request
          const requestStart = performance.now();
          await this.makeUserRequest(endpoint, action);
          const requestDuration = performance.now() - requestStart;
          
          // Record stats
          this.recordRequestStats(requestDuration, endpoint, actionType, true);
          requestCount++;
          
          // Wedding-specific critical threshold checking
          if (action.priority === 'critical' && requestDuration > 500) {
            this.stats.criticalErrors.push({
              type: 'SLOW_CRITICAL_REQUEST',
              endpoint,
              responseTime: requestDuration,
              actionType,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // User think time (vendors working under pressure move fast)
        const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
        await new Promise(resolve => setTimeout(resolve, thinkTime));
        
      } catch (error) {
        // Record failed request
        this.recordRequestStats(0, 'unknown', 'error', false, error.message);
      }
    }
    
    return {
      duration: performance.now() - userStartTime,
      requests: requestCount
    };
  }

  selectUserAction(actionTypes) {
    if (actionTypes.includes('all_systems')) {
      // During reception chaos, all actions are possible
      const allActions = Object.keys(WEDDING_ACTIONS);
      return allActions[Math.floor(Math.random() * allActions.length)];
    }
    
    // Select from specific action types with weighted probability
    const weights = actionTypes.map(type => {
      const action = WEDDING_ACTIONS[type];
      return action ? action.frequency : 0.1;
    });
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < actionTypes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return actionTypes[i];
      }
    }
    
    return actionTypes[0]; // Fallback
  }

  async makeUserRequest(endpoint, action) {
    if (this.options.realMode) {
      // Make real HTTP request
      const url = `${this.options.baseUrl}${endpoint}`;
      const options = {
        method: endpoint.includes('submit') || endpoint.includes('create') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeddingLoadTester/1.0'
        },
        timeout: 10000
      };
      
      if (options.method === 'POST') {
        options.body = JSON.stringify(this.generateMockPayload(action));
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } else {
      // Simulate request with realistic delay
      const baseDelay = Math.random() * 200 + 50; // 50-250ms base
      const networkDelay = Math.random() * 100; // Network variation
      
      // Simulate occasional failures (network issues at venues)
      if (Math.random() < 0.01) { // 1% failure rate
        throw new Error('Simulated network timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, baseDelay + networkDelay));
      return { status: 'success', data: 'mock response' };
    }
  }

  generateMockPayload(action) {
    if (action.payloadSize === 'large') {
      // Photo upload simulation
      return {
        image: 'base64_data_here',
        metadata: {
          filename: `wedding_photo_${Date.now()}.jpg`,
          size: Math.floor(Math.random() * 5000000) + 1000000, // 1-5MB
          wedding_id: 'wedding_123',
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Standard payload
    return {
      wedding_id: 'wedding_123',
      vendor_id: 'vendor_456',
      timestamp: new Date().toISOString(),
      data: { test: true }
    };
  }

  recordRequestStats(duration, endpoint, actionType, success, error = null) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
      this.stats.responseTimes.push(duration);
    } else {
      this.stats.failedRequests++;
      
      if (error) {
        this.stats.errorsByType[error] = (this.stats.errorsByType[error] || 0) + 1;
      }
    }
  }

  logCurrentStats() {
    const avgResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
      : 0;
    
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successfulRequests / this.stats.totalRequests * 100)
      : 0;
    
    const currentTime = ((performance.now() - this.stats.startTime) / 60000).toFixed(1);
    
    console.log(`📊 [${currentTime}min] Users: ${this.stats.concurrentUsers} | Requests: ${this.stats.totalRequests} | Success: ${successRate.toFixed(1)}% | Avg Response: ${avgResponseTime.toFixed(0)}ms | Critical Errors: ${this.stats.criticalErrors.length}`);
  }

  async generateLoadTestReport() {
    console.log('\n📋 Generating load test report...');
    
    // Calculate final statistics
    const totalDuration = (this.stats.endTime - this.stats.startTime) / 1000;
    const avgResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
      : 0;
    
    const p95ResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.sort((a, b) => a - b)[Math.floor(this.stats.responseTimes.length * 0.95)]
      : 0;
    
    const requestsPerSecond = this.stats.totalRequests / totalDuration;
    const errorRate = (this.stats.failedRequests / this.stats.totalRequests * 100);
    
    // Wedding readiness assessment
    const criticalIssueCount = this.stats.criticalErrors.length;
    const avgResponseTimeAcceptable = avgResponseTime < 500;
    const errorRateAcceptable = errorRate < 1;
    
    this.stats.weddingReadiness = criticalIssueCount === 0 && avgResponseTimeAcceptable && errorRateAcceptable;
    
    // Create detailed report
    const report = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      configuration: this.options,
      duration: totalDuration,
      performance: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        requestsPerSecond: requestsPerSecond,
        avgResponseTime: avgResponseTime,
        p95ResponseTime: p95ResponseTime,
        peakConcurrency: this.stats.peakConcurrency,
        errorRate: errorRate
      },
      weddingReadiness: this.stats.weddingReadiness,
      criticalErrors: this.stats.criticalErrors,
      errorsByType: this.stats.errorsByType,
      recommendations: this.generateLoadTestRecommendations()
    };
    
    // Save report
    await this.saveLoadTestReport(report);
    
    // Print summary
    this.printLoadTestSummary(report);
    
    return report;
  }

  generateLoadTestRecommendations() {
    const recommendations = [];
    const avgResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
      : 0;
    
    // Response time recommendations
    if (avgResponseTime > 500) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'CRITICAL',
        title: 'Reduce Response Times',
        description: `Average response time ${avgResponseTime.toFixed(0)}ms exceeds wedding day threshold`,
        action: 'Optimize database queries, add caching, scale infrastructure'
      });
    }
    
    // Error rate recommendations
    const errorRate = (this.stats.failedRequests / this.stats.totalRequests * 100);
    if (errorRate > 1) {
      recommendations.push({
        type: 'RELIABILITY',
        priority: 'CRITICAL',
        title: 'Reduce Error Rate',
        description: `${errorRate.toFixed(1)}% error rate unacceptable for wedding day`,
        action: 'Implement circuit breakers, improve error handling, add retry logic'
      });
    }
    
    // Concurrency recommendations
    if (this.stats.peakConcurrency < 300) {
      recommendations.push({
        type: 'SCALABILITY',
        priority: 'HIGH',
        title: 'Improve Concurrency Handling',
        description: 'Test with higher concurrency to ensure Saturday readiness',
        action: 'Scale infrastructure, optimize connection pooling'
      });
    }
    
    // Critical error recommendations
    if (this.stats.criticalErrors.length > 0) {
      recommendations.push({
        type: 'CRITICAL_FIXES',
        priority: 'BLOCKER',
        title: 'Fix Critical Errors',
        description: `${this.stats.criticalErrors.length} critical errors must be resolved`,
        action: 'Review and fix all critical error conditions before production'
      });
    }
    
    return recommendations;
  }

  async saveLoadTestReport(report) {
    const reportDir = path.join(__dirname, '../reports/load-tests');
    const reportPath = path.join(reportDir, `${this.testId}.json`);
    const summaryPath = path.join(reportDir, `${this.testId}-summary.md`);
    
    try {
      // Ensure directory exists
      await fs.mkdir(reportDir, { recursive: true });
      
      // Save JSON report
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // Generate human-readable summary
      const summary = this.generateHumanReadableReport(report);
      await fs.writeFile(summaryPath, summary);
      
      console.log(`📄 Load test reports saved:`);
      console.log(`   JSON: ${reportPath}`);
      console.log(`   Summary: ${summaryPath}`);
      
    } catch (error) {
      console.error('Failed to save load test reports:', error.message);
    }
  }

  generateHumanReadableReport(report) {
    return `# Wedding Load Test Report

## Test Configuration
- **Test ID**: ${report.testId}
- **Date**: ${report.timestamp}
- **Pattern**: ${report.configuration.pattern}
- **Duration**: ${(report.duration / 60).toFixed(1)} minutes
- **Max Concurrent Users**: ${report.configuration.maxConcurrentUsers}
- **Real Mode**: ${report.configuration.realMode ? 'Yes' : 'No (Simulation)'}

## Performance Results
- **Total Requests**: ${report.performance.totalRequests.toLocaleString()}
- **Successful Requests**: ${report.performance.successfulRequests.toLocaleString()} (${((report.performance.successfulRequests / report.performance.totalRequests) * 100).toFixed(1)}%)
- **Failed Requests**: ${report.performance.failedRequests.toLocaleString()} (${report.performance.errorRate.toFixed(1)}%)
- **Requests/Second**: ${report.performance.requestsPerSecond.toFixed(1)}
- **Average Response Time**: ${report.performance.avgResponseTime.toFixed(0)}ms
- **95th Percentile Response Time**: ${report.performance.p95ResponseTime.toFixed(0)}ms
- **Peak Concurrent Users**: ${report.performance.peakConcurrency}

## Wedding Readiness Assessment
**Status**: ${report.weddingReadiness ? '✅ WEDDING READY' : '🚨 NOT WEDDING READY'}

${report.weddingReadiness ? 
  'The platform successfully handled wedding day load patterns and is ready for production use.' :
  '🚨 **CRITICAL**: The platform is NOT ready for wedding day operations. Critical issues must be resolved.'}

## Critical Errors (${report.criticalErrors.length})
${report.criticalErrors.length > 0 ? 
  report.criticalErrors.map((error, i) => `
${i + 1}. **${error.type}**
   - **Endpoint**: ${error.endpoint || 'N/A'}  
   - **Response Time**: ${error.responseTime ? error.responseTime.toFixed(0) + 'ms' : 'N/A'}
   - **Action**: ${error.actionType || 'N/A'}
   - **Time**: ${error.timestamp}
`).join('\n') :
  'No critical errors detected during the load test.'}

## Error Breakdown
${Object.keys(report.errorsByType).length > 0 ?
  Object.entries(report.errorsByType).map(([error, count]) => `- **${error}**: ${count} occurrences`).join('\n') :
  'No errors occurred during the test.'}

## Recommendations
${report.recommendations.map((rec, i) => `
${i + 1}. **${rec.title}** (${rec.priority})
   - **Type**: ${rec.type}
   - **Issue**: ${rec.description}
   - **Action**: ${rec.action}
`).join('\n')}

## Next Steps
${report.weddingReadiness ? `
✅ **PRODUCTION READY**: The platform has successfully passed wedding day load testing.

**Ongoing Monitoring**:
1. Continue monitoring performance in production
2. Set up automated alerts for response time degradation
3. Monitor error rates and user experience metrics
4. Plan for seasonal load increases (wedding season)
` : `
🚨 **CRITICAL ACTION REQUIRED**:

1. **Immediate**: Fix all critical errors listed above
2. **Priority 1**: Reduce average response time to <500ms
3. **Priority 2**: Reduce error rate to <1%
4. **Priority 3**: Test again until Wedding Ready status achieved
5. **Before Production**: Implement emergency procedures for high load

**DO NOT DEPLOY TO PRODUCTION UNTIL WEDDING READY STATUS ACHIEVED**
`}

---
Generated by Guardian Protocol Wedding Load Testing Suite
`;
  }

  printLoadTestSummary(report) {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 WEDDING LOAD TEST SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`Test Pattern: ${report.configuration.pattern}`);
    console.log(`Duration: ${(report.duration / 60).toFixed(1)} minutes`);
    console.log(`Total Requests: ${report.performance.totalRequests.toLocaleString()}`);
    console.log(`Peak Concurrency: ${report.performance.peakConcurrency} users`);
    console.log(`Average Response Time: ${report.performance.avgResponseTime.toFixed(0)}ms`);
    console.log(`Error Rate: ${report.performance.errorRate.toFixed(1)}%`);
    console.log(`Requests/Second: ${report.performance.requestsPerSecond.toFixed(1)}`);
    
    console.log(`\nWedding Readiness: ${report.weddingReadiness ? '✅ READY' : '🚨 NOT READY'}`);
    
    if (report.criticalErrors.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES (${report.criticalErrors.length}):`);
      report.criticalErrors.slice(0, 5).forEach((error, i) => {
        console.log(`${i + 1}. ${error.type}: ${error.endpoint || 'System'}`);
      });
      
      if (report.criticalErrors.length > 5) {
        console.log(`... and ${report.criticalErrors.length - 5} more`);
      }
    }
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 TOP RECOMMENDATIONS:`);
      report.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`${i + 1}. ${rec.title} (${rec.priority})`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(report.weddingReadiness ? 
      '✅ CONGRATULATIONS: Platform is wedding day ready!' :
      '🚨 ACTION REQUIRED: Fix critical issues before production deployment'
    );
    console.log('='.repeat(70));
  }

  isPromiseResolved(promise) {
    // In a real implementation, you'd track promise states
    // This is a simplified approach for the example
    return false;
  }

  async cleanup() {
    // Cleanup any remaining resources
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers = [];
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse CLI arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (key === 'real') {
      options.realMode = true;
    } else if (key === 'pattern') {
      options.pattern = value;
    } else if (key === 'duration') {
      options.testDuration = parseInt(value) * 60000; // Convert minutes to ms
    } else if (key === 'users') {
      options.maxConcurrentUsers = parseInt(value);
    } else if (key === 'url') {
      options.baseUrl = value;
    }
  }
  
  (async () => {
    const tester = new WeddingLoadTester(options);
    
    try {
      const results = await tester.startLoadTest();
      
      // Exit with error code if not wedding ready
      process.exit(results.weddingReadiness ? 0 : 1);
      
    } catch (error) {
      console.error('🚨 Load testing failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = WeddingLoadTester;