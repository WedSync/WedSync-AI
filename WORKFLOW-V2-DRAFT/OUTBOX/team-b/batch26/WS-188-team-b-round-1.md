# TEAM B - ROUND 1: WS-188 - Offline Functionality - Backend Infrastructure

**Date:** 2025-08-26  
**Feature ID:** WS-188 (Track all work with this ID)  
**Priority:** P1 - Critical backend infrastructure  
**Mission:** Build offline data synchronization backend and conflict resolution APIs  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync backend system handling data from photographers working in poor connectivity
**I want to:** Queue offline changes, detect conflicts, and provide seamless synchronization when devices reconnect
**So that:** Wedding professionals never lose data and conflicts are resolved transparently, ensuring timeline changes and shot list updates are preserved accurately

**Real Wedding Problem This Solves:**
Multiple wedding vendors update the same timeline from different locations with varying connectivity. A photographer adds notes offline while a wedding planner changes ceremony times online. When the photographer reconnects, the system needs to intelligently merge changes, preserve both updates where possible, and flag conflicts that need human review.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Offline sync queue management
- Conflict detection and resolution algorithms
- Background synchronization APIs
- Data integrity validation systems

**Technology Stack (VERIFIED):**
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- APIs: Next.js 15 App Router API routes
- Testing: Vitest, Supabase test environment
- Queue: PostgreSQL-based sync queue

**Integration Points:**
- Database: Sync queue and cache status tables
- Frontend: Team A's offline UI components
- Service Worker: Team C's background sync triggers


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


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Ref MCP - Load latest docs for backend development:
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions typescript latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next api-routes latest documentation"});
await mcp__Ref__ref_search_documentation({query: "postgresql conflict resolution latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 3. REVIEW existing API patterns:
await mcp__serena__find_symbol("POST", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib/database");
```

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database migration for offline_sync_queue table
- [ ] Database migration for offline_cache_status table  
- [ ] POST /api/offline/sync endpoint
- [ ] Conflict detection service
- [ ] Background sync queue processor
- [ ] Unit tests with >80% coverage
- [ ] Basic API integration tests

### Database Schema Implementation:
```sql
-- /wedsync/supabase/migrations/[timestamp]_offline_sync_system.sql

-- Offline sync queue for background synchronization
CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  data_type TEXT NOT NULL,
  action TEXT CHECK (action IN ('create', 'update', 'delete')),
  data JSONB NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  next_retry TIMESTAMPTZ,
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Offline data cache status tracking
CREATE TABLE offline_cache_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  data_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  cache_expiry TIMESTAMPTZ,
  is_critical BOOLEAN DEFAULT false,
  storage_size INTEGER
);

-- Indexes for performance
CREATE INDEX idx_sync_queue_user_status ON offline_sync_queue(user_id, status);
CREATE INDEX idx_sync_queue_next_retry ON offline_sync_queue(next_retry) WHERE status = 'pending';
CREATE INDEX idx_cache_status_user_type ON offline_cache_status(user_id, data_type);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard --backend-focus "offline sync apis"
2. **database-mcp-specialist** --think-hard "migration design sync queue"
3. **api-architect** --think-ultra-hard "conflict resolution api"
4. **security-compliance-officer** --backend-security "data integrity"
5. **test-automation-architect** --api-testing "sync queue testing"
6. **postgresql-database-expert** --performance "queue optimization"
7. **code-quality-guardian** --api-patterns "sync reliability"

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY API SECURITY PATTERN:

```typescript
// /wedsync/src/app/api/offline/sync/route.ts
import { withSecureValidation } from '@/lib/validation/middleware';
import { offlineSyncSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  offlineSyncSchema.extend({
    deviceId: z.string().min(1),
    lastSyncTimestamp: z.string().datetime().optional()
  }),
  async (request: NextRequest, validatedData) => {
    // Secure sync processing here
    const { queueItems, deviceId, lastSyncTimestamp } = validatedData;
    
    // Process sync queue with full validation
    const result = await processSyncQueue(queueItems, deviceId);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  }
);
```

⚠️ DATABASE MIGRATIONS:
- CREATE migration files but DO NOT APPLY them
- Migration files go to: /wedsync/supabase/migrations/[timestamp]_offline_sync_system.sql
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-188.md
- SQL Expert handles ALL migration application and conflict resolution

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
- FROM Team A: Offline UI component requirements and error handling needs
- FROM Team C: Service worker background sync trigger specifications

### What other teams NEED from you:
- TO Team A: API contracts for sync status and conflict resolution
- TO Team D: Database performance patterns for offline cache
- TO Team E: Sync queue processing interfaces

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- APIs: `/wedsync/src/app/api/offline/`
- Services: `/wedsync/src/lib/services/offline-sync-service.ts`
- Migrations: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/src/__tests__/unit/services/offline-sync.test.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch26/WS-188-team-b-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY