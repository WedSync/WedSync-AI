# WS-203-TEAM-E: WebSocket Channels Testing & Documentation Excellence
## Generated: 2025-01-20 | Development Manager Session | Feature: WS-203 WebSocket Channels

---

## 🎯 MISSION: BULLETPROOF WEBSOCKET QUALITY ASSURANCE

**Your mission as Team E (QA/Testing & Documentation Specialists):** Create comprehensive testing infrastructure that validates WebSocket channel isolation, performance under wedding season load, and end-to-end integration flows while producing enterprise-grade documentation that enables teams to maintain and extend the WebSocket system confidently.

**Impact:** Ensures 99.9% reliability when photographers manage 15+ wedding channels simultaneously, prevents cross-wedding message contamination that could confuse suppliers, and provides complete documentation enabling rapid onboarding of new team members during platform scaling.

---

## 📋 EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

Before you can claim completion, you MUST provide concrete evidence:

### 🔍 MANDATORY FILE PROOF
```bash
# Run these exact commands and include output in your completion report:
ls -la $WS_ROOT/wedsync/__tests__/websocket/
ls -la $WS_ROOT/wedsync/__tests__/performance/websocket/
ls -la $WS_ROOT/wedsync/docs/websocket/
cat $WS_ROOT/wedsync/__tests__/websocket/channel-isolation.test.ts | head -20
```

### 🧪 MANDATORY TEST VALIDATION
```bash
# All these commands MUST pass with >90% coverage:
cd $WS_ROOT/wedsync && npm run test:coverage -- --testPathPattern=websocket
cd $WS_ROOT/wedsync && npm run test:e2e -- websocket-channels
cd $WS_ROOT/wedsync && npm run test:load -- websocket-performance
cd $WS_ROOT/wedsync && npm run test:integration -- channel-flows
```

### 🎭 MANDATORY E2E PROOF
Your delivery MUST include Playwright test evidence showing:
- Complete multi-wedding channel isolation validation
- 500+ concurrent connection load testing results  
- End-to-end message delivery flow testing
- Performance regression testing automation
- Cross-browser WebSocket compatibility validation

**NO EXCEPTIONS:** Without this evidence, your work is incomplete regardless of testing quality.

---

## 🧠 ENHANCED SERENA MCP ACTIVATION

### 🤖 SERENA INTELLIGENCE SETUP
```bash
# MANDATORY: Activate Serena's testing pattern analysis
mcp__serena__activate_project("wedsync")
mcp__serena__get_symbols_overview("__tests__/websocket")
mcp__serena__find_symbol("WebSocketTestUtils")
mcp__serena__write_memory("websocket-testing", "Comprehensive WebSocket testing strategy for wedding coordination channels")
```

**Serena-Enhanced Testing Development:**
1. **Test Pattern Analysis**: Analyze existing testing patterns and utilities in codebase
2. **Test Coverage Optimization**: Use Serena to identify untested code paths in WebSocket flows
3. **Mock Integration**: Leverage existing mock utilities for WebSocket testing
4. **Test Maintainability**: Optimize test structure for long-term maintainability

---

## 🧩 SEQUENTIAL THINKING ACTIVATION - TESTING STRATEGY

```typescript
mcp__sequential_thinking__sequentialthinking({
  thought: "I need to design a comprehensive testing strategy for WebSocket channels that covers all wedding coordination scenarios. Key testing challenges: 1) Channel isolation testing (Wedding A messages ≠ Wedding B messages) 2) Performance testing for 500+ concurrent connections 3) Integration testing with external vendor systems 4) Load testing for wedding season traffic spikes 5) End-to-end testing of complete message flows 6) Cross-browser compatibility for real-world usage. The wedding context is critical - any testing gaps could lead to coordination failures during actual weddings.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 9
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For the test architecture, I need: 1) Unit tests for individual WebSocket components (>90% coverage) 2) Integration tests for channel management and message routing 3) E2E tests using Playwright for complete user workflows 4) Load testing infrastructure simulating wedding season peaks 5) Performance regression testing automation 6) Mock WebSocket server for reliable testing 7) Test data factories for wedding scenarios. The test pyramid should emphasize integration and E2E tests due to WebSocket's real-time, stateful nature.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 9
})

mcp__sequential_thinking__sequentialthinking({
  thought: "For wedding-specific test scenarios: 1) Multi-wedding photographer workflow testing (channel switching, message isolation) 2) Venue coordinator broadcast testing (multiple couples, shared channels) 3) Offline/online transition testing (message queuing, delivery guarantees) 4) External integration testing (CRM webhooks, notifications) 5) Performance degradation testing (graceful handling of overload) 6) Security testing (unauthorized channel access, message tampering). Each test must include realistic wedding data and user behavior patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 9
})

// Continue structured analysis through documentation strategy, monitoring, maintenance...
```

---

## 🔐 SECURITY REQUIREMENTS (TEAM E SPECIALIZATION)

### 🚨 MANDATORY SECURITY TESTING

**ALL test scenarios must include security validation:**
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { mockWebSocketServer } from '$WS_ROOT/wedsync/__tests__/utils/websocket-mocks';
import { createTestUser, createTestWedding } from '$WS_ROOT/wedsync/__tests__/utils/test-factories';

describe('WebSocket Security Testing', () => {
  it('prevents cross-wedding channel access', async () => {
    const user1 = await createTestUser('photographer');
    const user2 = await createTestUser('photographer');
    const wedding1 = await createTestWedding(user1.id);
    const wedding2 = await createTestWedding(user2.id);
    
    // user1 should NOT access user2's wedding channel
    const channelName = `supplier:dashboard:${user2.id}:${wedding2.id}`;
    await expect(
      subscribeToChannel(user1.id, channelName)
    ).rejects.toThrow('Unauthorized channel access');
  });
  
  it('validates message authenticity and prevents tampering', async () => {
    // Test HMAC signature validation
    // Test message content sanitization  
    // Test rate limiting enforcement
  });
});
```

### 🔒 TEAM E SECURITY TESTING CHECKLIST
- [ ] Channel access authorization testing (prevent cross-wedding access)
- [ ] Message authentication and signature validation testing
- [ ] Rate limiting enforcement testing (100 messages/minute)
- [ ] Connection limits testing (Free: 3 channels, Paid: 10 channels)
- [ ] Input sanitization testing for all message payloads
- [ ] DoS protection testing (connection flood prevention)
- [ ] Performance security testing (resource exhaustion attacks)
- [ ] Audit logging verification for security events

---

## 💡 UI TECHNOLOGY REQUIREMENTS

### 🎨 DESIGN SYSTEM INTEGRATION
Use our premium component libraries for testing interfaces:

**Untitled UI Components (License: $247 - Premium):**
```typescript
// For test result dashboards and quality metrics
import { Card, Badge, Button, Table } from '@/components/untitled-ui';
import { TestResultCard, CoverageIndicator } from '@/components/untitled-ui/testing';
```

**Magic UI Components (Free Tier):**
```typescript
// For test status indicators and animated feedback
import { PulseDot, TestStatusIcon, ProgressRing } from '@/components/magic-ui';
import { AnimatedCheckmark } from '@/components/magic-ui/feedback';
```

**Mandatory Navigation Integration:**
Every testing feature MUST integrate with navigation:
```typescript
// Add to: src/components/navigation/NavigationItems.tsx
{
  label: 'Test Results',
  href: '/admin/testing/websocket',
  icon: 'test-tube',
  badge: failedTests > 0 ? failedTests : undefined
}
```

---

## 🔧 TEAM E TESTING SPECIALIZATION

### 🎯 YOUR CORE DELIVERABLES

**1. Comprehensive Unit Test Suite**
```typescript
// Required: /__tests__/websocket/channel-manager.test.ts
describe('WebSocketChannelManager', () => {
  describe('Channel Creation', () => {
    it('creates channels with correct wedding naming convention', () => {
      const channel = channelManager.createChannel('supplier', 'dashboard', photographerId);
      expect(channel.name).toBe(`supplier:dashboard:${photographerId}`);
      expect(channel.type).toBe('private');
    });

    it('enforces channel creation limits by user tier', async () => {
      // Free tier: max 3 channels
      const freeUser = await createTestUser('photographer', 'free');
      
      // Create 3 channels - should succeed
      for (let i = 0; i < 3; i++) {
        await expect(channelManager.createChannel('supplier', 'dashboard', `${freeUser.id}-${i}`)).resolves.toBeTruthy();
      }
      
      // 4th channel - should fail
      await expect(channelManager.createChannel('supplier', 'dashboard', `${freeUser.id}-4`)).rejects.toThrow('Channel limit exceeded');
    });

    it('validates channel permissions for wedding context', async () => {
      // Photographers can create supplier channels
      // Couples can create collaboration channels
      // Venues can create shared channels
    });
  });

  describe('Message Delivery', () => {
    it('guarantees message delivery to all subscribers', async () => {
      // Test message delivery guarantees
      // Verify offline message queuing
      // Confirm delivery acknowledgments
    });

    it('prevents message leaking between wedding channels', async () => {
      // Critical wedding isolation test
      const wedding1Channel = 'supplier:dashboard:photo1:wedding1';
      const wedding2Channel = 'supplier:dashboard:photo1:wedding2';
      
      // Send message to wedding1, verify wedding2 doesn't receive it
    });
  });
});
```

**2. Integration Testing Infrastructure**
```typescript
// Required: /__tests__/integration/websocket-integration.test.ts
describe('WebSocket Integration Tests', () => {
  describe('External System Integration', () => {
    it('handles photography CRM webhook integration', async () => {
      // Mock Studio Cloud CRM webhook
      const crmWebhook = createPhotographyCRMWebhook({
        client_id: 'wedding-abc',
        shoot_date: '2024-06-15',
        status: 'confirmed'
      });

      // Send webhook, verify channel broadcast
      const response = await sendWebhook('/api/webhooks/photography-crm', crmWebhook);
      expect(response.status).toBe(200);

      // Verify message appears in correct supplier channel
      const channelMessages = await getChannelMessages(`supplier:dashboard:${photographerId}`);
      expect(channelMessages).toContainMatchingObject({
        type: 'booking-update',
        payload: expect.objectContaining({
          weddingId: 'wedding-abc',
          status: 'confirmed'
        })
      });
    });

    it('handles venue management system integration', async () => {
      // Test VenueMaster webhook integration
      // Verify guest count updates flow correctly
      // Confirm capacity alert delivery
    });
  });

  describe('Multi-Channel Coordination', () => {
    it('coordinates updates across supplier and couple channels', async () => {
      // Test cross-channel coordination flows
      // Verify message routing correctness
      // Confirm delivery to appropriate recipients
    });
  });
});
```

**3. End-to-End Testing with Playwright**
```typescript
// Required: /__tests__/e2e/websocket-workflows.spec.ts
import { test, expect } from '@playwright/test';

test.describe('WebSocket Channel Workflows', () => {
  test('photographer multi-wedding management workflow', async ({ page, context }) => {
    // Setup: Login as photographer with multiple weddings
    await page.goto('/supplier/dashboard');
    await page.fill('[data-testid="login-email"]', 'photographer@wedding.test');
    await page.fill('[data-testid="login-password"]', 'testpassword');
    await page.click('[data-testid="login-submit"]');

    // Verify channel switcher shows multiple weddings
    const channelSwitcher = page.locator('[data-testid="channel-switcher"]');
    await expect(channelSwitcher).toBeVisible();
    
    const weddingChannels = page.locator('[data-testid="wedding-channel"]');
    await expect(weddingChannels).toHaveCount(5); // 5 active weddings

    // Test channel switching performance
    const startTime = Date.now();
    await page.click('[data-testid="wedding-channel-sarah"]');
    await expect(page.locator('[data-testid="active-channel"]')).toContainText('Sarah & Mike Wedding');
    const switchTime = Date.now() - startTime;
    expect(switchTime).toBeLessThan(200); // < 200ms channel switching

    // Test message reception in correct channel
    await page.click('[data-testid="wedding-channel-jessica"]');
    await expect(page.locator('[data-testid="active-channel"]')).toContainText('Jessica & David Wedding');
    
    // Simulate incoming message for Jessica's wedding
    await page.evaluate(() => {
      window.mockWebSocketMessage({
        channel: 'supplier:dashboard:photographer1:jessica-wedding',
        type: 'timeline-update',
        payload: { ceremonyTime: '4:00 PM', message: 'Ceremony time updated' }
      });
    });

    // Verify message appears only in Jessica's channel, not other weddings
    await expect(page.locator('[data-testid="channel-message"]')).toContainText('Ceremony time updated');
    
    await page.click('[data-testid="wedding-channel-sarah"]');
    await expect(page.locator('[data-testid="channel-message"]')).not.toContainText('Ceremony time updated');
  });

  test('venue coordinator broadcast workflow', async ({ page }) => {
    // Test venue coordinator managing multiple couples
    await page.goto('/venue/coordinator');
    
    // Test broadcast message to all couples for venue
    await page.fill('[data-testid="broadcast-message"]', 'Parking update: Use west lot this weekend');
    await page.click('[data-testid="broadcast-to-all"]');
    
    // Verify broadcast delivery confirmation
    await expect(page.locator('[data-testid="broadcast-status"]')).toContainText('Delivered to 8 couples');
  });

  test('offline message queuing workflow', async ({ page, context }) => {
    // Test offline/online message delivery
    await page.goto('/couple/dashboard');
    
    // Simulate going offline
    await context.setOffline(true);
    
    // Simulate messages sent while offline (mock server-side queuing)
    await page.evaluate(() => {
      window.mockOfflineMessages([
        { type: 'photographer-update', message: 'Timeline confirmed for your wedding' },
        { type: 'venue-alert', message: 'Setup complete, ready for ceremony' }
      ]);
    });

    // Come back online
    await context.setOffline(false);
    await page.reload();

    // Verify queued messages are delivered
    await expect(page.locator('[data-testid="message-queue"]')).toContainText('2 messages while offline');
    await page.click('[data-testid="load-queued-messages"]');
    await expect(page.locator('[data-testid="timeline-message"]')).toContainText('Timeline confirmed');
    await expect(page.locator('[data-testid="venue-message"]')).toContainText('Setup complete');
  });
});
```

**4. Performance and Load Testing**
```typescript
// Required: /__tests__/performance/websocket-load.test.ts
describe('WebSocket Performance Testing', () => {
  describe('Connection Scaling', () => {
    it('handles 500+ concurrent connections', async () => {
      const connections = [];
      const connectionPromises = [];

      // Create 500 concurrent connections
      for (let i = 0; i < 500; i++) {
        connectionPromises.push(
          createWebSocketConnection(`test-user-${i}`, `test-channel-${i}`)
        );
      }

      const startTime = Date.now();
      connections.push(...await Promise.all(connectionPromises));
      const connectionTime = Date.now() - startTime;

      expect(connections).toHaveLength(500);
      expect(connectionTime).toBeLessThan(10000); // All connections under 10 seconds
      expect(connections.every(conn => conn.readyState === WebSocket.OPEN)).toBe(true);
    });

    it('maintains performance under wedding season load', async () => {
      // Simulate 10x normal traffic (wedding season peak)
      const loadTestConfig = {
        connections: 2000,
        messagesPerSecond: 1000,
        duration: '5 minutes',
        pattern: 'wedding-season-peak'
      };

      const loadTestResult = await runLoadTest(loadTestConfig);

      expect(loadTestResult.averageResponseTime).toBeLessThan(500);
      expect(loadTestResult.maxResponseTime).toBeLessThan(2000);
      expect(loadTestResult.errorRate).toBeLessThan(0.01);
      expect(loadTestResult.connectionSuccessRate).toBeGreaterThan(0.99);
    });
  });

  describe('Message Throughput', () => {
    it('handles 10,000+ messages per minute', async () => {
      const messageCount = 10000;
      const testDuration = 60000; // 1 minute

      const throughputResult = await testMessageThroughput({
        messageCount,
        duration: testDuration,
        channels: 100
      });

      expect(throughputResult.messagesDelivered).toBeGreaterThanOrEqual(messageCount);
      expect(throughputResult.averageLatency).toBeLessThan(100);
      expect(throughputResult.deliverySuccessRate).toBeGreaterThan(0.999);
    });
  });
});
```

**5. Mock WebSocket Testing Infrastructure**
```typescript
// Required: /__tests__/utils/websocket-mocks.ts
export class MockWebSocketServer {
  private connections = new Map<string, MockWebSocketConnection>();
  private channels = new Map<string, Set<string>>();

  createMockConnection(userId: string, channelName: string): MockWebSocketConnection {
    const connection = new MockWebSocketConnection(userId, channelName);
    this.connections.set(`${userId}:${channelName}`, connection);
    
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
    }
    this.channels.get(channelName)!.add(userId);
    
    return connection;
  }

  broadcastToChannel(channelName: string, message: any): void {
    const subscribers = this.channels.get(channelName);
    if (!subscribers) return;

    subscribers.forEach(userId => {
      const connection = this.connections.get(`${userId}:${channelName}`);
      connection?.receiveMessage(message);
    });
  }

  simulateConnectionFailure(userId: string, channelName: string): void {
    const connection = this.connections.get(`${userId}:${channelName}`);
    connection?.simulateDisconnection();
  }

  getChannelMetrics(channelName: string) {
    return {
      subscriberCount: this.channels.get(channelName)?.size || 0,
      messagesSent: 0, // Track in implementation
      averageLatency: 50 // Mock value
    };
  }
}
```

---

## 💒 WEDDING INDUSTRY CONTEXT

### 🤝 REAL WEDDING SCENARIOS FOR TEAM E

**Scenario 1: Multi-Wedding Photography Business Testing**
- Photographer manages 15 weddings simultaneously during peak season
- Test channel isolation: Sarah's updates don't affect Mike's wedding
- Test performance: Channel switching remains < 200ms with all channels active
- Test message delivery: Couple timeline updates reach correct photographer channel
- Test failure recovery: Network interruption doesn't lose critical coordination messages

**Scenario 2: Venue Coordinator Load Testing**
- Large venue hosts 5 weddings same weekend
- Test broadcast capability: Updates reach all couples without message loss
- Test performance degradation: System maintains stability with high message volume
- Test priority messaging: Emergency updates delivered before routine notifications
- Test cross-channel coordination: Venue changes propagate to all affected suppliers

**Scenario 3: Wedding Season Traffic Surge Testing**
- June wedding season: 10x normal platform traffic
- Test auto-scaling: System handles traffic spikes without performance degradation
- Test connection limits: Free/paid tier restrictions enforced correctly
- Test message queuing: Offline suppliers receive all missed coordination updates
- Test integration reliability: External CRM webhooks continue working under load

### 🔗 WEDDING WORKFLOW TESTING PATTERNS

**Critical Wedding Coordination Tests:**
```typescript
const weddingTestScenarios = {
  photographerWorkflows: [
    'multi-wedding-channel-management',
    'timeline-change-notifications',
    'client-communication-tracking',
    'equipment-coordination-alerts'
  ],
  
  venueCoordination: [
    'capacity-change-broadcasts',
    'setup-timeline-coordination',
    'emergency-alert-distribution',
    'multi-couple-communication'
  ],
  
  coupleExperience: [
    'real-time-supplier-updates',
    'timeline-change-confirmations',
    'vendor-response-tracking',
    'progress-milestone-notifications'
  ],

  systemReliability: [
    'offline-message-recovery',
    'connection-failure-handling',
    'performance-under-load',
    'data-consistency-validation'
  ]
};
```

---

## 🚀 PERFORMANCE REQUIREMENTS

### ⚡ TEAM E TESTING PERFORMANCE STANDARDS

**Test Execution Performance:**
- Unit test suite completion: < 30 seconds
- Integration test suite completion: < 2 minutes
- E2E test suite completion: < 10 minutes
- Load test execution: < 15 minutes

**Test Coverage Requirements:**
- Unit test coverage: >90% for all WebSocket components
- Integration test coverage: >85% for message flows
- E2E test coverage: >80% for critical user workflows
- Performance test coverage: All scalability targets validated

**Testing Infrastructure Performance:**
```typescript
const testingPerformanceTargets = {
  execution: {
    unitTests: '< 30 seconds',
    integrationTests: '< 2 minutes', 
    e2eTests: '< 10 minutes',
    loadTests: '< 15 minutes'
  },
  
  reliability: {
    testFlakiness: '< 1%',
    falsePositiveRate: '< 0.5%',
    testEnvironmentUptime: '> 99%'
  },
  
  coverage: {
    unitTestCoverage: '> 90%',
    integrationCoverage: '> 85%',
    e2eCoverage: '> 80%',
    performanceCoverage: '100% of SLA requirements'
  }
};
```

---

## 🧪 TESTING REQUIREMENTS

### ✅ MANDATORY TEST CATEGORIES

**1. Unit Testing (>90% Coverage)**
- Channel creation and management logic
- Message routing and transformation
- Connection pooling algorithms  
- Cache management strategies
- Security validation functions
- Performance optimization utilities

**2. Integration Testing (>85% Coverage)**
- WebSocket server integration with database
- External webhook processing flows
- Multi-service message delivery
- Cache layer integration
- Authentication and authorization flows
- Error handling and recovery mechanisms

**3. End-to-End Testing (>80% Critical Workflows)**
- Complete photographer multi-wedding workflows
- Venue coordinator broadcast scenarios
- Couple-supplier communication flows
- Offline/online transition handling
- Performance under realistic load conditions
- Cross-browser compatibility validation

**4. Performance Testing (100% SLA Coverage)**
- 500+ concurrent connection handling
- Sub-200ms channel switching validation
- 10,000+ messages/minute throughput
- Wedding season load spike handling
- Memory usage optimization validation
- Auto-scaling trigger verification

**5. Security Testing (100% Attack Vector Coverage)**
- Unauthorized channel access prevention
- Message tampering detection
- Rate limiting enforcement
- DoS attack protection
- Input sanitization validation
- Audit logging verification

---

## 📚 MCP INTEGRATION WORKFLOWS

### 🔧 REQUIRED MCP OPERATIONS

**Ref MCP - Testing Documentation:**
```typescript
await mcp__Ref__ref_search_documentation("Playwright WebSocket testing patterns");
await mcp__Ref__ref_search_documentation("Jest performance testing Node.js");  
await mcp__Ref__ref_search_documentation("load testing WebSocket applications");
await mcp__Ref__ref_search_documentation("test coverage best practices");
```

**Supabase MCP - Test Database Management:**
```typescript
await mcp__supabase__execute_sql("SELECT * FROM websocket_test_metrics ORDER BY created_at DESC LIMIT 10");
await mcp__supabase__apply_migration("test_data_fixtures", testDataMigration);
await mcp__supabase__get_logs("api"); // Analyze test execution logs
```

**Playwright MCP - E2E Testing Execution:**
```typescript
await mcp__playwright__browser_navigate({url: '/test/websocket-demo'});
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Create test WebSocket connections
    const testConnections = [];
    for (let i = 0; i < 10; i++) {
      testConnections.push(new WebSocket(\`ws://localhost:3000/websocket/test-\${i}\`));
    }
    return { connectionsCreated: testConnections.length };
  }`
});
```

### 🎯 AGENT COORDINATION REQUIRED

Launch specialized agents for comprehensive testing development:

```typescript
// 1. Testing task coordination
await Task({
  description: "Coordinate WebSocket testing tasks",
  prompt: `You are the task-tracker-coordinator for WS-203 Team E WebSocket testing development.
  Break down the testing implementation into unit tests, integration tests, E2E workflows, performance testing, and documentation tasks.
  Track dependencies between test infrastructure setup, mock services, and comprehensive test coverage requirements.`,
  subagent_type: "task-tracker-coordinator"
});

// 2. Test automation architect
await Task({
  description: "WebSocket testing architecture",
  prompt: `You are the test-automation-architect for WS-203 WebSocket channel testing.
  Design comprehensive testing strategy covering unit tests (>90% coverage), integration tests for message flows, and E2E tests for wedding coordination workflows.
  Implement performance testing infrastructure validating 500+ concurrent connections and sub-200ms channel switching.
  Create mock WebSocket services for reliable test execution and wedding scenario simulation.
  Focus on channel isolation testing preventing cross-wedding message contamination.`,
  subagent_type: "test-automation-architect"
});

// 3. Performance testing specialist
await Task({
  description: "WebSocket performance testing",
  prompt: `You are the performance-optimization-expert for WS-203 WebSocket performance testing.
  Implement load testing infrastructure simulating wedding season traffic patterns (10x normal load).
  Create performance regression testing automation ensuring sub-200ms channel switching maintained.
  Design concurrent connection testing validating 500+ connections per supplier.
  Implement auto-scaling validation tests for traffic spike handling.`,
  subagent_type: "performance-optimization-expert"
});

// 4. Documentation specialist
await Task({
  description: "WebSocket documentation creation",
  prompt: `You are the documentation-chronicler for WS-203 WebSocket channels documentation.
  Create comprehensive technical documentation covering WebSocket architecture, API endpoints, and integration patterns.
  Develop wedding industry specific usage examples and coordination workflow documentation.
  Document testing strategies, performance benchmarks, and troubleshooting guides.
  Ensure all documentation includes realistic wedding scenarios and business context.`,
  subagent_type: "documentation-chronicler"
});

// 5. Quality assurance specialist
await Task({
  description: "Quality gate enforcement",
  prompt: `You are the code-quality-guardian for WS-203 WebSocket quality assurance.
  Validate all test coverage requirements (>90% unit, >85% integration, >80% E2E).
  Ensure security testing covers all attack vectors and authorization scenarios.
  Verify performance testing validates all SLA requirements and scalability targets.
  Confirm documentation completeness and accuracy for enterprise-grade standards.`,
  subagent_type: "code-quality-guardian"
});
```

---

## 🎖️ COMPLETION CRITERIA

### ✅ DEFINITION OF DONE

**Test Implementation (All MUST exist and pass):**
- [ ] `/__tests__/websocket/channel-manager.test.ts` - Unit tests >90% coverage
- [ ] `/__tests__/integration/websocket-integration.test.ts` - Integration flows >85% coverage  
- [ ] `/__tests__/e2e/websocket-workflows.spec.ts` - E2E workflows >80% coverage
- [ ] `/__tests__/performance/websocket-load.test.ts` - Load testing infrastructure
- [ ] `/__tests__/utils/websocket-mocks.ts` - Mock WebSocket server utilities
- [ ] `/scripts/test-websocket-performance.ts` - Automated performance testing
- [ ] `/__tests__/security/websocket-security.test.ts` - Security vulnerability testing

**Test Coverage Validation:**
- [ ] >90% unit test coverage for WebSocket components
- [ ] >85% integration test coverage for message flows  
- [ ] >80% E2E test coverage for critical workflows
- [ ] 100% performance test coverage for SLA requirements
- [ ] 100% security test coverage for attack vectors

**Performance Test Results:**
- [ ] 500+ concurrent connections validated
- [ ] Sub-200ms channel switching confirmed
- [ ] 10,000+ messages/minute throughput verified
- [ ] Wedding season load scaling (10x) proven
- [ ] Auto-scaling triggers tested and validated

**Documentation Completion:**
- [ ] `/docs/websocket/architecture.md` - Technical architecture guide
- [ ] `/docs/websocket/api-reference.md` - Complete API documentation
- [ ] `/docs/websocket/wedding-workflows.md` - Wedding industry usage guide
- [ ] `/docs/websocket/testing-guide.md` - Testing strategy documentation
- [ ] `/docs/websocket/troubleshooting.md` - Support and debugging guide

**Security Testing Validation:**
- [ ] Channel authorization testing preventing cross-wedding access
- [ ] Message authentication and integrity testing
- [ ] Rate limiting and DoS protection testing  
- [ ] Input sanitization and XSS prevention testing
- [ ] Audit logging and security event tracking testing

---

## 📖 DOCUMENTATION REQUIREMENTS

### 📝 MANDATORY DOCUMENTATION DELIVERABLES

**Technical Architecture Documentation:**
```markdown
# WebSocket Channels Architecture Guide

## System Overview
- Channel-based communication for wedding coordination
- Multi-wedding isolation with secure channel management
- Real-time message delivery with offline queuing support
- Integration with photography CRMs and venue management systems

## Channel Naming Convention
- Supplier Channels: `supplier:dashboard:{supplierId}`
- Collaboration Channels: `collaboration:{supplierId}:{coupleId}`  
- Form Response Channels: `form:response:{formId}:{submissionId}`
- Journey Milestone Channels: `journey:milestone:{coupleId}:{milestoneId}`

## Performance Specifications
- Channel Switching: Sub-200ms (95th percentile)
- Concurrent Connections: 500+ per supplier
- Message Throughput: 10,000+ messages/minute
- Uptime SLA: 99.9% during wedding season
```

**Wedding Industry Usage Guide:**
```markdown
# WebSocket Channels for Wedding Coordination

## Photographer Multi-Wedding Management
1. **Channel Setup**: Create isolated channel per wedding
2. **Timeline Coordination**: Receive real-time ceremony time updates
3. **Client Communication**: Direct messaging within wedding context
4. **Equipment Coordination**: Alert systems for photography logistics

## Venue Coordinator Workflows  
1. **Capacity Management**: Broadcast guest count changes to suppliers
2. **Setup Coordination**: Timeline updates for vendor preparation
3. **Emergency Communication**: Priority alert distribution
4. **Multi-Couple Management**: Broadcast updates to all weekend couples

## Integration Examples
- Studio Cloud CRM timeline synchronization
- VenueMaster capacity alert integration  
- WhatsApp Business notification delivery
- Slack team coordination channels
```

**Testing Strategy Documentation:**
```markdown
# WebSocket Testing Comprehensive Guide

## Test Categories
- **Unit Tests**: Individual component validation (>90% coverage)
- **Integration Tests**: Message flow and external system testing (>85% coverage)
- **E2E Tests**: Complete workflow validation (>80% coverage)
- **Performance Tests**: Load and scalability validation (100% SLA coverage)
- **Security Tests**: Authorization and attack prevention (100% vulnerability coverage)

## Wedding Scenario Testing
- Multi-wedding channel isolation validation
- Photographer workflow performance testing
- Venue coordinator broadcast capability testing
- Couple-supplier communication flow testing
- Wedding season traffic surge testing

## Performance Benchmarks
- 500+ concurrent connections: PASS
- Sub-200ms channel switching: PASS  
- 10,000+ messages/minute: PASS
- 10x traffic scaling: PASS
```

---

## 💼 WEDDING BUSINESS IMPACT

### 📊 SUCCESS METRICS

**Quality Assurance Impact:**
- 99.9% system reliability prevents missed wedding coordination
- Comprehensive testing eliminates cross-wedding message contamination
- Performance validation ensures seamless photographer multi-wedding management
- Security testing protects sensitive wedding data and supplier communications

**Testing Efficiency Gains:**
- Automated testing reduces manual QA effort by 80%
- Performance regression testing prevents production issues
- E2E testing validates complete wedding coordination workflows
- Load testing ensures system readiness for wedding season peaks

**Documentation Value:**
- Enterprise-grade documentation enables rapid team scaling
- Wedding industry specific examples reduce supplier onboarding time
- Troubleshooting guides minimize support ticket resolution time
- API documentation facilitates third-party integration development

---

**🎯 TEAM E SUCCESS DEFINITION:**
You've succeeded when comprehensive testing validates 99.9% system reliability for wedding coordination, performance testing proves the system handles 500+ concurrent connections with sub-200ms channel switching, security testing eliminates all cross-wedding data access risks, and complete documentation enables confident system maintenance and extension.

---

**🚨 FINAL REMINDER - EVIDENCE REQUIRED:**
Your completion report MUST include:
1. File existence proof (`ls -la` output for all test directories)
2. Test coverage reports showing >90% unit, >85% integration, >80% E2E
3. Performance test results validating all SLA requirements
4. Security test results confirming no vulnerabilities
5. Complete documentation delivery with wedding industry examples
6. Playwright E2E evidence of channel isolation and performance validation

**No exceptions. Evidence-based delivery only.**

---

*Generated by WedSync Development Manager*  
*Feature: WS-203 WebSocket Channels*  
*Team: E (QA/Testing & Documentation Specialists)*  
*Scope: Comprehensive testing and documentation for WebSocket channel system*  
*Standards: Evidence-based completion with >90% test coverage and enterprise documentation*