# TEAM C - ROUND 1: WS-284 - Wedding Basics Setup
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build real-time wedding profile synchronization and smart integration system with existing wedding industry tools
**FEATURE ID:** WS-284 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about seamless wedding data flow and cross-platform coordination

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/wedding-setup/
cat $WS_ROOT/wedsync/src/lib/integrations/wedding-setup/ProfileSyncManager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test wedding-setup-integration
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

// Query integration and synchronization patterns
await mcp__serena__search_for_pattern("realtime sync integration webhook");
await mcp__serena__find_symbol("RealtimeManager WebhookHandler Integration", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations/");
```

### B. INTEGRATION PATTERNS ANALYSIS (MANDATORY)
```typescript
// CRITICAL: Load existing integration patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/base-connector.ts");
await mcp__serena__search_for_pattern("supabase realtime subscription");
await mcp__serena__find_symbol("EventSystem NotificationService", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to real-time integrations
# Use Ref MCP to search for:
# - "Supabase realtime-subscriptions wedding-data"
# - "Webhook event-driven-architecture best-practices"
# - "Next.js server-sent-events real-time updates"
# - "Wedding industry API-integrations standards"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand real-time and integration patterns
await mcp__serena__find_referencing_symbols("realtime subscription webhook");
await mcp__serena__search_for_pattern("integration sync manager");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Multi-System Integration Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding profile synchronization requires: real-time updates to all connected devices when profile changes, webhook notifications to external wedding planning tools, calendar integration for wedding date changes, vendor notification system for key detail updates, backup sync mechanisms for offline scenarios.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Profile changes must propagate to mobile apps (WedMe), desktop dashboard, vendor portals, third-party calendar systems, and CRM integrations. Each system has different sync requirements, authentication methods, and data formats requiring intelligent transformation and conflict resolution.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time wedding coordination scenarios: Couple updates wedding date from mobile, vendors need immediate notification to check availability. Venue changes require location-based service updates (weather, catering capacity). Guest count modifications affect seating, catering, and invitation systems across platforms.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure resilience requirements: Network interruptions during critical updates (venue booking deadlines), webhook endpoint failures during high-traffic periods, third-party API rate limits during sync operations, data consistency when multiple users edit simultaneously, recovery mechanisms for failed synchronizations.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture strategy: Event-driven system with Supabase realtime for instant updates, webhook queue with retry logic for external systems, conflict resolution with timestamp-based priority, intelligent data transformation layer for different API formats, comprehensive sync status monitoring and reporting.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities:**

1. **task-tracker-coordinator** --think-hard --use-serena --integration-dependencies
   - Mission: Track sync requirements, webhook dependencies, real-time update flows

2. **integration-specialist** --think-ultra-hard --wedding-sync-expert --realtime-architecture
   - Mission: Build comprehensive wedding profile synchronization system

3. **realtime-architect** --continuous --supabase-realtime --event-driven-design
   - Mission: Design real-time update system for wedding profile changes

4. **webhook-specialist** --security-first --retry-logic --external-integrations
   - Mission: Create reliable webhook system for external wedding tool notifications

5. **test-automation-architect** --integration-testing --realtime-testing --webhook-testing
   - Mission: Create comprehensive integration tests for all sync scenarios

6. **documentation-chronicler** --detailed-evidence --integration-flow-diagrams
   - Mission: Document integration architecture with sequence diagrams and data flows

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all related integration and realtime patterns
await mcp__serena__find_symbol("RealtimeManager WebhookSystem Integration", "", true);
await mcp__serena__search_for_pattern("supabase subscription event handler");
await mcp__serena__find_referencing_symbols("webhook notification sync");
```
- [ ] Identified existing realtime and webhook patterns
- [ ] Found integration points with user systems
- [ ] Understood sync requirements from similar features
- [ ] Located event handling and notification patterns

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed integration architecture:
- [ ] Real-time sync architecture with Supabase realtime
- [ ] Webhook system with retry logic and failure handling
- [ ] Data transformation layer for different API formats
- [ ] Conflict resolution strategy for concurrent updates

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use integration patterns discovered by Serena
- [ ] Implement robust real-time synchronization
- [ ] Create reliable webhook notification system
- [ ] Include comprehensive error handling and monitoring

## 📋 TECHNICAL SPECIFICATION

### Real-time Wedding Profile Synchronization:

1. **Profile Change Detection System**
   - Supabase realtime subscriptions for wedding_profiles table
   - Change event classification (critical vs. non-critical updates)
   - Real-time change propagation to connected clients
   - Conflict resolution for simultaneous updates

2. **External Webhook Integration**
   - Webhook endpoints for wedding industry tool notifications
   - Retry logic with exponential backoff
   - Webhook signature verification and security
   - Integration health monitoring and alerting

3. **Smart Synchronization Engine**
   - Intelligent data transformation for different platforms
   - Batch sync optimization for bulk changes
   - Offline sync queue with resume capability
   - Change history tracking for audit purposes

4. **Cross-Platform Coordination**
   - Mobile app real-time updates (WedMe platform)
   - Desktop dashboard instant refresh
   - Vendor portal notifications
   - Calendar integration synchronization

### Integration Architecture Components:

```typescript
// Wedding Profile Sync Manager
class WeddingProfileSyncManager {
  private realtimeSubscription: RealtimeSubscription;
  private webhookQueue: WebhookQueue;
  private conflictResolver: ConflictResolver;
  private transformationEngine: DataTransformationEngine;

  async initializeSync(profileId: string): Promise<void>;
  async handleProfileChange(change: ProfileChangeEvent): Promise<void>;
  async syncToExternalSystems(change: ProfileChangeEvent): Promise<void>;
  async resolveConflict(conflict: DataConflict): Promise<ResolvedData>;
}

// Webhook Notification System
class WeddingWebhookSystem {
  async registerWebhook(endpoint: string, eventTypes: string[]): Promise<string>;
  async sendWebhook(event: WeddingEvent, retryAttempt?: number): Promise<void>;
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
  async handleWebhookFailure(webhookId: string, error: Error): Promise<void>;
}

// Real-time Event Handler
class WeddingRealtimeHandler {
  async subscribeToProfile(profileId: string, callback: EventCallback): Promise<void>;
  async broadcastChange(change: ProfileChangeEvent): Promise<void>;
  async handleConnectionLoss(): Promise<void>;
  async resumeSync(): Promise<void>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Real-time Integration with Evidence:
- [ ] Supabase realtime subscription system for wedding profiles
- [ ] Instant profile change propagation across all platforms
- [ ] Webhook notification system for external integrations
- [ ] Conflict resolution for simultaneous profile updates
- [ ] Mobile/desktop real-time synchronization
- [ ] Integration health monitoring and alerting

### Cross-Platform Coordination:
- [ ] WedMe mobile app instant updates
- [ ] Dashboard real-time refresh system
- [ ] Vendor notification system for profile changes
- [ ] Calendar integration for date/venue updates
- [ ] Third-party wedding tool webhook integrations

### Reliability and Performance:
- [ ] Offline sync queue with resume capability
- [ ] Webhook retry logic with exponential backoff
- [ ] Real-time performance under 100ms update propagation
- [ ] Integration failure handling and recovery
- [ ] Comprehensive sync status monitoring

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team A: Wedding setup wizard completion events and state changes
- Team B: Wedding profile API endpoints and database schema
- Team D: WedMe mobile app realtime update requirements

**What others need from you:**
- Team A: Real-time profile sync status for wizard progress
- Team B: Integration requirements for webhook API endpoints
- Team E: Integration testing specifications and webhook testing tools

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **Webhook signature verification** - HMAC validation for all incoming webhooks
- [ ] **Authentication on realtime connections** - JWT token validation
- [ ] **Rate limiting on webhook endpoints** - Prevent webhook spam/abuse
- [ ] **Data sanitization in sync operations** - Clean all synchronized data
- [ ] **Encryption for sensitive profile data** - End-to-end encryption for PII
- [ ] **Access control on sync operations** - User permission verification
- [ ] **Audit logging for all integrations** - Track all sync activities
- [ ] **Webhook endpoint validation** - Verify external endpoint security

### REQUIRED SECURITY IMPORTS:
```typescript
import { verifyWebhookSignature } from '$WS_ROOT/wedsync/src/lib/security/webhook-verification';
import { validateJWT } from '$WS_ROOT/wedsync/src/lib/auth/jwt-validator';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { auditLogger } from '$WS_ROOT/wedsync/src/lib/audit/logger';
import { encryptSensitiveData } from '$WS_ROOT/wedsync/src/lib/security/encryption';
```

### WEBHOOK SECURITY IMPLEMENTATION:
```typescript
export const POST = async (request: Request) => {
  // Verify webhook signature
  const signature = request.headers.get('x-webhook-signature');
  const payload = await request.text();
  
  const isValidSignature = await verifyWebhookSignature(payload, signature);
  if (!isValidSignature) {
    auditLogger.warn('Invalid webhook signature received', { 
      ip: request.headers.get('x-forwarded-for') 
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitResult = await rateLimitService.checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Process webhook with audit logging
  auditLogger.info('Webhook received', { 
    endpoint: request.url,
    payload: payload.substring(0, 100) // First 100 chars for audit
  });

  // Handle webhook event...
};
```

## 🧪 INTEGRATION TESTING WITH COMPREHENSIVE SCENARIOS

```typescript
// 1. REAL-TIME PROFILE SYNC TESTING
describe('Wedding Profile Real-time Sync', () => {
  test('propagates profile changes across all platforms', async () => {
    // Set up multiple client connections
    const mobileClient = createRealtimeClient('mobile');
    const desktopClient = createRealtimeClient('desktop');
    const vendorClient = createRealtimeClient('vendor');

    const changeReceived = {
      mobile: false,
      desktop: false,
      vendor: false
    };

    // Listen for changes on all clients
    mobileClient.subscribe('wedding_profiles', (change) => {
      changeReceived.mobile = true;
    });

    desktopClient.subscribe('wedding_profiles', (change) => {
      changeReceived.desktop = true;
    });

    vendorClient.subscribe('wedding_profiles', (change) => {
      changeReceived.vendor = true;
    });

    // Make profile change
    await updateWeddingProfile(testProfileId, {
      wedding_date: '2025-09-15',
      venue_name: 'New Venue Location'
    });

    // Verify all clients received the change within 100ms
    await waitFor(() => {
      expect(changeReceived.mobile).toBe(true);
      expect(changeReceived.desktop).toBe(true);
      expect(changeReceived.vendor).toBe(true);
    }, { timeout: 100 });
  });

  test('handles conflict resolution for simultaneous updates', async () => {
    // Simulate simultaneous updates from different clients
    const updatePromises = [
      updateWeddingProfile(testProfileId, { guest_count: 120 }, 'mobile'),
      updateWeddingProfile(testProfileId, { guest_count: 150 }, 'desktop')
    ];

    const results = await Promise.allSettled(updatePromises);
    
    // Verify conflict resolution based on timestamp
    const finalProfile = await getWeddingProfile(testProfileId);
    expect(finalProfile.guest_count).toBeOneOf([120, 150]);
    expect(finalProfile.last_modified_by).toBeDefined();
  });
});

// 2. WEBHOOK INTEGRATION TESTING
describe('Wedding Webhook System', () => {
  test('sends webhooks to registered external systems', async () => {
    const mockWebhookEndpoint = 'https://external-wedding-tool.com/webhook';
    const webhookSpy = jest.spyOn(global, 'fetch');

    // Register webhook
    await registerWebhook(mockWebhookEndpoint, ['profile_updated']);

    // Make profile change
    await updateWeddingProfile(testProfileId, {
      venue_name: 'Updated Venue'
    });

    // Verify webhook was sent
    await waitFor(() => {
      expect(webhookSpy).toHaveBeenCalledWith(
        mockWebhookEndpoint,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Signature': expect.any(String)
          })
        })
      );
    });
  });

  test('implements retry logic for failed webhooks', async () => {
    const failingEndpoint = 'https://failing-webhook.com/endpoint';
    const webhookSpy = jest.spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(new Response('OK'));

    await registerWebhook(failingEndpoint, ['profile_updated']);
    await updateWeddingProfile(testProfileId, { budget_range: '50k_100k' });

    // Wait for retry attempts
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify 3 attempts were made (initial + 2 retries)
    expect(webhookSpy).toHaveBeenCalledTimes(3);
    
    // Verify exponential backoff timing
    const callTimes = webhookSpy.mock.calls.map(() => Date.now());
    expect(callTimes[1] - callTimes[0]).toBeGreaterThanOrEqual(1000); // 1s delay
    expect(callTimes[2] - callTimes[1]).toBeGreaterThanOrEqual(2000); // 2s delay
  });

  test('verifies webhook signatures for security', async () => {
    const validSignature = generateWebhookSignature(testPayload, webhookSecret);
    const invalidSignature = 'invalid_signature';

    // Test valid signature
    const validResponse = await request(app)
      .post('/api/webhooks/wedding-profile')
      .set('X-Webhook-Signature', validSignature)
      .send(testPayload)
      .expect(200);

    // Test invalid signature
    const invalidResponse = await request(app)
      .post('/api/webhooks/wedding-profile')
      .set('X-Webhook-Signature', invalidSignature)
      .send(testPayload)
      .expect(401);

    expect(invalidResponse.body.error).toBe('Invalid signature');
  });
});

// 3. OFFLINE SYNC TESTING
describe('Wedding Offline Sync', () => {
  test('queues changes during offline periods', async () => {
    // Simulate offline state
    await simulateOfflineMode();

    // Make profile changes while offline
    await updateWeddingProfile(testProfileId, {
      ceremony_style: 'modern',
      reception_style: 'buffet'
    });

    // Verify changes are queued
    const queuedChanges = await getSyncQueue();
    expect(queuedChanges).toHaveLength(2);
    expect(queuedChanges[0].field).toBe('ceremony_style');
    expect(queuedChanges[1].field).toBe('reception_style');

    // Simulate coming back online
    await simulateOnlineMode();

    // Verify queued changes are synced
    await waitForSyncCompletion();
    const syncedProfile = await getWeddingProfile(testProfileId);
    expect(syncedProfile.ceremony_style).toBe('modern');
    expect(syncedProfile.reception_style).toBe('buffet');
  });
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Real-time profile synchronization with <100ms propagation
- [ ] Webhook system with 99.9% delivery reliability
- [ ] Conflict resolution handling concurrent updates correctly
- [ ] Offline sync queue with 100% data preservation
- [ ] Integration monitoring with comprehensive alerting

### Cross-Platform Coordination Evidence:
```typescript
// Required integration performance metrics
const weddingIntegrationMetrics = {
  realtimeUpdateDelay: "85ms",      // Target: <100ms
  webhookDeliveryRate: "99.95%",   // Target: >99.9%
  syncConflictResolution: "100%",  // Target: 100%
  offlineDataPreservation: "100%", // Target: 100%
  integrationUptime: "99.98%"      // Target: >99.9%
}
```

### External Integration Evidence:
- [ ] Wedding industry tool webhook integrations tested
- [ ] Calendar system synchronization verified
- [ ] Mobile app real-time updates functioning
- [ ] Vendor notification system operational
- [ ] Third-party API integration health monitoring

### Reliability Evidence:
- [ ] Network failure recovery mechanisms tested
- [ ] Webhook retry logic handles all failure scenarios
- [ ] Data consistency maintained during high concurrency
- [ ] Integration health monitoring alerts working
- [ ] Comprehensive sync audit logs maintained

## 💾 WHERE TO SAVE

### Integration Components Structure:
```
$WS_ROOT/wedsync/src/lib/integrations/wedding-setup/
├── ProfileSyncManager.ts           # Main synchronization orchestrator
├── RealtimeHandler.ts              # Supabase realtime management
├── WebhookSystem.ts                # External webhook notifications
├── ConflictResolver.ts             # Simultaneous update resolution
├── DataTransformer.ts              # Cross-platform data transformation
├── SyncQueue.ts                    # Offline sync queue management
├── IntegrationMonitor.ts           # Health monitoring and alerting
└── types/
    ├── WeddingEvents.ts            # Event type definitions
    ├── SyncTypes.ts                # Synchronization interfaces
    └── WebhookTypes.ts             # Webhook payload schemas
```

### Webhook Endpoints:
```
$WS_ROOT/wedsync/src/app/api/webhooks/wedding-setup/
├── profile-updated/route.ts        # Profile change webhooks
├── venue-changed/route.ts          # Venue update notifications
├── date-changed/route.ts           # Wedding date change alerts
└── guest-count-updated/route.ts    # Guest count change notifications
```

### Real-time Subscriptions:
```
$WS_ROOT/wedsync/src/lib/realtime/wedding/
├── profile-subscription.ts        # Wedding profile realtime setup
├── change-handlers.ts              # Profile change event handlers
├── connection-manager.ts           # Realtime connection management
└── sync-status-tracker.ts          # Synchronization status monitoring
```

## ⚠️ CRITICAL WARNINGS

### Real-time Integration Considerations:
- **Wedding Day Criticality**: Profile changes during wedding day must propagate instantly
- **Vendor Coordination**: Venue/date changes require immediate vendor notification
- **Mobile Reliability**: Couples rely on mobile apps - offline sync is essential  
- **Data Consistency**: Multiple platform edits must not corrupt wedding data

### Integration Performance Requirements:
- **Realtime Latency**: Updates must propagate in under 100ms
- **Webhook Reliability**: External integrations expect 99.9% delivery
- **Conflict Resolution**: Last-writer-wins may not work for all wedding scenarios
- **Network Resilience**: Venue locations often have poor connectivity

### Security and Privacy Concerns:
- **Wedding Data Sensitivity**: Venue addresses, guest counts are private information
- **Webhook Security**: External endpoints must verify signature authenticity
- **Integration Monitoring**: Prevent data leaks to unauthorized systems
- **GDPR Compliance**: Profile sync must respect data deletion requests

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Integration Security Verification:
```bash
# Verify webhook signature validation
grep -r "verifyWebhookSignature" $WS_ROOT/wedsync/src/lib/integrations/wedding-setup/
# Should show signature verification on ALL webhook endpoints

# Check realtime authentication
grep -r "validateJWT\|getServerSession" $WS_ROOT/wedsync/src/lib/realtime/wedding/
# Should be present in ALL realtime connection handlers

# Verify rate limiting on webhook endpoints
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/webhooks/wedding-setup/
# Should be applied to ALL webhook routes

# Check audit logging for integrations
grep -r "auditLogger" $WS_ROOT/wedsync/src/lib/integrations/wedding-setup/
# Should log ALL sync operations and webhook events
```

### Final Wedding Integration Checklist:
- [ ] Real-time profile synchronization with <100ms latency
- [ ] Webhook notification system with retry logic and failure handling
- [ ] Conflict resolution for simultaneous profile updates
- [ ] Offline sync queue with data preservation and resume capability
- [ ] Cross-platform coordination (mobile, desktop, vendor portals)
- [ ] External wedding tool integrations with webhook verification
- [ ] Integration health monitoring with alerting and recovery
- [ ] Comprehensive security measures: signatures, auth, rate limiting
- [ ] Performance benchmarks met for all integration scenarios
- [ ] Audit logging for GDPR compliance and troubleshooting

### Wedding Coordination Integration:
- [ ] WedMe mobile app receives instant profile updates
- [ ] Dashboard real-time refresh without page reload
- [ ] Vendor notification system alerts on critical changes
- [ ] Calendar integration syncs wedding date/venue changes
- [ ] Third-party wedding planning tools receive webhook notifications
- [ ] Conflict resolution preserves data integrity during concurrent edits

**✅ Ready for Team A real-time UI updates and Team E comprehensive integration testing**