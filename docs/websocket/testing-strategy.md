# WebSocket Testing Strategy

## Testing Framework Overview

WedSync's WebSocket testing strategy ensures bulletproof reliability for wedding day operations. The comprehensive testing suite validates functionality, performance, security, and reliability across all wedding industry scenarios.

## Testing Architecture

### Test Pyramid Structure
```
         /\
        /E2E\     (20%) - Wedding Day Workflows
       /______\
      /Integration\ (30%) - System Component Testing  
     /____________\
    /    Unit      \ (50%) - Component Functionality
   /________________\
```

### Coverage Requirements
- **Unit Tests**: >90% code coverage for WebSocket components
- **Integration Tests**: >85% coverage for message flows and external systems
- **E2E Tests**: >80% coverage for complete wedding workflows
- **Performance Tests**: 500+ concurrent connections validation
- **Security Tests**: 100% coverage of attack vectors

## Unit Testing Strategy

### Target Components
- `RealtimeSubscriptionManager` - Core WebSocket management
- Channel isolation logic - Cross-wedding message prevention
- Message routing and filtering
- Authentication and authorization
- Error handling and recovery

### Testing Framework
**Primary**: Jest with TypeScript
**Mocking**: WebSocket server simulation
**Assertions**: Custom wedding industry matchers

### Example Unit Test Structure

```typescript
// __tests__/websocket/channel-manager.test.ts
describe('RealtimeSubscriptionManager', () => {
  let channelManager: RealtimeSubscriptionManager;
  let mockSupabaseClient: jest.Mocked<SupabaseClient>;
  
  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    channelManager = RealtimeSubscriptionManager.getInstance();
  });
  
  describe('Wedding Channel Isolation', () => {
    it('prevents cross-wedding message leakage', async () => {
      // Subscribe to Wedding A
      const weddingA = await channelManager.subscribe({
        organizationId: 'org_123',
        userId: 'user_456',
        channelName: `supplier:dashboard:wedding_a`,
        channelType: 'supplier_dashboard',
        weddingId: 'wedding_a'
      });
      
      // Subscribe to Wedding B  
      const weddingB = await channelManager.subscribe({
        organizationId: 'org_123',
        userId: 'user_456',
        channelName: `supplier:dashboard:wedding_b`,
        channelType: 'supplier_dashboard',
        weddingId: 'wedding_b'
      });
      
      // Send message to Wedding A
      const messageA = {
        type: 'timeline_update',
        weddingId: 'wedding_a',
        message: 'Ceremony delayed 15 minutes'
      };
      
      await simulateMessage(weddingA.subscriptionId, messageA);
      
      // Verify Wedding B doesn't receive Wedding A message
      const weddingBMessages = getReceivedMessages(weddingB.subscriptionId);
      expect(weddingBMessages).not.toContainMessage(messageA);
    });
  });
  
  describe('Performance Requirements', () => {
    it('switches channels within 200ms', async () => {
      const startTime = Date.now();
      
      const result = await channelManager.subscribe({
        organizationId: 'org_123',
        userId: 'user_456',
        channelName: `supplier:dashboard:wedding_new`,
        channelType: 'supplier_dashboard'
      });
      
      const switchTime = Date.now() - startTime;
      expect(switchTime).toBeLessThan(200);
      expect(result.success).toBe(true);
    });
  });
});
```

### Wedding Industry Test Scenarios

#### Multi-Wedding Photographer Tests
```typescript
describe('Multi-Wedding Photographer Scenarios', () => {
  it('handles Saturday wedding season load', async () => {
    const photographer = createTestPhotographer();
    const weddings = createSaturdayWeddingSchedule(3); // 3 simultaneous weddings
    
    // Subscribe to all wedding channels
    for (const wedding of weddings) {
      await photographer.subscribeToWedding(wedding.id);
    }
    
    // Simulate rapid channel switching
    for (let i = 0; i < 50; i++) {
      const randomWedding = weddings[Math.floor(Math.random() * weddings.length)];
      const switchTime = await photographer.switchToWedding(randomWedding.id);
      expect(switchTime).toBeLessThan(200);
    }
    
    // Verify channel isolation maintained
    await verifyNoMessageLeakage(weddings);
  });
});
```

#### Venue Coordination Tests  
```typescript
describe('Venue Multi-Event Coordination', () => {
  it('broadcasts venue-wide announcements', async () => {
    const venue = createTestVenue();
    const events = [
      { id: 'wedding_1', spaces: ['ceremony', 'reception'] },
      { id: 'wedding_2', spaces: ['garden', 'ballroom'] }
    ];
    
    // Initialize venue channels
    for (const event of events) {
      await venue.initializeEventChannels(event);
    }
    
    // Broadcast emergency message
    const emergency = {
      type: 'weather_alert',
      message: 'Moving ceremonies indoors due to rain',
      severity: 'high'
    };
    
    await venue.broadcastEmergency(emergency);
    
    // Verify all spaces received message
    for (const event of events) {
      for (const space of event.spaces) {
        const messages = venue.getMessagesForSpace(event.id, space);
        expect(messages).toContainMessage(emergency);
      }
    }
  });
});
```

## Integration Testing Strategy

### Integration Points
- **Supabase Realtime**: PostgreSQL change stream integration
- **Authentication**: JWT token validation and RLS enforcement
- **CRM Webhooks**: External system message routing
- **Email/SMS**: Notification system integration
- **Mobile Apps**: Cross-platform WebSocket compatibility

### Mock WebSocket Server

```typescript
// __tests__/utils/mockWebSocketServer.ts
class MockWebSocketServer {
  private connections = new Map<string, WebSocket>();
  private messageHistory = new Map<string, any[]>();
  
  async startServer(port: number = 8080) {
    this.server = new WebSocketServer({ port });
    
    this.server.on('connection', (ws, request) => {
      const connectionId = generateConnectionId();
      this.connections.set(connectionId, ws);
      
      ws.on('message', (data) => {
        this.handleMessage(connectionId, JSON.parse(data.toString()));
      });
      
      ws.on('close', () => {
        this.connections.delete(connectionId);
      });
    });
  }
  
  simulateMessage(connectionId: string, message: any) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.send(JSON.stringify(message));
    }
  }
  
  getMessageHistory(connectionId: string) {
    return this.messageHistory.get(connectionId) || [];
  }
}
```

### Integration Test Examples

#### CRM Webhook Integration
```typescript
describe('Photography CRM Integration', () => {
  it('processes Tave booking webhooks', async () => {
    const mockCRMPayload = {
      event_type: 'booking_confirmed',
      client_id: 'client_123',
      wedding_date: '2025-06-15',
      package_details: {
        type: 'full_day_photography',
        hours: 10,
        total_amount: 4500.00
      }
    };
    
    // Send CRM webhook
    const response = await fetch('/api/webhooks/tave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockCRMPayload)
    });
    
    expect(response.status).toBe(200);
    
    // Verify WebSocket message generated
    const photographerMessages = await getPhotographerMessages('user_photographer_123');
    expect(photographerMessages).toContainMatchingMessage({
      type: 'booking_confirmed',
      client_id: 'client_123'
    });
  });
});
```

#### WhatsApp Business API Integration
```typescript
describe('WhatsApp Business Integration', () => {
  it('routes guest messages to wedding coordinators', async () => {
    const whatsappMessage = {
      from: '+44123456789',
      message: 'Can I change my meal choice to vegetarian?',
      wedding_context: 'wedding_smith_june_2025'
    };
    
    // Process WhatsApp webhook
    await processWhatsAppMessage(whatsappMessage);
    
    // Verify coordinator receives message
    const coordinatorMessages = await getCoordinatorMessages('wedding_smith_june_2025');
    expect(coordinatorMessages).toContainMessage({
      type: 'guest_communication',
      source: 'whatsapp',
      message: whatsappMessage.message
    });
  });
});
```

## End-to-End Testing Strategy

### E2E Testing Framework
**Primary**: Playwright with TypeScript
**Browsers**: Chrome, Firefox, Safari, Mobile Chrome
**Real Devices**: iPhone, Android for mobile testing

### Wedding Day Simulation Tests

#### Complete Wedding Workflow Test
```typescript
// __tests__/e2e/wedding-day-workflow.spec.ts
test('Complete wedding day coordination workflow', async ({ page, context }) => {
  // Setup wedding day scenario
  const weddingData = await setupWeddingDay({
    photographer: 'John Smith Photography',
    venue: 'Riverside Manor',
    couple: 'Emma & James Wilson',
    guestCount: 150,
    vendors: ['photographer', 'venue', 'caterer', 'florist', 'dj']
  });
  
  // Photographer starts day
  await page.goto('/supplier/dashboard');
  await page.locator('[data-testid="wedding-selector"]').selectOption(weddingData.id);
  
  // Verify real-time timeline display
  await expect(page.locator('[data-testid="timeline-display"]')).toBeVisible();
  
  // Simulate ceremony delay
  await page.locator('[data-testid="report-delay"]').click();
  await page.fill('[data-testid="delay-reason"]', 'Bride running 15 minutes late');
  await page.locator('[data-testid="submit-delay"]').click();
  
  // Open new tab as venue coordinator
  const venueContext = await context.newPage();
  await venueContext.goto('/venue/coordination');
  
  // Verify venue coordinator receives delay notification
  await expect(venueContext.locator('[data-testid="delay-notification"]')).toBeVisible();
  await expect(venueContext.locator('[data-testid="delay-notification"]')).toContainText('15 minutes late');
  
  // Venue coordinator adjusts setup
  await venueContext.locator('[data-testid="adjust-timeline"]').click();
  await venueContext.locator('[data-testid="confirm-adjustment"]').click();
  
  // Verify all stakeholders receive timeline update
  await verifyTimelineUpdateReceived([
    'photographer',
    'caterer', 
    'florist',
    'dj'
  ]);
  
  // Performance validation
  const timelineUpdateTime = await measureTimelineUpdatePropagation();
  expect(timelineUpdateTime).toBeLessThan(500); // 500ms max
});
```

#### Multi-Wedding Photographer E2E
```typescript
test('Photographer manages multiple weddings with channel isolation', async ({ page, context }) => {
  // Setup 3 concurrent weddings
  const weddings = [
    await setupWedding('Wilson Wedding', '2:00 PM'),
    await setupWedding('Thompson Wedding', '4:00 PM'), 
    await setupWedding('Davis Wedding', '6:00 PM')
  ];
  
  await page.goto('/supplier/dashboard');
  
  // Subscribe to all weddings
  for (const wedding of weddings) {
    await page.locator(`[data-testid="wedding-${wedding.id}"]`).click();
    await expect(page.locator(`[data-testid="wedding-${wedding.id}-connected"]`)).toBeVisible();
  }
  
  // Switch between weddings rapidly
  for (let i = 0; i < 10; i++) {
    const wedding = weddings[i % weddings.length];
    const startTime = Date.now();
    
    await page.locator(`[data-testid="wedding-${wedding.id}"]`).click();
    await expect(page.locator(`[data-testid="active-wedding-${wedding.id}"]`)).toBeVisible();
    
    const switchTime = Date.now() - startTime;
    expect(switchTime).toBeLessThan(200); // Channel switch performance requirement
  }
  
  // Verify channel isolation
  await sendTestMessage(weddings[0].id, 'Wilson ceremony starting');
  
  // Switch to Thompson wedding
  await page.locator(`[data-testid="wedding-${weddings[1].id}"]`).click();
  
  // Verify Wilson message not visible in Thompson context
  await expect(page.locator('[data-testid="messages"]')).not.toContainText('Wilson ceremony starting');
});
```

## Performance Testing Strategy

### Load Testing Requirements
- **Concurrent Connections**: 500+ simultaneous WebSocket connections
- **Message Throughput**: 10,000+ messages per minute
- **Response Time**: <200ms for channel operations
- **Memory Usage**: <50MB per 100 connections
- **Wedding Season Scale**: 10x normal traffic handling

### Performance Test Implementation

```typescript
// __tests__/performance/websocket-load.test.ts
describe('WebSocket Performance Testing', () => {
  test('500+ concurrent connections', async () => {
    const targetConnections = 500;
    const connections: WebSocketConnection[] = [];
    
    // Create connections in batches
    const batchSize = 50;
    for (let batch = 0; batch < targetConnections / batchSize; batch++) {
      const batchPromises = [];
      
      for (let i = 0; i < batchSize; i++) {
        batchPromises.push(createWebSocketConnection({
          userId: `user_${batch * batchSize + i}`,
          organizationId: `org_${Math.floor((batch * batchSize + i) / 10)}`,
          channelType: 'supplier_dashboard'
        }));
      }
      
      const batchConnections = await Promise.all(batchPromises);
      connections.push(...batchConnections);
      
      // Pause between batches to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    expect(connections.length).toBe(targetConnections);
    expect(connections.filter(c => c.readyState === WebSocket.OPEN).length).toBe(targetConnections);
  });
  
  test('message throughput under load', async () => {
    const connections = await createConnections(100);
    const messagesPerConnection = 100;
    const totalMessages = connections.length * messagesPerConnection;
    
    const startTime = Date.now();
    
    // Send messages from all connections simultaneously
    const messagePromises = connections.flatMap(connection => 
      Array.from({ length: messagesPerConnection }, (_, i) => 
        connection.sendMessage({
          type: 'test_message',
          sequence: i,
          timestamp: Date.now()
        })
      )
    );
    
    await Promise.all(messagePromises);
    
    const endTime = Date.now();
    const messagesPerMinute = (totalMessages / ((endTime - startTime) / 1000)) * 60;
    
    expect(messagesPerMinute).toBeGreaterThan(10000);
  });
});
```

### Wedding Season Load Simulation

```typescript
test('Wedding season Saturday simulation', async () => {
  // Simulate peak Saturday: 20 weddings, 150 guests each, 10 vendors each
  const weddingScenario = {
    weddings: 20,
    guestsPerWedding: 150,
    vendorsPerWedding: 10,
    peakHours: ['2PM-4PM', '5PM-7PM'], // Ceremony and reception times
  };
  
  const totalConnections = weddingScenario.weddings * 
    (weddingScenario.guestsPerWedding + weddingScenario.vendorsPerWedding);
  
  console.log(`Simulating ${totalConnections} concurrent connections`);
  
  // Gradual ramp-up to simulate wedding day progression
  await rampUpConnections(totalConnections, {
    rampDuration: '10 minutes',
    plateauDuration: '2 hours',
    rampDown: '30 minutes'
  });
  
  // Monitor performance during peak
  const metrics = await monitorPerformance({
    duration: '2 hours',
    sampleInterval: '30 seconds'
  });
  
  expect(metrics.averageResponseTime).toBeLessThan(200);
  expect(metrics.errorRate).toBeLessThan(0.001); // <0.1% error rate
  expect(metrics.memoryUsage.peak).toBeLessThan(calculateMaxMemory(totalConnections));
});
```

## Security Testing Strategy

### Security Test Coverage
- **Authentication Bypass**: Attempting unauthorized channel access
- **Cross-Wedding Data Leakage**: Message isolation validation
- **Injection Attacks**: SQL injection and XSS prevention
- **Rate Limiting**: DDoS protection validation
- **Data Encryption**: Message payload security

### Security Test Examples

```typescript
describe('WebSocket Security Testing', () => {
  test('prevents unauthorized channel access', async () => {
    const unauthorizedUser = createTestUser({ role: 'guest' });
    
    // Attempt to access photographer channel
    const accessAttempt = await attemptChannelAccess({
      userId: unauthorizedUser.id,
      channelName: 'supplier:dashboard:photographer_123',
      channelType: 'supplier_dashboard'
    });
    
    expect(accessAttempt.success).toBe(false);
    expect(accessAttempt.error).toBe('insufficient_permissions');
  });
  
  test('validates message payload sanitization', async () => {
    const maliciousMessage = {
      type: 'timeline_update',
      message: '<script>alert("XSS")</script>',
      weddingId: 'wedding_123'
    };
    
    const result = await sendMessage('channel_123', maliciousMessage);
    
    // Verify message was sanitized
    expect(result.sanitizedMessage.message).not.toContain('<script>');
    expect(result.sanitizedMessage.message).toBe('alert("XSS")');
  });
  
  test('enforces rate limiting', async () => {
    const user = createTestUser();
    const connection = await createConnection(user);
    
    // Send messages rapidly to trigger rate limiting
    const rapidMessages = Array.from({ length: 100 }, (_, i) => ({
      type: 'spam_test',
      sequence: i
    }));
    
    const results = await Promise.allSettled(
      rapidMessages.map(msg => connection.sendMessage(msg))
    );
    
    // Verify some messages were rate limited
    const rateLimited = results.filter(r => 
      r.status === 'rejected' && r.reason.code === 'RATE_LIMIT_EXCEEDED'
    );
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

## Test Data and Fixtures

### Wedding Industry Test Data

```typescript
// __tests__/fixtures/weddingData.ts
export const testWeddingScenarios = {
  smallIntimateWedding: {
    guestCount: 30,
    vendors: ['photographer', 'officiant'],
    duration: '4 hours',
    complexity: 'low'
  },
  
  traditionalWedding: {
    guestCount: 150,
    vendors: ['photographer', 'venue', 'caterer', 'florist', 'dj', 'planner'],
    duration: '8 hours',
    complexity: 'medium'
  },
  
  largeLuxuryWedding: {
    guestCount: 300,
    vendors: ['photographer', 'videographer', 'venue', 'caterer', 'florist', 
             'dj', 'planner', 'decorator', 'transport', 'security'],
    duration: '12 hours',
    complexity: 'high'
  },
  
  destinationWedding: {
    guestCount: 75,
    vendors: ['photographer', 'venue', 'caterer', 'planner'],
    duration: '3 days',
    complexity: 'high',
    special_considerations: ['timezone_coordination', 'international_guests']
  }
};
```

## Continuous Integration Testing

### CI/CD Pipeline Integration

```yaml
# .github/workflows/websocket-tests.yml
name: WebSocket Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Unit Tests
        run: |
          npm run test:unit:websocket
          npm run test:coverage:websocket
      - name: Coverage Report
        run: |
          npx jest --coverage --testPathPattern=websocket
          
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test_password
    steps:
      - name: Run Integration Tests
        run: npm run test:integration:websocket
        
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Playwright Tests
        run: |
          npx playwright install
          npm run test:e2e:websocket
          
  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Load Tests
        run: npm run test:performance:websocket
      - name: Performance Regression Check
        run: npm run check:performance:regression
```

### Test Reporting and Metrics

```typescript
// Test reporting configuration
export const testReporting = {
  coverageThreshold: {
    unit: 90,      // >90% unit test coverage
    integration: 85, // >85% integration coverage
    e2e: 80        // >80% E2E coverage
  },
  
  performanceThresholds: {
    channelSwitch: 200,     // <200ms channel switching
    messageDelivery: 500,   // <500ms message delivery
    concurrentConnections: 500, // 500+ concurrent connections
    memoryPerConnection: 0.5    // <0.5MB per connection
  },
  
  reliabilityTargets: {
    uptime: 99.9,           // 99.9% uptime
    errorRate: 0.1,         // <0.1% error rate
    messageDelivery: 99.9   // 99.9% message delivery success
  }
};
```

This comprehensive testing strategy ensures WedSync's WebSocket infrastructure meets the demanding requirements of the wedding industry while maintaining bulletproof reliability for wedding day operations.