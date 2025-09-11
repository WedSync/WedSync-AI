# TEAM C - ROUND 1: WS-001 - Client List Views - Integration & Real-time Updates

**Date:** 2025-08-29  
**Feature ID:** WS-001 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Create real-time synchronization and integration layer for client list updates and external service connections  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## =¨ CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**  MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/client-sync/
ls -la $WS_ROOT/wedsync/src/lib/realtime/
cat $WS_ROOT/wedsync/src/lib/integrations/client-sync/sync-manager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test src/lib/integrations src/lib/realtime
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

---

## <¯ USER STORY & WEDDING CONTEXT

**As a:** Wedding photographer using multiple systems (CRM, calendar, photo storage)
**I want to:** Have my client list automatically sync with external tools and update in real-time
**So that:** When I update a client's wedding date in my CRM, it immediately reflects in WedSync without manual data entry

**Real Wedding Problem This Solves:**
A photographer currently manages client data across 3 different systems - WedSync for coordination, a separate CRM for leads, and Google Calendar for scheduling. When wedding dates change (happens in 30% of bookings), they must update 3 systems manually, leading to inconsistencies and missed appointments. Real-time sync eliminates this problem.

---

## =Ú STEP 1: LOAD CURRENT DOCUMENTATION & REQUIREMENTS

```typescript
// MANDATORY: Load team prompt templates for requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/03-DEV-MANAGER/TEAM-PROMPT-TEMPLATES.md");
```

## >à STEP 2A: SEQUENTIAL THINKING FOR INTEGRATION ARCHITECTURE

### Integration-Specific Sequential Thinking Analysis

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Client list integration requires: Supabase realtime subscriptions for live updates, webhook endpoints for external system changes, sync conflict resolution when same data is modified in multiple places, and batch sync operations for initial data import. Each integration point needs error handling and retry logic.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time update challenges: Multiple users viewing same client list need instant updates, optimistic UI updates vs server conflicts, handling connection drops gracefully, rate limiting to prevent spam, managing subscription cleanup when users navigate away.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration points: Google Calendar sync for wedding dates, CRM webhooks for status changes, photo service integration for couple images, email service for activity notifications. Each needs authentication, rate limiting, error handling, and data transformation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use Supabase realtime for internal updates, create webhook service for external integrations, implement sync queue for reliability, add conflict resolution with last-writer-wins policy, create integration health monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## =Ú STEP 2B: ENHANCED SERENA + REF SETUP (Integration Focus)

### A. SERENA INTEGRATION ANALYSIS
```typescript
// Find integration points and patterns
await mcp__serena__find_referencing_symbols("webhook subscription realtime");
await mcp__serena__search_for_pattern("external service third-party API sync");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");

// Analyze data flow between systems
await mcp__serena__find_symbol("sync transform migrate webhook", "", true);
```

### B. INTEGRATION DOCUMENTATION
```typescript
# Use Ref MCP to search for:
# - "Supabase realtime-subscriptions broadcast channels"
# - "Webhook payload validation security"
# - "Next.js api-routes rate-limiting"
# - "Error handling retry-logic patterns"
```

## <¯ SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Integration):
- [ ] Supabase realtime subscription setup for client list changes
- [ ] Real-time update event handlers for frontend
- [ ] Webhook endpoint for external system integration
- [ ] Sync conflict resolution service
- [ ] Integration health monitoring
- [ ] Unit tests with >80% coverage
- [ ] Evidence package proving completion

### Integration Specifications:
- [ ] **Realtime Subscriptions**: Live client list updates using Supabase realtime
- [ ] **Webhook Handler**: External system integration endpoint with validation
- [ ] **Sync Manager**: Conflict resolution and data transformation
- [ ] **Health Monitor**: Integration status and error tracking
- [ ] **Event System**: Internal event broadcasting for system updates

## = DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Database schema and API endpoints - Required for sync operations
- FROM Team A: Frontend event handling interfaces - Needed for real-time UI updates

### What other teams NEED from you:
- TO Team A: Real-time event types and handlers - Blocking their live update features
- TO Team E: Integration test scenarios and monitoring endpoints - Needed for testing

## = SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Integration Security Checklist:
- [ ] **Webhook Validation** - Verify external request signatures
- [ ] **Rate Limiting** - Prevent webhook spam/abuse
- [ ] **Authentication** - Secure external service connections
- [ ] **Data Sanitization** - Clean all incoming webhook data
- [ ] **Audit Logging** - Track all integration activities
- [ ] **Error Handling** - Never expose system internals

### Webhook Security Pattern:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { webhookSignatureValidator } from '$WS_ROOT/wedsync/src/lib/security/webhook-auth';

const webhookSchema = z.object({
  event: z.enum(['client.updated', 'client.created', 'client.deleted']),
  data: z.object({
    clientId: z.string().uuid(),
    changes: z.record(z.any())
  }),
  timestamp: z.string().datetime(),
  signature: z.string()
});

export const POST = withSecureValidation(
  webhookSchema,
  async (request, validatedData) => {
    // Verify webhook signature
    const isValidSignature = await webhookSignatureValidator.verify(
      request, 
      validatedData.signature
    );
    
    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Process webhook safely
    await processSyncEvent(validatedData);
    return NextResponse.json({ success: true });
  }
);
```

## =¾ WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `$WS_ROOT/wedsync/src/lib/integrations/client-sync/`
- Realtime: `$WS_ROOT/wedsync/src/lib/realtime/client-updates.ts`
- Webhooks: `$WS_ROOT/wedsync/src/app/api/webhooks/client-sync/route.ts`
- Sync Manager: `$WS_ROOT/wedsync/src/lib/sync/conflict-resolver.ts`
- Tests: `$WS_ROOT/wedsync/__tests__/integration/client-sync/`

### Team Reports:
- **Output to:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-001-client-list-views-team-c-round-1-complete.md`
- **Update tracker:** Add entry to `$WS_ROOT/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

## = REALTIME INTEGRATION REQUIREMENTS

### Supabase Realtime Setup:
```typescript
// Real-time subscription for client list changes
import { supabase } from '$WS_ROOT/wedsync/src/lib/supabase/client';

export class ClientRealtimeManager {
  private subscription: any;
  
  async subscribeToClientChanges(supplierId: string, onUpdate: (payload: any) => void) {
    this.subscription = supabase
      .channel(`client-list-${supplierId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'client_list_cache',
          filter: `supplier_id=eq.${supplierId}`
        },
        (payload) => {
          // Transform and validate payload
          const validatedUpdate = this.validateUpdate(payload);
          onUpdate(validatedUpdate);
        }
      )
      .subscribe();
  }
  
  async broadcastUpdate(clientId: string, changes: any) {
    await supabase
      .channel(`client-updates`)
      .send({
        type: 'broadcast',
        event: 'client-updated',
        payload: { clientId, changes, timestamp: new Date().toISOString() }
      });
  }
  
  unsubscribe() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription);
    }
  }
}
```

## = WEBHOOK INTEGRATION SYSTEM

### External System Integration:
```typescript
// Webhook processor for external CRM/calendar updates
export class ExternalSyncProcessor {
  async processWebhook(event: string, data: any) {
    switch (event) {
      case 'client.updated':
        return await this.handleClientUpdate(data);
      case 'client.created':
        return await this.handleClientCreation(data);
      case 'wedding.date_changed':
        return await this.handleDateChange(data);
      default:
        throw new Error(`Unknown webhook event: ${event}`);
    }
  }
  
  private async handleClientUpdate(data: any) {
    // Conflict resolution logic
    const existingClient = await this.getClient(data.clientId);
    const resolvedData = await this.resolveConflicts(existingClient, data.changes);
    
    // Update with resolved data
    return await this.updateClient(data.clientId, resolvedData);
  }
  
  private async resolveConflicts(existing: any, incoming: any) {
    // Last-writer-wins with timestamp comparison
    const existingTimestamp = new Date(existing.updated_at);
    const incomingTimestamp = new Date(incoming.updated_at || Date.now());
    
    return incomingTimestamp > existingTimestamp ? incoming : existing;
  }
}
```

##  SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Real-time updates work across browser tabs (show demo)
- [ ] Webhook processing handles 100+ events/minute (show performance metrics)
- [ ] Sync conflicts resolve correctly (show conflict resolution logs)
- [ ] Integration health monitoring active (show monitoring dashboard)
- [ ] Zero TypeScript errors (show typecheck output)

### Integration Evidence:
```typescript
// Show real-time functionality working
const realtimeMetrics = {
  subscriptionLatency: "< 100ms",     // Target: <200ms
  eventProcessing: "< 50ms",          // Target: <100ms
  webhookResponse: "< 300ms",         // Target: <500ms
  conflictResolution: "< 200ms",      // Target: <300ms
  healthCheckInterval: "30s"          // Target: <60s
}
```

### Monitoring Evidence:
```javascript
// Integration health monitoring
const integrationHealth = {
  supabaseRealtime: "connected",
  webhookEndpoint: "active",
  externalAPIs: "healthy",
  errorRate: "< 1%",
  lastSyncTime: "2025-08-29T10:30:00Z"
}
```

## =Ê MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

**File**: `$WS_ROOT/WORKFLOW-V2-DRAFT/01-PROJECT-ORCHESTRATOR/feature-status.json`

Find WS-001 and update:
```json
{
  "id": "WS-001-client-list-views",
  "status": "completed", 
  "completion": "100%",
  "completed_date": "2025-08-29",
  "testing_status": "needs-testing",
  "team": "Team C",
  "notes": "Integration layer completed in Round 1. Real-time updates and webhook system implemented."
}
```

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY