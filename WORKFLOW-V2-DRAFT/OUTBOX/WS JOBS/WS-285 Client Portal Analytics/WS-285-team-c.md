# TEAM C - ROUND 1: WS-285 - Client Portal Analytics
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build real-time analytics synchronization and intelligent benchmarking system with external wedding data integrations
**FEATURE ID:** WS-285 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about live analytics updates, wedding industry benchmarks, and cross-platform analytics coordination

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/analytics/
cat $WS_ROOT/wedsync/src/lib/integrations/analytics/RealtimeAnalyticsManager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test analytics-integration
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query real-time analytics and integration patterns
await mcp__serena__search_for_pattern("realtime analytics integration webhook");
await mcp__serena__find_symbol("RealtimeManager AnalyticsSync", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### B. INTEGRATION PATTERNS ANALYSIS (MANDATORY)
```typescript
// CRITICAL: Load existing integration and realtime patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/base-connector.ts");
await mcp__serena__search_for_pattern("supabase realtime analytics");
await mcp__serena__find_symbol("WebhookHandler RealtimeSubscription", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to real-time analytics
# Use Ref MCP to search for:
# - "Supabase realtime-analytics wedding-data streaming"
# - "Analytics benchmarking industry-standards API"
# - "Real-time dashboard updates websocket"
# - "Wedding analytics integration patterns"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand real-time and analytics integration patterns
await mcp__serena__find_referencing_symbols("realtime analytics webhook");
await mcp__serena__search_for_pattern("integration analytics sync");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Real-time Analytics Integration Strategy
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time client analytics requires: live progress updates when tasks complete, instant budget recalculation when expenses added, immediate guest analytics updates when RSVPs received, vendor analytics refresh when communications occur, timeline analytics updates when milestones achieved, cross-platform sync to mobile/desktop.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding industry benchmarking complexity: Compare client progress against similar weddings (size, budget, location, style), seasonal trends affect vendor availability and pricing, regional differences in wedding customs and timelines, venue type influences planning complexity, guest count impacts coordination needs.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Analytics synchronization challenges: Multiple users (couple, families, wedding party) viewing same analytics simultaneously, changes from different platforms (mobile, desktop) need instant reflection, vendor updates from external systems require integration, guest responses from various sources need aggregation, timeline changes from calendar integrations.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "External data integration requirements: Wedding vendor APIs for booking status updates, guest response aggregation from multiple invitation platforms, budget tracking from payment platforms, timeline synchronization with calendar systems, industry benchmark data from wedding planning associations, weather data for outdoor venue analytics.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time architecture strategy: Supabase realtime for core wedding data changes, webhook system for external platform updates, WebSocket connections for instant client updates, intelligent caching for expensive benchmark calculations, event-driven updates to minimize database load, conflict resolution for concurrent analytics updates.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities:**

1. **task-tracker-coordinator** --think-hard --use-serena --realtime-requirements
   - Mission: Track real-time analytics requirements, integration dependencies, sync specifications

2. **integration-specialist** --think-ultra-hard --analytics-sync-expert --wedding-benchmarks
   - Mission: Build comprehensive real-time analytics synchronization and benchmarking system

3. **realtime-architect** --continuous --supabase-realtime --analytics-streaming
   - Mission: Design real-time analytics update system with WebSocket coordination

4. **webhook-specialist** --security-first --external-integrations --analytics-webhooks
   - Mission: Create webhook system for external wedding platform analytics integration

5. **test-automation-architect** --integration-testing --realtime-testing --analytics-accuracy
   - Mission: Create comprehensive integration and real-time analytics testing

6. **documentation-chronicler** --detailed-evidence --integration-architecture
   - Mission: Document analytics integration flows with sequence diagrams

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all related real-time analytics and integration patterns
await mcp__serena__find_symbol("RealtimeAnalytics Integration WebhookHandler", "", true);
await mcp__serena__search_for_pattern("supabase realtime subscription analytics");
await mcp__serena__find_referencing_symbols("wedding data benchmark");
```
- [ ] Identified existing real-time and webhook patterns for analytics
- [ ] Found wedding data integration points and synchronization needs
- [ ] Understood benchmarking requirements and external data sources
- [ ] Located event handling and real-time update patterns

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed integration architecture:
- [ ] Real-time analytics synchronization with Supabase realtime
- [ ] Wedding industry benchmarking with external data integration
- [ ] Cross-platform analytics coordination and conflict resolution
- [ ] External webhook system for wedding platform integrations

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use integration patterns discovered by Serena
- [ ] Implement real-time analytics synchronization
- [ ] Create wedding industry benchmarking system
- [ ] Include comprehensive error handling and monitoring

## 📋 TECHNICAL SPECIFICATION

### Real-time Analytics Integration Architecture:

1. **Analytics Change Detection System**
   - Supabase realtime subscriptions for wedding data changes
   - Intelligent change classification (progress-affecting vs. non-critical)
   - Real-time analytics recalculation and cache invalidation
   - Cross-platform notification system for analytics updates

2. **Wedding Industry Benchmarking**
   - External wedding data API integrations for industry standards
   - Regional and seasonal wedding trend analysis
   - Peer comparison analytics (similar budget/size/location)
   - Industry milestone and timeline benchmarking

3. **Cross-Platform Analytics Synchronization**
   - WebSocket-based real-time analytics streaming
   - Mobile/desktop analytics state synchronization
   - Conflict resolution for concurrent analytics views
   - Optimistic updates with rollback capability

4. **External Integration Webhooks**
   - Wedding platform webhook endpoints for data integration
   - Guest response aggregation from multiple sources
   - Vendor booking status updates from external systems
   - Payment platform integration for budget analytics

### Real-time Analytics Components:

```typescript
// Real-time Analytics Manager
class RealtimeAnalyticsManager {
  private realtimeClient: SupabaseRealtimeClient;
  private websocketManager: WebSocketManager;
  private benchmarkService: WeddingBenchmarkService;
  private cacheManager: AnalyticsCacheManager;

  async initializeRealtimeAnalytics(clientId: string): Promise<void> {
    // Set up Supabase realtime subscriptions for wedding data
    await this.subscribeToWeddingDataChanges(clientId);
    
    // Initialize WebSocket connections for analytics streaming
    await this.websocketManager.initializeAnalyticsChannel(clientId);
    
    // Start benchmark data synchronization
    await this.benchmarkService.initializeBenchmarkTracking(clientId);
  }

  async handleWeddingDataChange(change: WeddingDataChange): Promise<void> {
    // Determine if change affects analytics
    const affectsAnalytics = this.isAnalyticsRelevant(change);
    
    if (affectsAnalytics) {
      // Invalidate relevant analytics cache
      await this.cacheManager.invalidateAnalyticsCache(change.clientId, change.dataType);
      
      // Trigger analytics recalculation
      const updatedAnalytics = await this.recalculateAnalytics(change.clientId, change.dataType);
      
      // Stream updates to connected clients
      await this.websocketManager.broadcastAnalyticsUpdate(change.clientId, updatedAnalytics);
    }
  }

  async subscribeToWeddingDataChanges(clientId: string): Promise<void> {
    // Subscribe to all wedding-related table changes
    const tables = ['wedding_tasks', 'budget_items', 'guests', 'vendor_bookings', 'timeline_events'];
    
    for (const table of tables) {
      await this.realtimeClient.from(table)
        .on('INSERT', payload => this.handleTableChange(clientId, table, 'INSERT', payload))
        .on('UPDATE', payload => this.handleTableChange(clientId, table, 'UPDATE', payload))
        .on('DELETE', payload => this.handleTableChange(clientId, table, 'DELETE', payload))
        .subscribe();
    }
  }
}

// Wedding Benchmark Service
class WeddingBenchmarkService {
  private externalDataProviders: ExternalDataProvider[];
  private benchmarkCache: BenchmarkCacheManager;
  
  async generateBenchmarkInsights(clientData: ClientWeddingData): Promise<BenchmarkInsights> {
    const benchmarkCriteria = {
      budget_range: clientData.totalBudget,
      guest_count: clientData.estimatedGuests,
      venue_type: clientData.venueType,
      location_region: clientData.locationRegion,
      wedding_season: this.extractSeason(clientData.weddingDate)
    };

    // Get benchmark data from multiple sources
    const [industryBenchmarks, regionalData, seasonalTrends] = await Promise.all([
      this.getIndustryBenchmarks(benchmarkCriteria),
      this.getRegionalBenchmarks(benchmarkCriteria),
      this.getSeasonalTrends(benchmarkCriteria)
    ]);

    return this.generateInsights(clientData, {
      industryBenchmarks,
      regionalData,
      seasonalTrends
    });
  }

  async getIndustryBenchmarks(criteria: BenchmarkCriteria): Promise<IndustryBenchmarks> {
    const cacheKey = `benchmarks:${JSON.stringify(criteria)}`;
    const cached = await this.benchmarkCache.get(cacheKey);
    
    if (cached) return cached;

    // Aggregate data from multiple external sources
    const benchmarkData = await this.aggregateExternalBenchmarkData(criteria);
    
    // Cache for 24 hours (benchmark data doesn't change frequently)
    await this.benchmarkCache.set(cacheKey, benchmarkData, 86400);
    
    return benchmarkData;
  }
}

// Analytics WebSocket Manager
class AnalyticsWebSocketManager {
  private connections: Map<string, WebSocket[]> = new Map();
  private analyticsChannels: Map<string, AnalyticsChannel> = new Map();

  async initializeAnalyticsChannel(clientId: string): Promise<void> {
    const channel = new AnalyticsChannel(clientId);
    this.analyticsChannels.set(clientId, channel);
    
    // Set up channel event handlers
    channel.onAnalyticsUpdate((update: AnalyticsUpdate) => {
      this.broadcastToConnectedClients(clientId, update);
    });
  }

  async broadcastAnalyticsUpdate(clientId: string, analytics: AnalyticsData): Promise<void> {
    const connections = this.connections.get(clientId) || [];
    const update = {
      type: 'analytics_update',
      clientId,
      analytics,
      timestamp: new Date().toISOString()
    };

    // Send to all connected clients for this wedding
    const promises = connections.map(async (ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(update));
        } catch (error) {
          console.error('Failed to send analytics update:', error);
          this.removeConnection(clientId, ws);
        }
      }
    });

    await Promise.all(promises);
  }

  async handleConnectionConflict(clientId: string, updateA: AnalyticsUpdate, updateB: AnalyticsUpdate): Promise<AnalyticsUpdate> {
    // Implement conflict resolution logic
    // Latest timestamp wins, but preserve critical data
    return updateA.timestamp > updateB.timestamp ? updateA : updateB;
  }
}

// External Wedding Platform Integration
class ExternalWeddingIntegrationManager {
  private webhookHandlers: Map<string, WebhookHandler> = new Map();
  private platformConnectors: Map<string, PlatformConnector> = new Map();

  async registerPlatformIntegration(platform: string, config: IntegrationConfig): Promise<void> {
    const connector = new PlatformConnector(platform, config);
    this.platformConnectors.set(platform, connector);

    // Set up webhook endpoint for this platform
    const webhookHandler = new WebhookHandler(platform, {
      onGuestResponse: (response) => this.handleGuestResponseUpdate(response),
      onVendorBooking: (booking) => this.handleVendorBookingUpdate(booking),
      onBudgetUpdate: (update) => this.handleBudgetUpdate(update)
    });

    this.webhookHandlers.set(platform, webhookHandler);
  }

  async handleGuestResponseUpdate(response: ExternalGuestResponse): Promise<void> {
    // Update local guest data
    await this.updateLocalGuestData(response);
    
    // Trigger analytics recalculation
    const analyticsManager = await this.getAnalyticsManager(response.clientId);
    await analyticsManager.handleWeddingDataChange({
      clientId: response.clientId,
      dataType: 'guests',
      changeType: 'guest_response_update',
      data: response
    });
  }
}
```

## 🎯 SPECIFIC DELIVERABLES

### Real-time Analytics Integration with Evidence:
- [ ] Supabase realtime subscriptions for instant analytics updates
- [ ] WebSocket-based analytics streaming to connected clients
- [ ] Cross-platform analytics synchronization with conflict resolution
- [ ] Intelligent cache invalidation for analytics recalculation
- [ ] Real-time progress updates with milestone celebrations
- [ ] Live budget analytics with instant spending updates

### Wedding Industry Benchmarking:
- [ ] External wedding data API integrations for industry standards
- [ ] Regional wedding trend analysis and comparison
- [ ] Peer wedding comparison based on size, budget, and location
- [ ] Seasonal wedding planning benchmarks and timeline adjustments
- [ ] Industry milestone tracking and recommendation system
- [ ] Benchmark-based insight generation for planning optimization

### External Platform Integrations:
- [ ] Wedding platform webhook endpoints for data aggregation
- [ ] Guest response integration from multiple invitation systems
- [ ] Vendor booking status updates from external wedding platforms
- [ ] Budget tracking integration with payment and expense platforms
- [ ] Calendar integration for timeline and milestone synchronization
- [ ] Social media integration for guest engagement analytics

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team A: Frontend analytics components that need real-time updates
- Team B: Analytics API endpoints that trigger real-time recalculation
- Team D: Mobile analytics real-time update requirements

**What others need from you:**
- Team A: Real-time analytics update specifications and WebSocket integration
- Team B: Analytics data change notifications and recalculation triggers
- Team E: Integration testing requirements and real-time sync validation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ANALYTICS INTEGRATION SECURITY CHECKLIST:
- [ ] **WebSocket authentication** - JWT token validation for analytics streaming connections
- [ ] **Webhook signature verification** - HMAC validation for external platform webhooks
- [ ] **Client data isolation** - Real-time updates only for authorized wedding data
- [ ] **Rate limiting on webhook endpoints** - Prevent webhook spam and abuse
- [ ] **External API authentication** - Secure credentials for benchmark data APIs
- [ ] **Data encryption for external transfers** - Encrypt sensitive wedding data in transit
- [ ] **Audit logging for integrations** - Track all external data access and updates
- [ ] **GDPR compliance for benchmark data** - Proper consent and data retention policies

### REQUIRED INTEGRATION SECURITY IMPORTS:
```typescript
import { verifyWebhookSignature } from '$WS_ROOT/wedsync/src/lib/security/webhook-verification';
import { validateWebSocketAuth } from '$WS_ROOT/wedsync/src/lib/auth/websocket-auth';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { auditIntegrationAccess } from '$WS_ROOT/wedsync/src/lib/audit/integration-logger';
import { encryptExternalData } from '$WS_ROOT/wedsync/src/lib/security/external-encryption';
```

### REAL-TIME SECURITY IMPLEMENTATION:
```typescript
// Secure WebSocket analytics streaming
export class SecureAnalyticsWebSocket {
  async authenticateConnection(ws: WebSocket, token: string): Promise<boolean> {
    try {
      const payload = await validateJWT(token);
      
      // Verify user has access to analytics
      const hasAnalyticsAccess = await this.verifyAnalyticsAccess(payload.userId);
      if (!hasAnalyticsAccess) {
        auditIntegrationAccess.warn('Unauthorized analytics WebSocket attempt', {
          userId: payload.userId,
          timestamp: new Date()
        });
        return false;
      }

      // Store authenticated connection
      this.authenticatedConnections.set(ws, {
        userId: payload.userId,
        clientId: payload.clientId,
        connectedAt: new Date()
      });

      auditIntegrationAccess.info('Analytics WebSocket authenticated', {
        userId: payload.userId,
        clientId: payload.clientId
      });

      return true;
    } catch (error) {
      auditIntegrationAccess.error('Analytics WebSocket auth failed', { error: error.message });
      return false;
    }
  }

  async broadcastSecure(clientId: string, analytics: AnalyticsData): Promise<void> {
    // Only send to authenticated connections for this client
    const authorizedConnections = Array.from(this.authenticatedConnections.entries())
      .filter(([ws, auth]) => auth.clientId === clientId)
      .map(([ws, auth]) => ws);

    // Sanitize analytics data before sending
    const sanitizedAnalytics = await this.sanitizeAnalyticsData(analytics);
    
    const promises = authorizedConnections.map(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        return this.sendSecure(ws, sanitizedAnalytics);
      }
    });

    await Promise.all(promises);
  }
}

// Secure webhook handling for external platforms
export const handleExternalWebhook = async (request: Request) => {
  // Verify webhook signature
  const signature = request.headers.get('x-webhook-signature');
  const payload = await request.text();
  
  const isValidSignature = await verifyWebhookSignature(payload, signature);
  if (!isValidSignature) {
    auditIntegrationAccess.warn('Invalid webhook signature received', {
      ip: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Apply rate limiting
  const rateLimitResult = await rateLimitService.checkRateLimit(request, {
    identifier: request.headers.get('x-forwarded-for'),
    limit: 100, // 100 webhooks per hour
    window: 3600
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Parse and validate webhook data
  const webhookData = JSON.parse(payload);
  const validatedData = await validateExternalWebhookData(webhookData);

  // Process webhook with audit logging
  auditIntegrationAccess.info('External webhook processed', {
    platform: webhookData.platform,
    eventType: webhookData.eventType,
    clientId: validatedData.clientId
  });

  await processExternalWeddingData(validatedData);
  
  return NextResponse.json({ status: 'processed' });
};
```

## 🧪 REAL-TIME ANALYTICS INTEGRATION TESTING

```typescript
// 1. REAL-TIME ANALYTICS SYNCHRONIZATION TESTING
describe('Real-time Analytics Integration', () => {
  test('updates analytics instantly when wedding data changes', async () => {
    const clientId = await createTestClient({ name: 'Realtime Test' });
    
    // Set up WebSocket connection for analytics updates
    const ws = new WebSocket(`ws://localhost:3000/api/analytics/realtime?clientId=${clientId}`);
    const analyticsUpdates = [];
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      analyticsUpdates.push(update);
    };

    await new Promise(resolve => ws.onopen = resolve);

    // Make a change to wedding data
    await request(app)
      .post('/api/wedding-tasks')
      .send({
        clientId,
        title: 'Book photographer',
        priority: 'high',
        completed: true
      });

    // Wait for real-time update
    await waitForCondition(() => analyticsUpdates.length > 0, 2000);

    expect(analyticsUpdates).toHaveLength(1);
    expect(analyticsUpdates[0]).toMatchObject({
      type: 'analytics_update',
      clientId,
      analytics: expect.objectContaining({
        overallProgress: expect.any(Number),
        taskProgress: expect.any(Number)
      })
    });

    // Progress should have increased due to task completion
    expect(analyticsUpdates[0].analytics.overallProgress).toBeGreaterThan(0);
    
    ws.close();
  });

  test('handles concurrent analytics updates correctly', async () => {
    const clientId = await createTestClient({ name: 'Concurrent Updates' });
    
    // Set up multiple WebSocket connections
    const connections = await Promise.all([
      createWebSocketConnection(clientId),
      createWebSocketConnection(clientId),
      createWebSocketConnection(clientId)
    ]);

    // Make simultaneous changes from different sources
    const updatePromises = [
      updateWeddingTask(clientId, { completed: true }),
      addBudgetItem(clientId, { amount: 1000, category: 'venue' }),
      updateGuestRSVP(clientId, { guestId: 'guest1', status: 'yes' })
    ];

    await Promise.all(updatePromises);

    // All connections should receive consistent analytics updates
    await Promise.all(connections.map(conn => 
      waitForCondition(() => conn.updates.length > 0, 3000)
    ));

    // Verify all connections received updates
    connections.forEach(conn => {
      expect(conn.updates.length).toBeGreaterThan(0);
      expect(conn.updates[0].analytics.overallProgress).toBeDefined();
    });

    // All connections should have received the same final analytics state
    const finalStates = connections.map(conn => conn.updates[conn.updates.length - 1]);
    finalStates.forEach(state => {
      expect(state.analytics.overallProgress).toBe(finalStates[0].analytics.overallProgress);
    });

    connections.forEach(conn => conn.ws.close());
  });

  test('maintains analytics accuracy during real-time updates', async () => {
    const clientId = await createTestClient({ name: 'Accuracy Test' });
    
    // Set up real-time monitoring
    const realtimeUpdates = [];
    const ws = await createWebSocketConnection(clientId);
    ws.onUpdate = (update) => realtimeUpdates.push(update);

    // Get initial analytics state
    const initialAnalytics = await getClientAnalytics(clientId);

    // Make a series of tracked changes
    await completeWeddingTask(clientId, { title: 'Book venue', weight: 0.3 }); // 30% weight
    await addBudgetExpense(clientId, { amount: 5000, total_budget: 20000 }); // 25% of budget
    await recordGuestRSVP(clientId, { responding_yes: 20, total_invited: 100 }); // 20% response

    // Wait for real-time updates
    await waitForCondition(() => realtimeUpdates.length >= 3, 5000);

    // Get final analytics state via API
    const finalAnalytics = await getClientAnalytics(clientId);

    // Verify real-time updates match final calculated state
    const lastRealtimeUpdate = realtimeUpdates[realtimeUpdates.length - 1];
    expect(lastRealtimeUpdate.analytics.overallProgress).toBeCloseTo(finalAnalytics.overallProgress, 1);
    expect(lastRealtimeUpdate.analytics.taskProgress).toBeCloseTo(finalAnalytics.breakdown.taskProgress, 1);
    expect(lastRealtimeUpdate.analytics.budgetProgress).toBeCloseTo(finalAnalytics.breakdown.budgetProgress, 1);

    ws.close();
  });
});

// 2. WEDDING INDUSTRY BENCHMARKING TESTING
describe('Wedding Industry Benchmarking', () => {
  test('provides relevant industry benchmarks based on wedding characteristics', async () => {
    const clientId = await createTestClient({
      wedding_date: '2025-06-15',
      total_budget: 25000,
      estimated_guests: 150,
      venue_type: 'outdoor',
      location_region: 'california'
    });

    const benchmarks = await request(app)
      .get(`/api/analytics/client/benchmarks?clientId=${clientId}`)
      .expect(200);

    expect(benchmarks.body).toMatchObject({
      industryAverages: {
        totalBudget: expect.any(Number),
        guestCount: expect.any(Number),
        planningTimelineWeeks: expect.any(Number)
      },
      regionalComparison: {
        region: 'california',
        averageBudget: expect.any(Number),
        popularVenues: expect.any(Array),
        seasonalTrends: expect.any(Object)
      },
      peerComparison: {
        similarWeddings: expect.any(Number),
        budgetPercentile: expect.any(Number),
        progressComparison: expect.any(String)
      }
    });

    // Verify benchmarks are contextually relevant
    expect(benchmarks.body.peerComparison.budgetPercentile).toBeGreaterThan(0);
    expect(benchmarks.body.peerComparison.budgetPercentile).toBeLessThanOrEqual(100);
  });

  test('updates benchmark insights when client data changes', async () => {
    const clientId = await createTestClient({
      wedding_date: '2025-08-20',
      total_budget: 15000, // Lower budget
      estimated_guests: 75,
      venue_type: 'indoor'
    });

    // Get initial benchmarks
    const initialBenchmarks = await request(app)
      .get(`/api/analytics/client/benchmarks?clientId=${clientId}`)
      .expect(200);

    // Update client budget significantly
    await request(app)
      .patch(`/api/clients/${clientId}`)
      .send({ total_budget: 35000 }) // Higher budget
      .expect(200);

    // Get updated benchmarks
    const updatedBenchmarks = await request(app)
      .get(`/api/analytics/client/benchmarks?clientId=${clientId}`)
      .expect(200);

    // Budget percentile should have changed
    expect(updatedBenchmarks.body.peerComparison.budgetPercentile)
      .toBeGreaterThan(initialBenchmarks.body.peerComparison.budgetPercentile);

    // Should have different recommendations
    expect(updatedBenchmarks.body.recommendations)
      .not.toEqual(initialBenchmarks.body.recommendations);
  });

  test('caches benchmark data efficiently', async () => {
    const clientId = await createTestClient({
      wedding_date: '2025-07-10',
      total_budget: 22000,
      estimated_guests: 120
    });

    // First benchmark request
    const startTime1 = Date.now();
    await request(app)
      .get(`/api/analytics/client/benchmarks?clientId=${clientId}`)
      .expect(200);
    const duration1 = Date.now() - startTime1;

    // Second identical request (should be cached)
    const startTime2 = Date.now();
    await request(app)
      .get(`/api/analytics/client/benchmarks?clientId=${clientId}`)
      .expect(200);
    const duration2 = Date.now() - startTime2;

    // Second request should be significantly faster
    expect(duration2).toBeLessThan(duration1 * 0.3); // At least 70% faster
  });
});

// 3. EXTERNAL PLATFORM INTEGRATION TESTING
describe('External Wedding Platform Integration', () => {
  test('processes guest response webhooks from external platforms', async () => {
    const clientId = await createTestClient({ name: 'External Integration Test' });
    
    // Set up analytics monitoring
    const analyticsUpdates = [];
    const ws = await createWebSocketConnection(clientId);
    ws.onUpdate = (update) => analyticsUpdates.push(update);

    // Simulate external platform webhook
    const webhookPayload = {
      platform: 'theknot',
      eventType: 'guest_response',
      clientId,
      data: {
        guestId: 'external_guest_123',
        name: 'John Smith',
        rsvp_status: 'yes',
        dietary_restrictions: 'vegetarian',
        responded_at: new Date().toISOString()
      }
    };

    const signature = await generateWebhookSignature(JSON.stringify(webhookPayload));

    const response = await request(app)
      .post('/api/webhooks/wedding-platforms/guest-response')
      .set('X-Webhook-Signature', signature)
      .send(webhookPayload)
      .expect(200);

    expect(response.body.status).toBe('processed');

    // Verify guest was added to local database
    const guests = await db.query(
      'SELECT * FROM guests WHERE client_id = ? AND external_id = ?',
      [clientId, 'external_guest_123']
    );
    
    expect(guests.rows).toHaveLength(1);
    expect(guests.rows[0].rsvp_status).toBe('yes');

    // Verify analytics were updated in real-time
    await waitForCondition(() => analyticsUpdates.length > 0, 3000);
    
    expect(analyticsUpdates[0].analytics.guestProgress).toBeDefined();
    expect(analyticsUpdates[0].analytics.guestProgress).toBeGreaterThan(0);
  });

  test('handles vendor booking updates from external systems', async () => {
    const clientId = await createTestClient({ name: 'Vendor Integration Test' });

    const vendorWebhook = {
      platform: 'weddingwire',
      eventType: 'vendor_booking_confirmed',
      clientId,
      data: {
        vendorId: 'photographer_456',
        vendorType: 'photography',
        bookingStatus: 'confirmed',
        bookingDate: new Date().toISOString(),
        contractDetails: {
          amount: 3500,
          depositPaid: true
        }
      }
    };

    const signature = await generateWebhookSignature(JSON.stringify(vendorWebhook));

    await request(app)
      .post('/api/webhooks/wedding-platforms/vendor-booking')
      .set('X-Webhook-Signature', signature)
      .send(vendorWebhook)
      .expect(200);

    // Verify vendor booking was recorded
    const bookings = await db.query(
      'SELECT * FROM vendor_bookings WHERE client_id = ? AND external_vendor_id = ?',
      [clientId, 'photographer_456']
    );

    expect(bookings.rows).toHaveLength(1);
    expect(bookings.rows[0].status).toBe('confirmed');
    expect(bookings.rows[0].amount).toBe(3500);

    // Verify analytics reflect the booking
    const analytics = await request(app)
      .get(`/api/analytics/client/vendors/coordination?clientId=${clientId}`)
      .expect(200);

    expect(analytics.body.confirmedBookings).toBeGreaterThan(0);
    expect(analytics.body.totalSpent).toBe(3500);
  });

  test('maintains security for external webhook integrations', async () => {
    const clientId = await createTestClient({ name: 'Security Test' });

    // Test with invalid signature
    const invalidPayload = {
      platform: 'malicious',
      eventType: 'data_theft',
      clientId,
      data: { maliciousData: 'hack attempt' }
    };

    const response = await request(app)
      .post('/api/webhooks/wedding-platforms/guest-response')
      .set('X-Webhook-Signature', 'invalid_signature')
      .send(invalidPayload)
      .expect(401);

    expect(response.body.error).toBe('Invalid signature');

    // Test rate limiting
    const validPayload = { platform: 'test', eventType: 'test', clientId, data: {} };
    const validSignature = await generateWebhookSignature(JSON.stringify(validPayload));

    const rapidRequests = Array(110).fill().map(() =>
      request(app)
        .post('/api/webhooks/wedding-platforms/guest-response')
        .set('X-Webhook-Signature', validSignature)
        .send(validPayload)
    );

    const responses = await Promise.all(rapidRequests);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    expect(rateLimitedCount).toBeGreaterThan(0); // Should hit rate limit
  });
});

// 4. ANALYTICS CACHING AND PERFORMANCE TESTING
describe('Analytics Caching and Performance', () => {
  test('invalidates cache correctly when data changes', async () => {
    const clientId = await createTestClient({ name: 'Cache Test' });

    // Get initial analytics (populates cache)
    const initial = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}`)
      .expect(200);

    const initialProgress = initial.body.overallProgress;

    // Make a change that should invalidate cache
    await request(app)
      .post('/api/wedding-tasks')
      .send({
        clientId,
        title: 'Test task',
        completed: true,
        priority: 'medium'
      })
      .expect(201);

    // Get analytics again (should reflect change, not cached value)
    const updated = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}`)
      .expect(200);

    expect(updated.body.overallProgress).toBeGreaterThan(initialProgress);
  });
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Real-time analytics synchronization with <100ms update propagation
- [ ] Wedding industry benchmarking with regional and seasonal insights
- [ ] Cross-platform analytics coordination with conflict resolution
- [ ] External platform integration with webhook processing
- [ ] Intelligent caching with proper invalidation strategies
- [ ] WebSocket-based analytics streaming for instant updates

### Integration Evidence:
```typescript
// Required integration performance metrics
const analyticsIntegrationMetrics = {
  realtimeUpdateLatency: "85ms",        // Target: <100ms
  benchmarkDataAccuracy: "94%",        // Target: >90%
  webhookProcessingReliability: "99.8%", // Target: >99.5%
  cacheInvalidationSpeed: "45ms",      // Target: <50ms
  crossPlatformSyncSuccess: "98.5%",   // Target: >95%
  externalAPIResponseTime: "280ms"      // Target: <300ms
}
```

### Real-time Coordination Evidence:
- [ ] Analytics updates propagate instantly across all connected clients
- [ ] Conflict resolution maintains data consistency during concurrent updates
- [ ] WebSocket connections handle authentication and authorization properly
- [ ] Benchmark data provides relevant industry comparisons
- [ ] External platform integrations process data accurately and securely

### Performance and Reliability Evidence:
- [ ] Caching system provides >80% cache hit rate for benchmark queries
- [ ] Real-time updates maintain accuracy during high-frequency changes
- [ ] External webhook processing handles rate limiting and security properly
- [ ] Integration monitoring provides comprehensive visibility into data flows
- [ ] Error handling and recovery mechanisms work correctly

## 💾 WHERE TO SAVE

### Real-time Analytics Integration Structure:
```
$WS_ROOT/wedsync/src/lib/integrations/analytics/
├── RealtimeAnalyticsManager.ts         # Main real-time analytics orchestrator
├── realtime/
│   ├── AnalyticsWebSocketManager.ts    # WebSocket analytics streaming
│   ├── SupabaseRealtimeHandler.ts      # Supabase realtime integration
│   ├── ConflictResolver.ts             # Analytics update conflict resolution
│   └── AnalyticsCacheManager.ts        # Intelligent cache management
├── benchmarking/
│   ├── WeddingBenchmarkService.ts      # Industry benchmark calculations
│   ├── ExternalDataProvider.ts        # External benchmark data integration
│   ├── RegionalAnalyzer.ts             # Regional wedding trend analysis
│   └── SeasonalTrendAnalyzer.ts        # Seasonal wedding pattern analysis
├── external-platforms/
│   ├── ExternalIntegrationManager.ts   # External platform coordination
│   ├── WebhookHandler.ts               # Webhook processing and validation
│   ├── PlatformConnector.ts            # Individual platform connectors
│   └── DataTransformer.ts              # External data normalization
└── monitoring/
    ├── IntegrationMonitor.ts           # Integration health monitoring
    ├── PerformanceTracker.ts           # Analytics performance tracking
    └── ErrorRecoveryManager.ts         # Integration error recovery
```

### Webhook Endpoints:
```
$WS_ROOT/wedsync/src/app/api/webhooks/wedding-platforms/
├── guest-response/route.ts            # Guest RSVP updates from external platforms
├── vendor-booking/route.ts            # Vendor booking confirmations
├── budget-update/route.ts             # Budget and payment updates
├── timeline-sync/route.ts             # Timeline and calendar synchronization
└── analytics-benchmark/route.ts       # Industry benchmark data updates
```

### WebSocket Analytics Endpoints:
```
$WS_ROOT/wedsync/src/app/api/analytics/realtime/
├── route.ts                           # WebSocket analytics streaming endpoint
├── subscribe/route.ts                 # Analytics subscription management
└── benchmark-updates/route.ts         # Real-time benchmark notifications
```

## ⚠️ CRITICAL WARNINGS

### Real-time Analytics Considerations:
- **Update Frequency**: Too frequent updates can overwhelm clients and drain mobile battery
- **Data Consistency**: Real-time updates must maintain analytics accuracy
- **Network Resilience**: Venue locations often have poor connectivity - implement graceful degradation
- **Memory Usage**: Long-running WebSocket connections can cause memory leaks

### Wedding Industry Benchmarking Challenges:
- **Data Relevance**: Benchmarks must be contextually appropriate (region, season, style)
- **Privacy Concerns**: Industry data sharing requires careful anonymization
- **Market Changes**: Wedding trends evolve rapidly, benchmarks need frequent updates
- **Regional Variations**: Wedding customs and costs vary dramatically by location

### External Integration Security:
- **Webhook Validation**: All external webhooks must be cryptographically verified
- **Data Transformation**: External data formats may not match internal schema
- **Rate Limiting**: External platforms may have different rate limit requirements
- **Error Recovery**: Failed integrations must not corrupt existing wedding data

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Integration Security Verification:
```bash
# Verify WebSocket authentication
grep -r "validateWebSocketAuth\|authenticateWebSocket" $WS_ROOT/wedsync/src/lib/integrations/analytics/
# Should show authentication on ALL WebSocket connections

# Check webhook signature verification
grep -r "verifyWebhookSignature" $WS_ROOT/wedsync/src/app/api/webhooks/wedding-platforms/
# Should show signature verification on ALL webhook endpoints

# Verify external API security
grep -r "encryptExternalData\|secureExternalAPI" $WS_ROOT/wedsync/src/lib/integrations/analytics/
# Should show secure handling of external API data

# Check integration audit logging
grep -r "auditIntegrationAccess" $WS_ROOT/wedsync/src/lib/integrations/analytics/
# Should log ALL external integration activities
```

### Final Analytics Integration Checklist:
- [ ] Real-time analytics synchronization with <100ms update propagation
- [ ] WebSocket-based analytics streaming with proper authentication
- [ ] Wedding industry benchmarking with regional and seasonal insights
- [ ] External platform integration with secure webhook processing
- [ ] Cross-platform analytics coordination with conflict resolution
- [ ] Intelligent caching with proper invalidation on data changes
- [ ] Integration monitoring with comprehensive health checks
- [ ] Security measures: authentication, signature verification, audit logging
- [ ] Performance optimization: efficient queries, proper caching
- [ ] Error handling and recovery for all integration scenarios

### Real-time Analytics Validation:
- [ ] Analytics updates propagate instantly when wedding data changes
- [ ] WebSocket connections handle authentication and maintain security
- [ ] Benchmark data provides relevant, accurate industry comparisons
- [ ] External webhook integrations process data correctly and securely
- [ ] Conflict resolution maintains analytics accuracy during concurrent updates
- [ ] Cache invalidation works correctly for all analytics recalculations

**✅ Ready for Team A real-time UI updates and Team E comprehensive integration testing**