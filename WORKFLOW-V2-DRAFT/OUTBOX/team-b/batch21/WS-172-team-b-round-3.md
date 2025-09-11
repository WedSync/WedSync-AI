# TEAM B — BATCH 21 — ROUND 3 — WS-172: Offline Functionality - Sync Engine Backend

**Date:** 2025-08-26  
**Feature ID:** WS-172 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build robust offline sync engine with conflict resolution APIs  
**Context:** You are Team B working in parallel with 4 other teams. Final integration round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding coordinator working at remote venues
**I want to:** Access client timelines, vendor contacts, and forms when internet is unavailable
**So that:** I can continue coordinating the wedding even in areas with poor connectivity

**Real Wedding Problem This Solves:**
A venue coordinator at a barn wedding with no WiFi can still view the timeline, mark vendor arrivals, take notes about setup issues, and update the couple's timeline - all syncing automatically when connection returns.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-172:**
- Build POST /api/offline/sync endpoint for data synchronization
- Implement conflict detection and resolution algorithms
- Create batch sync processing for offline queue items
- Build sync status tracking and progress APIs
- Implement transaction-safe sync operations

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions, Transactions
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Team A Frontend: Sync hook integration from previous rounds
- Team C Resolution: Conflict resolution strategy coordination
- Team D Background: Background sync event coordination
- Database: offline_sync_queue table

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Sync Engine Integration):
- [ ] POST /api/offline/sync - Batch sync processing endpoint
- [ ] GET /api/offline/status/:userId - Sync status and progress
- [ ] Conflict detection and resolution algorithms
- [ ] Transaction-safe batch operations
- [ ] Sync queue processing with retry logic
- [ ] Database migration for sync tracking
- [ ] Unit tests with >80% coverage
- [ ] Integration tests for sync scenarios

**Objective:** Complete offline sync infrastructure with robust conflict handling
**Scope In:** Sync APIs, conflict resolution, transaction management
**Scope Out:** Frontend hooks, UI indicators, client-side storage
**Affected Paths:** /src/app/api/offline/, /src/lib/offline/sync-engine.ts
**Dependencies:** Team A hooks interface, Team C resolution strategy, Team D background sync
**Acceptance Criteria:**
- Sync processes batches without data corruption
- Conflicts are detected and resolved correctly
- Failed syncs retry with backoff strategy
- Sync status provides accurate progress
- All operations are transaction-safe

**NFRs:** <500ms sync processing per batch, 99.9% data integrity
**Test Plan:** Unit tests for sync logic, integration tests for conflict scenarios
**Risk/Mitigation:** Data corruption during sync - implement transaction rollback
**Handoff Notes:** Export sync interfaces for Team A hook integration
**Overlap Guard:** Team B handles sync engine only, not client-side management

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Sync hook requirements - Required for API response format
- FROM Team C: Conflict resolution strategies - Needed for merge algorithms
- FROM Team D: Background sync events - Required for processing triggers

### What other teams NEED from you:
- TO Team A: Sync API contracts - They need this for hook integration
- TO Team E: Sync test scenarios - Required for comprehensive testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### SYNC API SECURITY

```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { syncRequestSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  syncRequestSchema.extend({
    changes: z.array(z.object({
      action: z.enum(['create', 'update', 'delete']),
      table: z.string().min(1).max(50),
      id: z.string().uuid(),
      data: z.object({}).passthrough(),
      timestamp: z.string().datetime()
    })),
    lastSyncTime: z.string().datetime()
  }),
  async (request: NextRequest, validatedData) => {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user owns all data being synced
    const userOwnedChanges = await validateUserOwnership(userId, validatedData.changes);
    if (!userOwnedChanges) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Process sync with transaction safety
    const result = await processSyncBatch(userId, validatedData);
    return NextResponse.json(result);
  }
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// OFFLINE SYNC ENGINE TESTING

// 1. BATCH SYNC PROCESSING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/test-sync"});

const batchSyncTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const changes = [
      {
        action: 'update',
        table: 'clients',
        id: 'test-client-id',
        data: { name: 'Updated Client', status: 'active' },
        timestamp: new Date().toISOString()
      },
      {
        action: 'create', 
        table: 'timeline_items',
        id: 'new-timeline-id',
        data: { title: 'New Task', time: '14:00' },
        timestamp: new Date().toISOString()
      }
    ];
    
    const response = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes,
        lastSyncTime: new Date(Date.now() - 3600000).toISOString()
      })
    });
    
    const result = await response.json();
    return {
      status: response.status,
      successful: result.success,
      conflictCount: result.conflicts?.length || 0,
      serverChangeCount: result.serverChanges?.length || 0
    };
  }`
});

// 2. CONFLICT RESOLUTION TESTING
const conflictTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate conflicting changes
    const conflictingChanges = [
      {
        action: 'update',
        table: 'clients',
        id: 'conflict-client-id',
        data: { name: 'Client Name A', last_modified: Date.now() - 5000 },
        timestamp: new Date(Date.now() - 1000).toISOString()
      }
    ];
    
    const response = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changes: conflictingChanges,
        lastSyncTime: new Date(Date.now() - 10000).toISOString()
      })
    });
    
    const result = await response.json();
    return {
      hasConflicts: result.conflicts && result.conflicts.length > 0,
      resolutionProvided: result.conflicts?.[0]?.resolution !== undefined
    };
  }`
});

// 3. SYNC STATUS TRACKING
const statusTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/offline/status/test-user-id');
    const status = await response.json();
    
    return {
      hasQueuedItems: typeof status.queuedItems === 'number',
      hasLastSync: !!status.lastSyncTime,
      hasSyncInProgress: typeof status.syncInProgress === 'boolean'
    };
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Batch sync processes multiple changes correctly
- [ ] Conflicts are detected and provide resolution options
- [ ] Transaction rollback works on sync failures
- [ ] Sync status accurately reflects queue state
- [ ] User data isolation prevents unauthorized access
- [ ] Retry logic handles temporary failures


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Sync engine processes batches reliably
- [ ] Conflict resolution algorithms work correctly
- [ ] Transaction safety prevents data corruption
- [ ] Sync status APIs provide accurate information
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] All security requirements implemented

### Integration & Performance:
- [ ] Sync processes batches in <500ms average
- [ ] 99.9% data integrity maintained
- [ ] Integrates with Team A hooks seamlessly
- [ ] Coordinates with Team C/D systems properly
- [ ] Error handling is comprehensive

### Evidence Package Required:
- [ ] Sync processing test results
- [ ] Conflict resolution scenario proof
- [ ] Transaction safety validation
- [ ] Performance benchmarking results
- [ ] Integration test screenshots

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- APIs: `/wedsync/src/app/api/offline/`
- Sync Engine: `/wedsync/src/lib/offline/sync-engine.ts`
- Tests: `/wedsync/tests/offline/`
- Migrations: `/wedsync/supabase/migrations/[timestamp]_offline_sync_system.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch21/WS-172-team-b-round-3-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Always use database transactions for sync operations
- Validate user ownership of all synced data
- Test conflict scenarios thoroughly
- Implement proper retry logic with backoff
- Coordinate sync timing with other teams

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY