# TEAM A — BATCH 21 — ROUND 3 — WS-172: Offline Functionality - Storage Hook

**Date:** 2025-08-26  
**Feature ID:** WS-172 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build React hook for offline data management and UI indicators  
**Context:** You are Team A working in parallel with 4 other teams. Final integration round.

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
- Build useOfflineData hook for React component integration
- Create OfflineIndicator component showing connection status
- Implement offline data caching strategies for UI components
- Add sync status indicators and progress feedback
- Build offline form submission queuing

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Storage: IndexedDB, React hooks

**Integration Points:**
- Team B Backend: Sync API endpoints from previous rounds
- Team C Resolution: Conflict resolution system integration
- Team D Sync Engine: Background sync coordination
- Database: offline_sync_queue table

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
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "next hooks data-fetching latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react hooks useEffect useState latest documentation"});
await mcp__Ref__ref_search_documentation({query: "indexeddb offline storage latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("useOfflineData", "", true);
await mcp__serena__get_symbols_overview("/src/hooks/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "offline React hook development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "offline data management hooks"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "React data synchronization"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --offline-testing --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Offline Storage Integration):
- [ ] useOfflineData hook with caching and sync logic
- [ ] OfflineIndicator component with connection status
- [ ] Offline form submission queue management
- [ ] Sync status indicators and progress feedback
- [ ] Error handling for offline/online transitions
- [ ] Unit tests with >80% coverage
- [ ] Playwright tests for offline scenarios

**Objective:** Complete offline functionality with seamless React integration
**Scope In:** React hooks, UI indicators, client-side data management
**Scope Out:** IndexedDB implementation details, server sync logic
**Affected Paths:** /src/hooks/useOfflineData.ts, /src/components/offline/
**Dependencies:** Team B sync API, Team C conflict resolution, Team D background sync
**Acceptance Criteria:**
- Hook manages offline/online state transitions
- Data persists across app restarts
- Sync indicators show accurate status
- Forms can be submitted while offline
- Error states handled gracefully

**NFRs:** <50ms hook response time, data integrity maintained
**Test Plan:** Unit tests for hook logic, E2E tests for offline scenarios
**Risk/Mitigation:** Data loss during sync - implement transaction logging
**Handoff Notes:** Hook interface documented for component integration
**Overlap Guard:** Team A only handles React integration, not storage engine

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
- FROM Team B: Sync API endpoints - Required for data synchronization
- FROM Team C: Conflict resolution interfaces - Needed for merge strategies
- FROM Team D: Background sync events - Required for status updates

### What other teams NEED from you:
- TO Team E: Hook interface for testing - Required for comprehensive E2E tests
- TO Integration: Complete offline UI system for final validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### OFFLINE DATA SECURITY
- [ ] **Local Data Encryption**: Encrypt sensitive data in IndexedDB
- [ ] **Sync Validation**: Validate all data before syncing to server
- [ ] **Conflict Prevention**: Prevent data corruption during sync
- [ ] **Session Management**: Handle authentication in offline mode

```typescript
// ✅ SECURE OFFLINE DATA HANDLING:
export function useOfflineData<T>(key: string) {
  const [data, setData] = useState<T | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Encrypt sensitive data before storage
  const storeData = useCallback(async (value: T) => {
    const encryptedValue = await encryptSensitiveFields(value);
    await offlineStorage.set(key, encryptedValue);
    setData(value);
  }, [key]);
  
  // Validate data before sync
  const syncData = useCallback(async () => {
    const localData = await offlineStorage.get(key);
    if (localData && isValidData(localData)) {
      await syncToServer(key, localData);
    }
  }, [key, isOnline]);
  
  return { data, storeData, syncData, isOnline };
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// OFFLINE FUNCTIONALITY TESTING WITH NETWORK SIMULATION

// 1. ONLINE TO OFFLINE TRANSITION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate network going offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    window.dispatchEvent(new Event('offline'));
  }`
});

// 2. OFFLINE FORM SUBMISSION
await mcp__playwright__browser_fill_form({
  fields: [
    {name: "Client Update", type: "textbox", ref: "[data-testid=update-field]", value: "Setup complete"},
    {name: "Vendor Status", type: "checkbox", ref: "[data-testid=vendor-arrived]", value: "true"}
  ]
});

await mcp__playwright__browser_click({element: "Submit Button", ref: "[data-testid=submit]"});
await mcp__playwright__browser_wait_for({text: "Queued for sync"});

// 3. OFFLINE INDICATOR VALIDATION
const offlineIndicator = await mcp__playwright__browser_snapshot();
// Should show "Working Offline" indicator

// 4. RETURN TO ONLINE AND SYNC
await mcp__playwright__browser_evaluate({
  function: `() => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
  }`
});

await mcp__playwright__browser_wait_for({text: "Synced"});

// 5. DATA PERSISTENCE ACROSS RELOAD
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
await mcp__playwright__browser_wait_for({text: "Setup complete"});
```

**REQUIRED TEST COVERAGE:**
- [ ] Offline/online state detection works correctly
- [ ] Data persists when app is reloaded offline
- [ ] Form submissions queue properly when offline
- [ ] Sync status indicators update correctly
- [ ] Error handling for failed syncs
- [ ] Network state changes handled properly


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
- [ ] useOfflineData hook complete and tested
- [ ] OfflineIndicator shows accurate connection status
- [ ] Data persists across app sessions
- [ ] Sync operations work correctly
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Hook responds in <50ms
- [ ] Integrates with all Team B, C, D components
- [ ] Offline transitions are seamless
- [ ] Data integrity maintained during sync
- [ ] Error states provide clear feedback

### Evidence Package Required:
- [ ] Screenshots of offline indicators in action
- [ ] Playwright test results for offline scenarios
- [ ] Network transition testing proof
- [ ] Data persistence validation
- [ ] Sync status progression screenshots
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Hooks: `/wedsync/src/hooks/useOfflineData.ts`
- Components: `/wedsync/src/components/offline/`
- Tests: `/wedsync/tests/offline/`
- Types: `/wedsync/src/types/offline.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch21/WS-172-team-a-round-3-complete.md`
- **Update status:** Add entry to feature-tracker.log

---

## ⚠️ CRITICAL WARNINGS
- Ensure data encryption for sensitive information
- Test network transition edge cases thoroughly
- Coordinate sync timing with other teams
- Handle authentication expiry in offline mode
- Document hook interfaces for other developers

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY