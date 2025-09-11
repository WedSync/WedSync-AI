import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTimeTrend = new Trend('response_time');
const auditLogCounter = new Counter('audit_logs_created');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'baseline' },
    },
    
    // Spike test for wedding day peaks
    wedding_day_spike: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to ceremony
        { duration: '5m', target: 50 },  // Ceremony period
        { duration: '2m', target: 100 }, // Reception spike
        { duration: '8m', target: 100 }, // Reception period
        { duration: '3m', target: 20 },  // Wind down
        { duration: '2m', target: 0 },   // Complete
      ],
      tags: { test_type: 'spike' },
    },
    
    // Stress test to find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 50,
      stages: [
        { duration: '3m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '3m', target: 300 },
        { duration: '3m', target: 400 },
        { duration: '5m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Endurance test for long-running stability
    endurance_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
      tags: { test_type: 'endurance' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
    errors: ['rate<0.01'],
    response_time: ['avg<200'],       // Average response time under 200ms
  },
};

// Test data generators
const weddingActions = [
  'wedding.task.create',
  'wedding.task.update',
  'wedding.task.complete',
  'wedding.guest.add',
  'wedding.guest.update',
  'wedding.vendor.add',
  'wedding.vendor.contact',
  'wedding.budget.update',
  'wedding.timeline.update',
  'wedding.photo.upload',
  'wedding.document.upload',
  'wedding.payment.process',
  'wedding.rsvp.receive',
  'wedding.seating.arrange',
  'wedding.menu.select',
];

const generateUserId = () => `user-${Math.floor(Math.random() * 10000)}`;
const generateResourceId = () => `resource-${Math.floor(Math.random() * 10000)}`;
const generateWeddingId = () => `wedding-${Math.floor(Math.random() * 1000)}`;

const generateAuditPayload = () => ({
  userId: generateUserId(),
  action: weddingActions[Math.floor(Math.random() * weddingActions.length)],
  resourceId: generateResourceId(),
  details: {
    weddingId: generateWeddingId(),
    timestamp: new Date().toISOString(),
    userAgent: 'K6LoadTest/1.0',
    ipAddress: '192.168.1.100',
    sessionId: `session-${Math.floor(Math.random() * 1000)}`,
    metadata: generateWeddingMetadata(),
  },
});

const generateWeddingMetadata = () => {
  const metadataTypes = [
    {
      taskName: 'Choose wedding venue',
      taskStatus: 'in_progress',
      assignedTo: 'couple',
      dueDate: '2024-12-01',
      category: 'venue'
    },
    {
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      rsvpStatus: 'pending',
      dietaryRestrictions: 'vegetarian',
      plusOne: true
    },
    {
      vendorName: 'Elite Catering',
      vendorType: 'catering',
      contractValue: 5000,
      contactEmail: 'info@elitecatering.com',
      status: 'contacted'
    },
    {
      budgetCategory: 'photography',
      budgetAmount: 2500,
      actualSpent: 0,
      remaining: 2500,
      notes: 'Looking for outdoor specialist'
    },
  ];
  
  return metadataTypes[Math.floor(Math.random() * metadataTypes.length)];
};

// Main test function
export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const auditEndpoint = `${baseUrl}/api/audit/log`;
  
  // Generate test payload
  const payload = generateAuditPayload();
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
      'X-Test-Scenario': `k6-${__VU}-${__ITER}`,
    },
    tags: {
      endpoint: 'audit_log',
      action: payload.action,
    },
  };
  
  // Record start time
  const startTime = Date.now();
  
  // Make the request
  const response = http.post(auditEndpoint, JSON.stringify(payload), params);
  
  // Record response time
  const responseTime = Date.now() - startTime;
  responseTimeTrend.add(responseTime);
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': () => responseTime < 500,
    'response has audit_id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.audit_id !== undefined;
      } catch {
        return false;
      }
    },
  });
  
  if (success) {
    auditLogCounter.add(1);
  } else {
    errorRate.add(1);
    console.log(`Request failed: ${response.status} - ${response.body}`);
  }
  
  // Simulate realistic user behavior with pauses
  const thinkTime = Math.random() * 2 + 0.5; // 0.5-2.5 seconds
  sleep(thinkTime);
}

// Setup function to run before tests
export function setup() {
  console.log('Starting K6 Audit Load Tests');
  console.log(`Base URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`Test Token: ${__ENV.TEST_TOKEN ? 'Set' : 'Not Set'}`);
  
  // Verify the audit endpoint is accessible
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const healthCheck = http.get(`${baseUrl}/api/health`);
  
  if (healthCheck.status !== 200) {
    console.error('Health check failed. Audit service may not be available.');
  }
  
  return { baseUrl };
}

// Teardown function to run after tests
export function teardown(data) {
  console.log('K6 Audit Load Tests Completed');
  console.log('Check the results for performance metrics and error rates.');
}

// Handle different test scenarios
export function handleSummary(data) {
  const testType = __ENV.TEST_TYPE || 'baseline';
  
  return {
    [`k6-audit-load-test-${testType}-results.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;
  const colors = {
    reset: enableColors ? '\x1b[0m' : '',
    green: enableColors ? '\x1b[32m' : '',
    red: enableColors ? '\x1b[31m' : '',
    yellow: enableColors ? '\x1b[33m' : '',
    blue: enableColors ? '\x1b[34m' : '',
  };

  let summary = '';
  
  summary += `${colors.blue}=== K6 Audit Load Test Summary ===${colors.reset}\n\n`;
  
  // Test execution info
  summary += `${indent}Test Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += `${indent}Virtual Users: Peak ${data.metrics.vus_max.values.max}\n`;
  summary += `${indent}Iterations: ${data.metrics.iterations.values.count}\n\n`;
  
  // HTTP metrics
  summary += `${colors.yellow}HTTP Performance:${colors.reset}\n`;
  summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  
  // Error rates
  const errorRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;
  const errorColor = errorRate > 0.01 ? colors.red : colors.green;
  summary += `${indent}Error Rate: ${errorColor}${(errorRate * 100).toFixed(2)}%${colors.reset}\n\n`;
  
  // Custom metrics
  if (data.metrics.audit_logs_created) {
    summary += `${colors.yellow}Audit Metrics:${colors.reset}\n`;
    summary += `${indent}Audit Logs Created: ${data.metrics.audit_logs_created.values.count}\n`;
    summary += `${indent}Audit Creation Rate: ${data.metrics.audit_logs_created.values.rate.toFixed(2)}/s\n\n`;
  }
  
  // Threshold results
  summary += `${colors.yellow}Threshold Results:${colors.reset}\n`;
  Object.entries(data.thresholds || {}).forEach(([threshold, result]) => {
    const status = result.ok ? colors.green + 'PASS' : colors.red + 'FAIL';
    summary += `${indent}${threshold}: ${status}${colors.reset}\n`;
  });
  
  // Performance recommendations
  summary += `\n${colors.blue}Performance Analysis:${colors.reset}\n`;
  
  const avgResponseTime = data.metrics.http_req_duration.values.avg;
  if (avgResponseTime > 200) {
    summary += `${indent}⚠️  Average response time (${avgResponseTime.toFixed(2)}ms) exceeds target (200ms)\n`;
  } else {
    summary += `${indent}✅ Average response time within target\n`;
  }
  
  const p95ResponseTime = data.metrics.http_req_duration.values['p(95)'];
  if (p95ResponseTime > 500) {
    summary += `${indent}⚠️  95th percentile response time (${p95ResponseTime.toFixed(2)}ms) exceeds target (500ms)\n`;
  } else {
    summary += `${indent}✅ 95th percentile response time within target\n`;
  }
  
  if (errorRate > 0.01) {
    summary += `${indent}❌ Error rate (${(errorRate * 100).toFixed(2)}%) exceeds target (1%)\n`;
  } else {
    summary += `${indent}✅ Error rate within acceptable limits\n`;
  }
  
  summary += `\n${colors.green}Test completed successfully!${colors.reset}\n`;
  
  return summary;
}

// Wedding-specific load test scenarios
export const weddingScenarios = {
  // Test concurrent wedding planning sessions
  concurrent_planning: function() {
    const planningActions = [
      'wedding.task.create',
      'wedding.task.update',
      'wedding.vendor.search',
      'wedding.budget.update',
      'wedding.timeline.update'
    ];
    
    const action = planningActions[Math.floor(Math.random() * planningActions.length)];
    const payload = {
      userId: generateUserId(),
      action: action,
      resourceId: generateResourceId(),
      details: {
        weddingId: generateWeddingId(),
        phase: 'planning',
        timestamp: new Date().toISOString(),
        planningData: generatePlanningData(action)
      }
    };
    
    return payload;
  },
  
  // Test wedding day intensive logging
  wedding_day_intensive: function() {
    const weddingDayActions = [
      'wedding.ceremony.start',
      'wedding.photo.capture',
      'wedding.guest.checkin',
      'wedding.vendor.checkin',
      'wedding.timeline.update',
      'wedding.emergency.log',
      'wedding.payment.process',
      'wedding.feedback.receive'
    ];
    
    const action = weddingDayActions[Math.floor(Math.random() * weddingDayActions.length)];
    return {
      userId: generateUserId(),
      action: action,
      resourceId: generateResourceId(),
      details: {
        weddingId: generateWeddingId(),
        phase: 'wedding_day',
        timestamp: new Date().toISOString(),
        priority: 'high',
        realTime: true,
        weddingDayData: generateWeddingDayData(action)
      }
    };
  },
  
  // Test post-wedding follow-up activities
  post_wedding_followup: function() {
    const followupActions = [
      'wedding.photo.deliver',
      'wedding.invoice.send',
      'wedding.feedback.collect',
      'wedding.vendor.review',
      'wedding.thank_you.send',
      'wedding.final_payment.process'
    ];
    
    const action = followupActions[Math.floor(Math.random() * followupActions.length)];
    return {
      userId: generateUserId(),
      action: action,
      resourceId: generateResourceId(),
      details: {
        weddingId: generateWeddingId(),
        phase: 'post_wedding',
        timestamp: new Date().toISOString(),
        followupData: generateFollowupData(action)
      }
    };
  }
};

function generatePlanningData(action) {
  const planningData = {
    'wedding.task.create': { taskType: 'venue_booking', priority: 'high', dueDate: '2024-06-15' },
    'wedding.task.update': { status: 'in_progress', completionPercent: 75 },
    'wedding.vendor.search': { category: 'photography', budget: 2500, location: 'Austin, TX' },
    'wedding.budget.update': { category: 'catering', amount: 8000, spent: 3200 },
    'wedding.timeline.update': { event: 'rehearsal_dinner', time: '18:00', location: 'Country Club' }
  };
  
  return planningData[action] || { generic: true };
}

function generateWeddingDayData(action) {
  const weddingDayData = {
    'wedding.ceremony.start': { time: new Date().toISOString(), officiant: 'Rev. Smith', guests: 150 },
    'wedding.photo.capture': { photographer: 'Jane Doe', location: 'church_altar', shots: 25 },
    'wedding.guest.checkin': { guestName: 'John Smith', table: 5, dietary: 'vegetarian' },
    'wedding.vendor.checkin': { vendorName: 'Elite Catering', arrivalTime: new Date().toISOString() },
    'wedding.timeline.update': { event: 'first_dance', delay: 15, reason: 'photos_running_late' },
    'wedding.emergency.log': { type: 'weather', severity: 'low', action: 'moved_to_backup_location' }
  };
  
  return weddingDayData[action] || { generic: true };
}

function generateFollowupData(action) {
  const followupData = {
    'wedding.photo.deliver': { deliveryMethod: 'cloud_link', photoCount: 500, edited: 450 },
    'wedding.invoice.send': { amount: 2500, dueDate: '2024-07-15', paymentMethod: 'bank_transfer' },
    'wedding.feedback.collect': { rating: 5, review: 'Amazing experience!', recommend: true },
    'wedding.vendor.review': { vendor: 'Elite Catering', rating: 4, feedback: 'Great food, minor delays' }
  };
  
  return followupData[action] || { generic: true };
}