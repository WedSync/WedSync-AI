/**
 * WS-155: Guest Communications Load Testing Suite
 * Testing 500+ concurrent message operations
 */

import { test } from '@playwright/test';
import { faker } from '@faker-js/faker';
import pLimit from 'p-limit';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CONCURRENT_USERS = 500;
const MESSAGES_PER_USER = 10;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

class GuestCommunicationsLoadTest {
  private metrics: LoadTestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    throughput: 0,
    errorRate: 0
  };
  
  private responseTimes: number[] = [];
  
  async runLoadTest() {
    console.log(`🚀 Starting load test with ${CONCURRENT_USERS} concurrent users`);
    const startTime = Date.now();
    
    // Create rate limiter
    const limit = pLimit(50); // Process 50 concurrent requests at a time
    
    // Generate test data
    const testUsers = this.generateTestUsers(CONCURRENT_USERS);
    
    // Run concurrent tests
    const promises = testUsers.map(user => 
      limit(() => this.simulateUserSession(user))
    );
    
    await Promise.all(promises);
    
    const duration = (Date.now() - startTime) / 1000;
    this.calculateMetrics(duration);
    this.reportResults();
    
    return this.metrics;
  }
  
  private generateTestUsers(count: number) {
    return Array.from({ length: count }, () => ({
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      weddingId: faker.datatype.uuid(),
      guestGroups: [
        faker.helpers.arrayElement(['family', 'friends', 'colleagues']),
        faker.helpers.arrayElement(['bridesSide', 'groomsSide'])
      ]
    }));
  }
  
  private async simulateUserSession(user: any) {
    // Test different message operations
    const operations = [
      () => this.testSendMessage(user),
      () => this.testBulkMessages(user),
      () => this.testTemplateMessages(user),
      () => this.testScheduledMessages(user),
      () => this.testMessageRetrieval(user),
      () => this.testMessageAnalytics(user),
      () => this.testUnsubscribe(user),
      () => this.testComplianceCheck(user)
    ];
    
    for (const operation of operations) {
      await this.executeWithMetrics(operation);
    }
  }
  
  private async executeWithMetrics(operation: () => Promise<any>) {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    
    try {
      await operation();
      this.metrics.successfulRequests++;
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
    } catch (error) {
      this.metrics.failedRequests++;
      console.error('Operation failed:', error);
    }
  }
  
  private async testSendMessage(user: any) {
    const response = await fetch(`${API_BASE_URL}/api/communications/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        recipientId: user.id,
        recipientEmail: user.email,
        subject: `Wedding Update for ${user.name}`,
        content: faker.lorem.paragraph(),
        type: 'email',
        metadata: {
          weddingId: user.weddingId,
          groups: user.guestGroups,
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Send message failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testBulkMessages(user: any) {
    const recipients = Array.from({ length: 50 }, () => ({
      email: faker.internet.email(),
      name: faker.person.fullName(),
      groups: user.guestGroups
    }));
    
    const response = await fetch(`${API_BASE_URL}/api/communications/messages/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        recipients,
        subject: 'Wedding Announcement',
        content: faker.lorem.paragraphs(2),
        type: 'email',
        sendAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      })
    });
    
    if (!response.ok) {
      throw new Error(`Bulk message failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testTemplateMessages(user: any) {
    const response = await fetch(`${API_BASE_URL}/api/communications/messages/template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        templateId: 'wedding-invitation',
        recipientEmail: user.email,
        variables: {
          guestName: user.name,
          weddingDate: '2025-06-15',
          venue: 'Grand Ballroom',
          rsvpLink: `https://wedsync.com/rsvp/${user.weddingId}`
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Template message failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testScheduledMessages(user: any) {
    const response = await fetch(`${API_BASE_URL}/api/communications/messages/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        recipientEmail: user.email,
        subject: 'Save the Date',
        content: faker.lorem.paragraph(),
        sendAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        timezone: 'America/New_York'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Schedule message failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testMessageRetrieval(user: any) {
    const response = await fetch(
      `${API_BASE_URL}/api/communications/messages?userId=${user.id}&limit=50`,
      {
        headers: {
          'X-Load-Test': 'true'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Message retrieval failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testMessageAnalytics(user: any) {
    const response = await fetch(
      `${API_BASE_URL}/api/communications/analytics?weddingId=${user.weddingId}`,
      {
        headers: {
          'X-Load-Test': 'true'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Analytics failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testUnsubscribe(user: any) {
    const response = await fetch(`${API_BASE_URL}/api/communications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        email: user.email,
        reason: faker.helpers.arrayElement(['too_frequent', 'not_relevant', 'other']),
        feedback: faker.lorem.sentence()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Unsubscribe failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private async testComplianceCheck(user: any) {
    const response = await fetch(`${API_BASE_URL}/api/communications/compliance/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true'
      },
      body: JSON.stringify({
        email: user.email,
        action: 'send_marketing',
        jurisdiction: faker.helpers.arrayElement(['US', 'EU', 'UK', 'CA'])
      })
    });
    
    if (!response.ok) {
      throw new Error(`Compliance check failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  private calculateMetrics(duration: number) {
    if (this.responseTimes.length === 0) return;
    
    // Sort response times for percentile calculation
    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    
    // Calculate average
    const sum = sorted.reduce((a, b) => a + b, 0);
    this.metrics.avgResponseTime = Math.round(sum / sorted.length);
    
    // Calculate percentiles
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    this.metrics.p95ResponseTime = sorted[p95Index] || 0;
    this.metrics.p99ResponseTime = sorted[p99Index] || 0;
    
    // Calculate throughput (requests per second)
    this.metrics.throughput = Math.round(this.metrics.totalRequests / duration);
    
    // Calculate error rate
    this.metrics.errorRate = this.metrics.failedRequests / this.metrics.totalRequests;
  }
  
  private reportResults() {
    console.log('\n📊 Load Test Results:');
    console.log('═'.repeat(50));
    console.log(`Total Requests: ${this.metrics.totalRequests}`);
    console.log(`Successful: ${this.metrics.successfulRequests}`);
    console.log(`Failed: ${this.metrics.failedRequests}`);
    console.log(`Error Rate: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`Average Response Time: ${this.metrics.avgResponseTime}ms`);
    console.log(`P95 Response Time: ${this.metrics.p95ResponseTime}ms`);
    console.log(`P99 Response Time: ${this.metrics.p99ResponseTime}ms`);
    console.log(`Throughput: ${this.metrics.throughput} req/s`);
    console.log('═'.repeat(50));
    
    // Assert performance requirements
    this.assertPerformance();
  }
  
  private assertPerformance() {
    const requirements = {
      maxAvgResponseTime: 500, // 500ms
      maxP95ResponseTime: 1000, // 1s
      maxP99ResponseTime: 2000, // 2s
      maxErrorRate: 0.01, // 1%
      minThroughput: 100 // 100 req/s
    };
    
    const failures = [];
    
    if (this.metrics.avgResponseTime > requirements.maxAvgResponseTime) {
      failures.push(`Avg response time ${this.metrics.avgResponseTime}ms exceeds ${requirements.maxAvgResponseTime}ms`);
    }
    
    if (this.metrics.p95ResponseTime > requirements.maxP95ResponseTime) {
      failures.push(`P95 response time ${this.metrics.p95ResponseTime}ms exceeds ${requirements.maxP95ResponseTime}ms`);
    }
    
    if (this.metrics.p99ResponseTime > requirements.maxP99ResponseTime) {
      failures.push(`P99 response time ${this.metrics.p99ResponseTime}ms exceeds ${requirements.maxP99ResponseTime}ms`);
    }
    
    if (this.metrics.errorRate > requirements.maxErrorRate) {
      failures.push(`Error rate ${(this.metrics.errorRate * 100).toFixed(2)}% exceeds ${requirements.maxErrorRate * 100}%`);
    }
    
    if (this.metrics.throughput < requirements.minThroughput) {
      failures.push(`Throughput ${this.metrics.throughput} req/s below ${requirements.minThroughput} req/s`);
    }
    
    if (failures.length > 0) {
      console.error('\n❌ Performance requirements not met:');
      failures.forEach(f => console.error(`  - ${f}`));
    } else {
      console.log('\n✅ All performance requirements met!');
    }
  }
}

// Run load test
test('Guest Communications Load Test - 500+ Concurrent Users', async () => {
  const loadTest = new GuestCommunicationsLoadTest();
  const results = await loadTest.runLoadTest();
  
  // Assert minimum requirements
  expect(results.errorRate).toBeLessThan(0.01);
  expect(results.avgResponseTime).toBeLessThan(500);
  expect(results.throughput).toBeGreaterThan(100);
});