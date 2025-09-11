# TEAM C - ROUND 1: WS-302 - WedSync Supplier Platform Main Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Build comprehensive real-time integration and communication systems for the WedSync Supplier Platform with advanced webhook management and cross-system synchronization
**FEATURE ID:** WS-302 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time updates, system integration, and wedding vendor communication flows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/supplier-platform
cat $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/realtime-service.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations/supplier-platform
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

// Query specific areas relevant to integrations and real-time systems
await mcp__serena__search_for_pattern("webhook realtime subscription integration");
await mcp__serena__find_symbol("WebhookHandler RealtimeService", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations");
```

### B. INTEGRATION PATTERNS & REAL-TIME SYSTEMS (MANDATORY FOR ALL INTEGRATION WORK)
```typescript
// CRITICAL: Load existing integration and webhook patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/webhooks/webhook-manager.ts");
await mcp__serena__search_for_pattern("realtime subscription supabase");

// Analyze existing communication and notification patterns
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/communications");
```

**🚨 CRITICAL INTEGRATION TECHNOLOGY STACK:**
- **Supabase Realtime**: Real-time database subscriptions
- **Webhook Management**: Event-driven system communication
- **WebSocket Connections**: Live dashboard updates
- **Event Broadcasting**: Cross-system communication
- **Rate Limiting**: Integration protection and throttling

### C. REF MCP CURRENT DOCS (MINUTES 3-5)  
```typescript
// Load documentation SPECIFIC to supplier platform integrations
# Use Ref MCP to search for:
# - "Supabase realtime-subscriptions broadcast"
# - "Webhook event-driven architecture patterns"
# - "WebSocket real-time dashboard updates"
# - "Wedding vendor notification systems"
# - "Event broadcasting microservices patterns"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing integration patterns
await mcp__serena__find_referencing_symbols("webhook realtime notification");
await mcp__serena__search_for_pattern("subscription broadcast event");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Integration Analysis
```typescript
// Before building system integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Supplier platform real-time integration requires: Supabase realtime subscriptions for dashboard updates, webhook notifications to external vendor systems, email notifications for client updates, push notifications for mobile apps, integration with calendar systems for booking changes, and cross-platform data synchronization for WedMe.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Dashboard updates trigger multiple downstream actions (notification preferences vary by vendor type, external CRM systems have different API formats and rate limits, calendar integrations need bidirectional sync, email templates must be personalized per vendor, failure handling must prevent data inconsistency across systems.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Supabase realtime connection drops during critical business updates, email service rate limits during peak wedding season, webhook endpoints become unavailable during vendor system maintenance, calendar sync conflicts when double-booking occurs, notification preferences change during active sessions. Need circuit breakers, retry logic, and graceful degradation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Use event-driven pattern with message queues for reliability, implement idempotent operations for retry safety, create integration health monitoring with alerts, build fallback mechanisms for each external service (calendar, CRM, email), maintain integration audit logs for vendor troubleshooting, ensure wedding day zero-downtime operation.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down integration work, track real-time system dependencies, identify communication blockers
   - **Sequential Thinking Usage**: Complex integration architecture breakdown, failure scenario planning

2. **integration-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Use Serena to find existing integration patterns, design supplier platform communication flows
   - **Sequential Thinking Usage**: Integration architecture decisions, event flow design, system communication patterns

3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Secure webhook endpoints, validate real-time data flow using Serena analysis
   - **Sequential Thinking Usage**: Security threat modeling for integrations, webhook security analysis

4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure integration code matches existing patterns found by Serena
   - **Sequential Thinking Usage**: Integration pattern compliance, error handling standards, retry logic

5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write integration tests BEFORE code, verify real-time behavior with comprehensive testing
   - **Sequential Thinking Usage**: Test strategy for event-driven systems, failure scenario testing

6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document integration flows with actual code snippets and system architecture diagrams
   - **Sequential Thinking Usage**: Integration documentation strategy, vendor troubleshooting guides

**AGENT COORDINATION:** Agents work in parallel but share Serena insights AND Sequential Thinking analysis results

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
Use Serena to understand existing integration and real-time patterns BEFORE writing any code:
```typescript
// Find all related integration services and their communication patterns
await mcp__serena__find_symbol("WebhookManager RealtimeService NotificationService", "", true);
// Understand existing event patterns
await mcp__serena__search_for_pattern("event broadcast subscription webhook");
// Analyze integration points with authentication and rate limiting
await mcp__serena__find_referencing_symbols("rateLimitService circuitBreaker retry");
```
- [ ] Identified existing integration patterns to follow
- [ ] Found all communication integration points
- [ ] Understood real-time system requirements
- [ ] Located similar supplier-focused integrations

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed plan:
- [ ] Architecture decisions based on existing integration patterns
- [ ] Test cases written FIRST (TDD) for all event flows
- [ ] Security measures for webhook and real-time endpoints
- [ ] Performance considerations for high-volume wedding season traffic

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use integration patterns discovered by Serena
- [ ] Maintain consistency with existing webhook and event systems
- [ ] Include comprehensive error handling and retry logic
- [ ] Test event flows continuously during development

## 📋 TECHNICAL SPECIFICATION

Based on `/WORKFLOW-V2-DRAFT/INBOX/dev-manager/WS-302-wedsync-supplier-platform-main-overview-technical.md`:

### Core Integration Requirements:
- **Real-time Dashboard Updates**: WebSocket connections for live KPI updates
- **Webhook Event System**: External system notifications for booking changes
- **Cross-Platform Sync**: WedMe platform synchronization for client updates  
- **Notification Distribution**: Email, SMS, push notifications for vendor alerts
- **Calendar Integration**: Bidirectional sync with Google Calendar, Outlook

### Key Integration Services to Build:
1. **RealtimeService**: Supabase subscription management for dashboard updates
2. **WebhookManager**: Event distribution to external vendor systems
3. **NotificationService**: Multi-channel notification distribution
4. **CalendarSyncService**: Bidirectional calendar integration
5. **CrossPlatformSync**: WedMe data synchronization service

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **RealtimeService** (`$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/realtime-service.ts`)
  - Supabase realtime subscription management for supplier dashboard
  - WebSocket connection handling with reconnection logic
  - Event filtering and broadcasting for specific supplier updates
  - Evidence: Real-time dashboard updates working smoothly, connection stability metrics

- [ ] **WebhookManager Enhancement** (`$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/webhook-manager.ts`)
  - Supplier-specific webhook event handling
  - External vendor system integration endpoints
  - Retry logic and failure handling for webhook delivery
  - Evidence: Webhook events successfully delivered to external systems

- [ ] **NotificationService** (`$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/notification-service.ts`)  
  - Multi-channel notification distribution (email, SMS, push)
  - Supplier preference-based notification routing
  - Template management for vendor-specific notifications
  - Evidence: Notifications delivered according to supplier preferences

- [ ] **CalendarSyncService** (`$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/calendar-sync-service.ts`)
  - Google Calendar and Outlook bidirectional synchronization
  - Wedding booking calendar integration
  - Conflict detection and resolution logic
  - Evidence: Calendar events sync both ways without conflicts

- [ ] **CrossPlatformSync** (`$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/cross-platform-sync.ts`)
  - WedMe platform data synchronization
  - Client data updates propagation to supplier platform
  - Real-time sync for client interactions and updates
  - Evidence: Changes in WedMe immediately reflect in supplier platform

## 🔗 DEPENDENCIES

### What you need from other teams:
- **Team A**: Component event hooks for real-time UI updates
- **Team B**: API endpoint specifications for webhook event triggers
- **Team D**: WedMe platform API contracts for cross-platform sync

### What others need from you:
- **Team A**: Real-time event specifications and WebSocket connection interfaces
- **Team B**: Integration service interfaces and event callback definitions  
- **Team E**: Integration testing interfaces and webhook event documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **Webhook endpoint authentication** - Verify webhook signatures and API keys
- [ ] **Real-time connection security** - Authenticate WebSocket connections
- [ ] **Rate limiting on integration endpoints** - Prevent abuse of webhook and notification services
- [ ] **Data encryption in transit** - All external communications encrypted
- [ ] **Cross-platform data validation** - Validate all sync data before processing
- [ ] **Audit logging for integrations** - Log all external system communications
- [ ] **Circuit breaker protection** - Prevent cascade failures from external systems
- [ ] **Secret management** - Secure storage of API keys and webhook secrets

### REQUIRED SECURITY PATTERNS:
```typescript
// Webhook signature verification
const verifyWebhookSignature = (payload: string, signature: string, secret: string) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

// Real-time connection authentication
const authenticateRealtimeConnection = async (token: string) => {
  try {
    const session = await verifyJWTToken(token);
    if (!session?.user?.id) {
      throw new Error('Invalid session');
    }
    return session;
  } catch (error) {
    throw new Error('Authentication failed');
  }
};

// Rate limiting for integration endpoints
const rateLimitIntegration = async (identifier: string, limit: number) => {
  const result = await rateLimitService.checkRateLimit({
    identifier,
    limit,
    window: 60000 // 1 minute
  });
  
  if (!result.allowed) {
    throw new Error('Rate limit exceeded');
  }
  
  return result;
};
```

## 🎭 INTEGRATION TESTING WITH MULTIPLE SYSTEMS

Advanced integration testing across multiple systems:

```javascript
// COMPREHENSIVE INTEGRATION TESTING FOR SUPPLIER PLATFORM

// 1. REAL-TIME DASHBOARD UPDATE TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
const initialKPI = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelector('[data-testid="revenue-kpi"]').textContent`
});

// Trigger backend change via API
await fetch('/api/supplier-platform/test/trigger-kpi-update', { 
  method: 'POST',
  body: JSON.stringify({ revenue: 15000 })
});

// Verify real-time update received
await mcp__playwright__browser_wait_for({text: "$15,000"});
const updatedKPI = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelector('[data-testid="revenue-kpi"]').textContent`
});

// 2. WEBHOOK EVENT FLOW TESTING
await mcp__playwright__browser_tabs({action: "new", url: "/dashboard/integrations"});
await mcp__playwright__browser_click({
  element: "Test webhook button",
  ref: "[data-testid='test-webhook']"
});

// Monitor webhook delivery
const webhookLogs = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/webhooks/delivery-status').then(r => r.json());
  }`
});

// 3. CROSS-PLATFORM SYNCHRONIZATION TESTING
await mcp__playwright__browser_tabs({action: "new", url: "/wedme/client-portal"});
await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Client preference update",
      type: "textbox", 
      ref: "[data-testid='preference-input']",
      value: "Updated dietary requirements"
    }
  ]
});

// Switch back to supplier dashboard
await mcp__playwright__browser_tabs({action: "select", index: 0});
await mcp__playwright__browser_wait_for({text: "Updated dietary requirements"});

// 4. NOTIFICATION SYSTEM TESTING
await mcp__playwright__browser_click({
  element: "Send test notification",
  ref: "[data-testid='test-notification']"
});

// Verify notification channels
const notificationResults = await mcp__playwright__browser_evaluate({
  function: `() => {
    return {
      email: localStorage.getItem('test-email-sent'),
      sms: localStorage.getItem('test-sms-sent'),
      push: localStorage.getItem('test-push-sent')
    };
  }`
});

// 5. CALENDAR SYNC INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "/dashboard/calendar"});
await mcp__playwright__browser_click({
  element: "Sync with Google Calendar",
  ref: "[data-testid='google-calendar-sync']"
});

// Verify calendar events appear
await mcp__playwright__browser_wait_for({text: "Wedding consultation"});
const calendarEvents = await mcp__playwright__browser_evaluate({
  function: `() => {
    return Array.from(document.querySelectorAll('[data-testid^="calendar-event-"]'))
      .map(el => el.textContent);
  }`
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All integration services complete WITH EVIDENCE (show event flows working)
- [ ] Tests written FIRST and passing (show integration test results)
- [ ] Event-driven patterns followed (list event types and handlers)
- [ ] Zero connection drops (show stability metrics)
- [ ] Zero webhook delivery failures (show retry logic working)

### Code Quality Evidence:
```typescript
// Include actual integration service showing pattern compliance
// Example from your implementation:
export class RealtimeService {
  private supabaseClient: SupabaseClient;
  private connections: Map<string, RealtimeConnection> = new Map();
  
  async subscribeToSupplierUpdates(supplierId: string, callback: EventCallback) {
    // Following pattern from existing-realtime-service.ts:78-95
    // Serena confirmed this matches 6 other realtime implementations
    
    const channel = this.supabaseClient
      .channel(`supplier_${supplierId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'supplier_kpis' },
        (payload) => {
          this.handleKPIUpdate(payload, callback);
        }
      )
      .subscribe();
      
    this.connections.set(supplierId, { channel, callback });
    return () => this.unsubscribe(supplierId);
  }
  
  private async handleKPIUpdate(payload: any, callback: EventCallback) {
    // Validate and transform data before broadcasting
    const validatedData = supplierKPIUpdateSchema.parse(payload.new);
    callback({ type: 'kpi_update', data: validatedData });
  }
}
```

### Integration Evidence:
- [ ] Show how integrations connect across all systems (API, WebSocket, webhooks)
- [ ] Include Serena analysis of integration architecture consistency
- [ ] Demonstrate real-time updates work without data loss
- [ ] Prove webhook delivery includes proper retry and error handling

### Performance Evidence:
```javascript
// Required metrics with actual measurements
const integrationMetrics = {
  realtimeLatency: "85ms",      // Target: <100ms
  webhookDelivery: "145ms",     // Target: <200ms
  notificationSend: "67ms",     // Target: <100ms
  calendarSync: "234ms",        // Target: <300ms
  crossPlatformSync: "123ms",   // Target: <150ms
  connectionUptime: "99.9%",    // Target: >99.5%
}
```

## 💾 WHERE TO SAVE

### Integration Service Files:
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/realtime-service.ts`
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/webhook-manager.ts`  
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/notification-service.ts`
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/calendar-sync-service.ts`
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/cross-platform-sync.ts`

### Configuration Files:
- `$WS_ROOT/wedsync/src/config/integration-config.ts`
- `$WS_ROOT/wedsync/src/lib/integrations/supplier-platform/integration-types.ts`

### Test Files:
- `$WS_ROOT/wedsync/tests/integrations/supplier-platform/realtime.test.ts`
- `$WS_ROOT/wedsync/tests/integrations/supplier-platform/webhooks.test.ts`
- `$WS_ROOT/wedsync/tests/integrations/supplier-platform/notifications.test.ts`
- `$WS_ROOT/wedsync/tests/integrations/supplier-platform/calendar-sync.test.ts`

### Documentation Files:
- `$WS_ROOT/wedsync/docs/integrations/supplier-platform-integration-guide.md`
- `$WS_ROOT/wedsync/docs/integrations/webhook-specifications.md`

## ⚠️ CRITICAL WARNINGS

### Things that will break wedding vendor operations:
- **Real-time connection drops** - Vendors rely on live dashboard updates during busy periods
- **Failed webhook delivery** - External CRM systems expect reliable data synchronization
- **Notification delays** - Wedding coordination requires instant communication
- **Calendar sync conflicts** - Double-booking disasters must be prevented
- **Cross-platform data loss** - Client updates must synchronize perfectly between platforms

### Integration Failures to Avoid:
- **Missing retry logic** - External systems go down, need robust retry mechanisms
- **Webhook signature bypass** - Security vulnerabilities in webhook endpoints
- **Rate limit violations** - Overwhelming external services causes integration blocks
- **Connection memory leaks** - WebSocket connections must be properly managed
- **Event duplication** - Idempotent operations prevent duplicate processing

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Integration Security Verification:
```bash
# Verify webhook endpoints have signature validation
grep -r "verifyWebhookSignature\|webhook.*signature" $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/
# Should show signature verification in all webhook handlers

# Check for proper authentication on real-time connections
grep -r "authenticateRealtimeConnection\|realtime.*auth" $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/
# Should be present in WebSocket connection handlers

# Verify rate limiting on integration endpoints  
grep -r "rateLimitIntegration\|rateLimitService" $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/
# Should be applied to webhook and notification endpoints

# Check for proper error handling and retry logic
grep -r "retry\|circuitBreaker\|exponentialBackoff" $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/
# Should show comprehensive retry strategies

# Verify audit logging for integration operations
grep -r "auditLog\|integrationLog" $WS_ROOT/wedsync/src/lib/integrations/supplier-platform/
# Should log all external system communications
```

### Final Security Checklist:
- [ ] ALL webhook endpoints verify signatures before processing
- [ ] ALL real-time connections authenticate users before subscribing
- [ ] NO external API keys hardcoded (use secure environment variables)
- [ ] NO integration endpoints exposed without rate limiting
- [ ] Authentication verified on ALL cross-platform sync operations
- [ ] Circuit breakers protect against external system failures
- [ ] TypeScript compiles with NO errors
- [ ] Integration tests pass including failure scenario tests

### Real-time System Checklist:
- [ ] WebSocket connections handle reconnection automatically
- [ ] Event subscriptions clean up properly to prevent memory leaks
- [ ] Real-time updates filter properly by supplier permissions
- [ ] Cross-platform sync maintains data consistency
- [ ] Webhook retries use exponential backoff strategy
- [ ] Notification preferences respect supplier settings
- [ ] Calendar sync handles conflicts gracefully

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**🚨 CRITICAL: You MUST update the project dashboard immediately after completing this feature!**

### STEP 1: Update Feature Status JSON
**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-302 and update:
```json
{
  "id": "WS-302-supplier-platform-main-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "needs-testing", 
  "team": "Team C",
  "notes": "Supplier platform integration services completed. Real-time updates, webhooks, notifications, and cross-platform sync fully implemented."
}
```

### STEP 2: Create Completion Report
**Location**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`
**Filename**: `WS-302-supplier-platform-main-overview-team-c-round1-complete.md`

Use the standard completion report template with supplier platform integration specific evidence including:
- Real-time event flow demonstrations
- Webhook delivery success metrics  
- Cross-platform sync verification
- Integration architecture diagrams
- Performance and stability metrics

---

**WedSync Supplier Platform Integrations - Real-time, Reliable, and Wedding-Optimized! 🔄⚡🔗**