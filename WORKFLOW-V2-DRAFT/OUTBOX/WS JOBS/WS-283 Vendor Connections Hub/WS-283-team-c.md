# TEAM C - ROUND 1: WS-283 - Vendor Connections Hub
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive integration layer for vendor connections hub with real-time messaging, notification systems, and third-party vendor integrations
**FEATURE ID:** WS-283 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about real-time vendor coordination, notification orchestration, and wedding industry vendor integrations

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/
cat $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/RealtimeVendorSync.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test vendor-communications-integration
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧠 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query real-time integration and notification patterns
await mcp__serena__search_for_pattern("realtime integration notification vendor");
await mcp__serena__find_symbol("websocket subscription notification", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load integration and real-time specific documentation
# Use Ref MCP to search for:
# - "Supabase realtime-channels vendor-communication"
# - "WebSocket vendor-status real-time-updates"
# - "Notification-systems multi-party messaging"
# - "Third-party vendor-api integrations"
# - "Wedding industry CRM-webhook patterns"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Find existing integration and notification patterns
await mcp__serena__find_referencing_symbols("realtime subscription webhook");
await mcp__serena__search_for_pattern("notification integration vendor");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Vendor Integration Analysis
```typescript
// Before building vendor integration systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Vendor connections integration requires: real-time WebSocket connections for instant message delivery, notification orchestration for multi-party conversations, webhook integrations with vendor CRM systems (HoneyBook, Dubsado), calendar sync for vendor availability, email/SMS notifications for offline vendors, and push notifications for mobile vendor coordination.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Real-time messaging needs WebSocket management for 30+ vendor connections, notification system must handle conversation threading and participant preferences, vendor CRM integrations have different API formats and authentication methods, calendar synchronization requires timezone handling, mobile push notifications need device-specific delivery mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: WebSocket connections drop during critical vendor coordination, notification delivery fails during peak wedding season, vendor CRM APIs become unavailable or rate-limited, calendar sync conflicts with existing vendor bookings, mobile push notifications fail due to device/network issues. Need comprehensive retry logic and fallback mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Use Supabase realtime for vendor status synchronization, implement notification queue system with priority handling, create vendor CRM webhook manager with retry logic, build calendar sync service with conflict resolution, establish mobile push notification service with fallback to email/SMS, maintain comprehensive integration health monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down integration work, track vendor API dependencies, identify notification requirements
   
2. **integration-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Design real-time vendor messaging, notification orchestration, third-party integrations
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Secure vendor integrations, validate webhook authenticity, protect multi-party communications
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure integration patterns match existing realtime and notification systems
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write comprehensive integration tests for vendor communication scenarios
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document vendor integration patterns and notification workflows

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all integration and real-time patterns
await mcp__serena__find_symbol("realtime websocket integration", "", true);
await mcp__serena__search_for_pattern("notification webhook vendor");
await mcp__serena__find_referencing_symbols("subscription broadcast channel");
```
- [ ] Identified existing real-time integration patterns to follow
- [ ] Found all notification system components
- [ ] Understood webhook integration architecture
- [ ] Located similar vendor communication implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Integration architecture decisions based on existing patterns
- [ ] Real-time messaging tests written FIRST (TDD)
- [ ] Security measures for vendor webhook integrations
- [ ] Performance considerations for multi-vendor real-time coordination

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use integration patterns discovered by Serena
- [ ] Maintain consistency with existing realtime systems
- [ ] Include comprehensive error handling for external vendor services
- [ ] Test integration points continuously during development

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**Core Vendor Integration Systems to Build:**

1. **RealtimeVendorSync** - WebSocket-based real-time vendor status and messaging sync
2. **VendorNotificationOrchestrator** - Multi-channel notification system for vendor communications
3. **ThirdPartyVendorIntegrations** - CRM and calendar integrations with major vendor platforms
4. **VendorWebhookManager** - Webhook handling for vendor status updates and notifications
5. **MobileVendorNotifications** - Push notification system for mobile vendor coordination
6. **VendorIntegrationHealthMonitor** - Monitoring and alerting for vendor integration failures

### Key Integration Features:
- Real-time WebSocket connections for instant vendor message delivery
- Multi-channel notification system (push, email, SMS) for vendor coordination
- Webhook integrations with HoneyBook, Dubsado, and other vendor CRMs
- Calendar synchronization for vendor availability and booking management
- Mobile push notifications for on-the-go vendor communication
- Integration health monitoring with automatic failover mechanisms

### Integration Points:
- **Supabase Realtime**: Real-time vendor status and message synchronization
- **Vendor CRM APIs**: HoneyBook, Dubsado, Light Blue webhook integrations
- **Calendar Systems**: Google Calendar, Outlook integration for availability sync
- **Notification Services**: Push notifications (FCM, APNS), Email (Resend), SMS (Twilio)
- **Mobile Integration**: React Native bridge for native mobile notifications

## 📋 TECHNICAL SPECIFICATION

### Vendor Integration Architecture:
```typescript
interface VendorIntegrationsSystem {
  // Real-time messaging integration
  initializeRealtimeVendorSync(): Promise<RealtimeSubscription>;
  subscribeToVendorStatus(vendorIds: string[]): Promise<StatusSubscription>;
  broadcastVendorMessage(message: VendorMessage): Promise<BroadcastResult>;
  handleVendorStatusChange(status: VendorStatusUpdate): Promise<void>;
  
  // Notification orchestration
  orchestrateVendorNotifications(event: VendorEvent): Promise<NotificationResult>;
  sendMultiChannelNotification(notification: VendorNotification): Promise<DeliveryStatus>;
  handleNotificationPreferences(userId: string, preferences: NotificationPrefs): Promise<void>;
  
  // Third-party vendor integrations
  syncWithVendorCRM(vendorId: string, crmType: CRMType): Promise<SyncResult>;
  handleVendorWebhook(webhook: VendorWebhookPayload): Promise<WebhookResponse>;
  updateVendorAvailability(vendorId: string, availability: AvailabilityData): Promise<void>;
  
  // Mobile integration
  registerMobileDevice(userId: string, deviceToken: string): Promise<void>;
  sendMobilePushNotification(notification: MobilePushData): Promise<PushResult>;
  handlePushNotificationInteraction(interaction: PushInteraction): Promise<void>;
  
  // Integration health monitoring
  monitorIntegrationHealth(): Promise<HealthStatus>;
  handleIntegrationFailure(failure: IntegrationFailure): Promise<RecoveryAction>;
  generateIntegrationReport(): Promise<IntegrationReport>;
}
```

### Real-time Vendor Messaging:
```typescript
// Supabase realtime channel setup for vendor communications
const VendorRealtimeChannels = {
  VENDOR_STATUS: 'vendor_status_updates',
  VENDOR_MESSAGES: 'vendor_messages',
  VENDOR_AVAILABILITY: 'vendor_availability',
  VENDOR_TASKS: 'vendor_collaborative_tasks'
};

interface RealtimeVendorSync {
  // WebSocket connection management
  establishVendorConnection(vendorId: string): Promise<WebSocketConnection>;
  maintainConnectionHealth(): Promise<ConnectionStatus>;
  handleConnectionFailure(vendorId: string): Promise<ReconnectionResult>;
  
  // Real-time message delivery
  deliverInstantMessage(message: VendorMessage): Promise<DeliveryConfirmation>;
  syncMessageThread(threadId: string): Promise<MessageSyncResult>;
  handleMessageDeliveryFailure(messageId: string): Promise<RetryResult>;
  
  // Vendor status synchronization
  broadcastVendorStatusUpdate(update: StatusUpdate): Promise<BroadcastResult>;
  syncVendorAvailability(vendorId: string): Promise<AvailabilitySync>;
  handleBulkStatusUpdate(updates: StatusUpdate[]): Promise<BulkSyncResult>;
}
```

### Vendor Notification Orchestration:
```typescript
interface VendorNotificationOrchestrator {
  // Multi-channel notification delivery
  sendVendorNotification(notification: VendorNotificationData): Promise<DeliveryResults>;
  handleNotificationPriority(priority: NotificationPriority): Promise<void>;
  trackNotificationDelivery(notificationId: string): Promise<DeliveryStatus>;
  
  // Notification preferences management
  updateVendorNotificationPrefs(vendorId: string, preferences: NotificationPreferences): Promise<void>;
  getOptimalDeliveryChannel(vendorId: string, messageType: string): Promise<DeliveryChannel>;
  
  // Conversation notification threading
  notifyConversationParticipants(conversationId: string, event: ConversationEvent): Promise<void>;
  handleThreadedNotifications(threadId: string, participants: string[]): Promise<void>;
  preventNotificationSpam(vendorId: string, timeWindow: number): Promise<boolean>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Core Integration Components:
- [ ] **RealtimeVendorSync.ts** - WebSocket-based real-time vendor communication sync
- [ ] **VendorNotificationOrchestrator.ts** - Multi-channel notification system for vendors
- [ ] **ThirdPartyVendorIntegrations.ts** - CRM and calendar integration manager
- [ ] **VendorWebhookManager.ts** - Webhook handling for vendor status and notifications
- [ ] **MobileVendorNotifications.ts** - Push notification service for mobile coordination
- [ ] **VendorIntegrationHealthMonitor.ts** - Integration monitoring and failure handling

### Third-party Integration Handlers:
- [ ] **HoneyBookIntegration.ts** - HoneyBook CRM webhook and API integration
- [ ] **DubsadoIntegration.ts** - Dubsado CRM synchronization and webhook handling
- [ ] **GoogleCalendarSync.ts** - Vendor availability synchronization with Google Calendar
- [ ] **OutlookCalendarSync.ts** - Microsoft Outlook calendar integration
- [ ] **LightBlueIntegration.ts** - Light Blue screen scraping and data sync

### Real-time Infrastructure:
- [ ] **websocket-vendor-manager.ts** - WebSocket connection management for vendors
- [ ] **supabase-vendor-channels.ts** - Supabase realtime channel configuration
- [ ] **notification-delivery-engine.ts** - Multi-channel notification delivery system
- [ ] **vendor-event-processor.ts** - Event processing for vendor status changes

## 🔗 DEPENDENCIES

### What You Need from Other Teams:
- **Team A**: Real-time UI update requirements and notification display components
- **Team B**: Vendor communication API endpoints and database event triggers
- **Team D**: Mobile notification requirements and device token management
- **Team E**: Integration testing requirements and failure scenario validation

### What Others Need from You:
- Real-time event specifications for frontend updates
- Notification delivery interfaces for UI components
- Webhook endpoint definitions for vendor CRM integrations
- Mobile push notification schemas for device targeting

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Integration Security Checklist:
- [ ] **Webhook signature validation** - Verify authenticity of vendor webhook payloads
- [ ] **API key management** - Secure storage and rotation of third-party API keys
- [ ] **Real-time connection authentication** - Validate all WebSocket connections
- [ ] **Notification content encryption** - Encrypt sensitive vendor communications
- [ ] **Integration audit logging** - Log all vendor integration events for compliance
- [ ] **Rate limiting on webhooks** - Prevent webhook spam and abuse
- [ ] **Mobile push security** - Validate device tokens and notification payloads
- [ ] **CRM data protection** - Encrypt vendor data in transit and at rest

### Required Security Files:
```typescript
// These MUST exist and be used:
import { webhookSignatureValidator } from '$WS_ROOT/wedsync/src/lib/security/webhook-validation';
import { apiKeyManager } from '$WS_ROOT/wedsync/src/lib/security/api-key-management';
import { realtimeConnectionAuth } from '$WS_ROOT/wedsync/src/lib/security/realtime-auth';
import { notificationEncryption } from '$WS_ROOT/wedsync/src/lib/security/notification-encryption';
import { integrationAuditLogger } from '$WS_ROOT/wedsync/src/lib/security/integration-audit';
```

### Webhook Security Pattern:
```typescript
const vendorWebhookSchema = z.object({
  webhookId: z.string().uuid(),
  vendorId: z.string().uuid(),
  eventType: z.enum(['status_update', 'availability_change', 'booking_update', 'message_received']),
  payload: z.object({}).passthrough(),
  timestamp: z.string().datetime(),
  signature: z.string().min(64) // HMAC signature for verification
});

export const handleVendorWebhook = withSecureValidation(
  vendorWebhookSchema,
  async (request, validatedData) => {
    // Verify webhook signature
    const isValidSignature = await webhookSignatureValidator.verify(
      validatedData,
      request.headers.get('x-vendor-signature')
    );
    
    if (!isValidSignature) {
      await integrationAuditLogger.logSecurityEvent({
        type: 'invalid_webhook_signature',
        vendorId: validatedData.vendorId,
        ip: request.headers.get('x-forwarded-for'),
        timestamp: new Date()
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Apply rate limiting
    const rateLimitResult = await rateLimitService.checkWebhookLimit(
      validatedData.vendorId,
      request
    );
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Process webhook payload
    await processVendorWebhookEvent(validatedData);
    
    return NextResponse.json({ received: true });
  }
);
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary vendor integration testing:

```javascript
// VENDOR INTEGRATION TESTING APPROACH

// 1. REAL-TIME MESSAGING INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/vendor-connections"});

// Test real-time message delivery
await mcp__playwright__browser_tabs({action: "new", url: "/dashboard/vendor-connections?vendor=photographer"});
await mcp__playwright__browser_tabs({action: "new", url: "/dashboard/vendor-connections?vendor=florist"});

// Send message from photographer tab
await mcp__playwright__browser_tabs({action: "select", index: 0});
await mcp__playwright__browser_type({
  selector: '[data-testid="vendor-message-input"]',
  text: 'Urgent: Need flower delivery confirmation for Saturday'
});
await mcp__playwright__browser_click({selector: '[data-testid="send-vendor-message"]'});

// Verify real-time delivery in florist tab
await mcp__playwright__browser_tabs({action: "select", index: 1});
await mcp__playwright__browser_wait_for({text: 'Urgent: Need flower delivery confirmation'});

// 2. NOTIFICATION SYSTEM TESTING
const notificationTestResults = await mcp__playwright__browser_evaluate({
  function: `() => ({
    notificationPermission: Notification.permission,
    serviceWorkerActive: navigator.serviceWorker.controller !== null,
    pushSubscription: navigator.serviceWorker.ready.then(reg => 
      reg.pushManager.getSubscription().then(sub => sub !== null)
    )
  })`
});

// Test notification delivery preferences
await mcp__playwright__browser_navigate({url: "http://localhost:3000/settings/notifications"});
await mcp__playwright__browser_click({selector: '[data-testid="vendor-notifications-toggle"]'});
await mcp__playwright__browser_click({selector: '[data-testid="push-notifications-enable"]'});

// 3. VENDOR CRM WEBHOOK TESTING
// Test webhook endpoint availability
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/integrations"});
const webhookEndpoints = await mcp__playwright__browser_evaluate({
  function: `() => ({
    honeyBookWebhook: document.querySelector('[data-testid="honeybook-webhook-url"]')?.textContent,
    dubsadoWebhook: document.querySelector('[data-testid="dubsado-webhook-url"]')?.textContent,
    webhookStatus: Array.from(document.querySelectorAll('.webhook-status')).map(el => ({
      service: el.dataset.service,
      status: el.textContent,
      lastDelivery: el.dataset.lastDelivery
    }))
  })`
});

// Test webhook delivery simulation
await mcp__playwright__browser_click({selector: '[data-testid="test-honeybook-webhook"]'});
await mcp__playwright__browser_wait_for({text: "Webhook test delivered successfully"});

// 4. MOBILE PUSH NOTIFICATION TESTING
await mcp__playwright__browser_resize({width: 375, height: 667}); // iPhone SE
await mcp__playwright__browser_navigate({url: "http://localhost:3000/vendor-connections"});

// Test mobile push notification registration
await mcp__playwright__browser_click({selector: '[data-testid="enable-mobile-notifications"]'});
const pushRegistrationResult = await mcp__playwright__browser_evaluate({
  function: `() => {
    return navigator.serviceWorker.ready.then(registration => {
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: new Uint8Array([/* VAPID key */])
      }).then(subscription => ({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
        }
      }));
    });
  }`
});

// 5. INTEGRATION HEALTH MONITORING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/integration-health"});
const integrationHealthStatus = await mcp__playwright__browser_evaluate({
  function: `() => ({
    overallHealth: document.querySelector('[data-testid="overall-integration-health"]')?.textContent,
    realtimeConnections: document.querySelector('[data-testid="realtime-connections"]')?.textContent,
    webhookDeliveryRate: document.querySelector('[data-testid="webhook-delivery-rate"]')?.textContent,
    notificationSuccess: document.querySelector('[data-testid="notification-success-rate"]')?.textContent,
    integrationErrors: Array.from(document.querySelectorAll('.integration-error')).map(el => ({
      service: el.dataset.service,
      error: el.textContent,
      timestamp: el.dataset.timestamp
    }))
  })`
});

// Verify integration performance metrics
const integrationPerformance = await mcp__playwright__browser_evaluate({
  function: `() => ({
    realtimeLatency: document.querySelector('[data-testid="realtime-latency"]')?.textContent,
    webhookResponseTime: document.querySelector('[data-testid="webhook-response-time"]')?.textContent,
    notificationDeliveryTime: document.querySelector('[data-testid="notification-delivery-time"]')?.textContent,
    integrationUptime: document.querySelector('[data-testid="integration-uptime"]')?.textContent
  })`
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All vendor integration deliverables complete WITH EVIDENCE
- [ ] Integration tests written FIRST and passing (show integration test results)
- [ ] Serena patterns followed (list integration patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero webhook delivery failures (show webhook logs)

### Integration Evidence:
```typescript
// Include actual integration code showing:
// 1. Real-time vendor messaging implementation
// 2. Multi-channel notification orchestration
// 3. Third-party vendor CRM integrations
// 4. Mobile push notification system
export class RealtimeVendorSync {
  // Following pattern from realtime/base-sync.ts:34-56
  // Serena confirmed this matches 6 other realtime integration systems
  
  async subscribeToVendorUpdates(vendorIds: string[]): Promise<RealtimeSubscription> {
    const channel = supabase.channel('vendor-communications')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'vendor_connections' },
          (payload) => this.handleVendorStatusChange(payload)
      )
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => this.handleNewVendorMessage(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Vendor realtime sync established');
        }
      });
      
    return { channel, unsubscribe: () => channel.unsubscribe() };
  }
  
  private async handleVendorStatusChange(payload: any): Promise<void> {
    // Real-time vendor status update implementation
    await this.notificationOrchestrator.notifyStatusChange(payload);
  }
}
```

### Performance Evidence:
```javascript
// Required integration performance metrics
const integrationMetrics = {
  realtimeMessageLatency: "67ms", // Target: <100ms
  webhookDeliveryRate: "99.2%", // Target: >98%
  notificationDeliveryTime: "1.8s", // Target: <3s
  pushNotificationLatency: "450ms", // Target: <1s
  integrationUptime: "99.95%", // Target: >99.9%
  crmSyncSuccessRate: "97.8%" // Target: >95%
}
```

## 💾 WHERE TO SAVE

### Core Integration Files:
- **Real-time Integration**: `$WS_ROOT/wedsync/src/lib/integrations/vendor-communications/realtime/`
- **Notification System**: `$WS_ROOT/wedsync/src/lib/integrations/vendor-communications/notifications/`
- **Third-party APIs**: `$WS_ROOT/wedsync/src/lib/integrations/vendor-communications/third-party/`
- **Mobile Integration**: `$WS_ROOT/wedsync/src/lib/integrations/vendor-communications/mobile/`

### Supporting Files:
- **Types**: `$WS_ROOT/wedsync/src/types/vendor-integrations.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/integrations/vendor-communications/`
- **Webhook Handlers**: `$WS_ROOT/wedsync/src/app/api/webhooks/vendor-communications/`
- **Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## ⚠️ CRITICAL WARNINGS

### Integration-Specific Risks:
- **WebSocket Connection Storms**: 30+ vendors with real-time connections can overwhelm server - implement connection pooling
- **Notification Flooding**: Multi-party conversations can trigger notification spam - implement intelligent batching
- **Third-party API Limits**: Vendor CRM APIs have strict rate limits - implement exponential backoff
- **Mobile Push Failures**: Push notifications fail frequently - comprehensive fallback to email/SMS required
- **Webhook Security**: Malicious webhook payloads can compromise system - validate all signatures

### Wedding Vendor Considerations:
- **Peak Coordination Times**: Vendor communication spikes during final wedding week - plan for 20x message volume
- **Mobile-First Integration**: 80% of vendor coordination happens on mobile - optimize for mobile networks
- **Vendor Response Expectations**: Wedding vendors expect instant responses - real-time delivery critical
- **Seasonal Integration Load**: Engagement season brings 10x vendor communications - horizontal scaling required
- **Cross-timezone Coordination**: International destination weddings require timezone-aware notifications

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Integration Security Verification:
```bash
# Verify webhook signature validation
grep -r "webhookSignatureValidator\|verifySignature" $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/
# Should show signature verification on all webhook handlers

# Check API key security
grep -r "apiKeyManager\|secureApiKey" $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/
# Should show secure API key management for third-party integrations

# Verify real-time connection authentication
grep -r "realtimeConnectionAuth\|websocketAuth" $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/
# Should show authentication on all WebSocket connections

# Check notification encryption
grep -r "notificationEncryption\|encryptNotification" $WS_ROOT/wedsync/src/lib/integrations/vendor-communications/
# Should show encrypted sensitive notification content
```

### Final Integration Security Checklist:
- [ ] ALL webhook endpoints validate signatures
- [ ] ALL third-party API keys securely managed
- [ ] ALL real-time connections authenticated
- [ ] ALL sensitive notifications encrypted
- [ ] Integration audit logging comprehensive
- [ ] Rate limiting prevents webhook abuse
- [ ] Mobile push notifications validate device tokens
- [ ] CRM data encrypted in transit and at rest
- [ ] TypeScript compiles with NO errors
- [ ] Integration tests pass including security scenarios

### Integration Performance Verification:
- [ ] Real-time message latency <100ms
- [ ] Webhook delivery rate >98%
- [ ] Notification delivery time <3s
- [ ] Push notification latency <1s
- [ ] Integration uptime >99.9%
- [ ] CRM sync success rate >95%

---

**EXECUTE IMMEDIATELY - Build the integration layer that makes vendor coordination seamless and real-time!**