# TEAM A - ROUND 1: WS-188 - Offline Functionality - Frontend UI Components

**Date:** 2025-08-26  
**Feature ID:** WS-188 (Track all work with this ID)  
**Priority:** P1 - Critical mobile functionality  
**Mission:** Build offline-capable UI components with visual indicators and sync status  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer working at remote venues with poor connectivity
**I want to:** Access critical wedding day information (timeline, client contacts, venue details) offline and have my work automatically sync when connection returns
**So that:** I can continue working professionally during the wedding even when Wi-Fi is spotty or cellular service is poor, ensuring I never miss important timeline events or client information

**Real Wedding Problem This Solves:**
A photographer arrives at a countryside wedding venue with no Wi-Fi and spotty cellular service. The ceremony timeline changed that morning, but they can't load the updated schedule. With offline functionality, WedSync pre-caches all wedding day data the night before, stores form responses locally when clients fill out shot lists on-site, and syncs everything seamlessly when connectivity returns after the reception.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Offline UI components with visual indicators
- Form handling that works without connectivity
- Visual sync status and progress indicators
- User-friendly offline messaging

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Offline: IndexedDB via Dexie, Service Worker API

**Integration Points:**
- Service Worker: Interface with background sync
- IndexedDB: Local data storage and caching
- Database: Sync queue and conflict resolution

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

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
  // Get correct library ID first
await mcp__Ref__ref_search_documentation({query: "next progressive-web-app offline latest documentation"});
await mcp__Ref__ref_search_documentation({query: "dexie indexeddb wrapper latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss responsive components latest documentation"});

// For this specific feature, also load:
await mcp__Ref__ref_search_documentation({query: "next pwa offline service worker latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react component patterns latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("useConnection", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "offline ui components"
2. **react-ui-specialist** --think-hard --use-loaded-docs "offline indicators"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "pwa offline" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing patterns and conventions
- Check integration points with service workers
- Review similar implementations for PWAs
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling for offline scenarios
- Consider edge cases (partial sync, conflicts)
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Ref MCP examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] OfflineIndicator component with connection status
- [ ] OfflineCapableForm component that stores locally
- [ ] SyncStatusDisplay showing progress and conflicts
- [ ] ConnectionMonitor hook for real-time status
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests

### Round 2 (Enhancement & Polish):
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Additional test coverage
- [ ] Integration with other team outputs
- [ ] Advanced Playwright scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with all teams
- [ ] Complete E2E testing
- [ ] Performance validation
- [ ] Documentation updates
- [ ] Production readiness

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
- FROM Team B: Offline database API and sync queue endpoints
- FROM Team C: Service worker integration and PWA configuration

### What other teams NEED from you:
- TO Team D: UI component patterns for offline-capable forms
- TO Team E: Visual feedback interfaces for sync operations

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { offlineDataSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  offlineDataSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your implementation here
  }
);
```

### SECURITY CHECKLIST FOR EVERY TEAM PROMPT

Teams MUST implement ALL of these for EVERY API route:

- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **XSS Prevention**: Sanitize ALL user input - see `/src/lib/security/input-validation.ts`
- [ ] **Environment Security**: NEVER expose secrets - validated in `/src/lib/config/environment.ts`
- [ ] **Console Logging**: NO console.log in production code (auto-removed by Next.js)
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users
- [ ] **File Upload Security**: Use `/src/lib/validation/middleware.ts` withFileValidation

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/offline-test"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB COMPLEX USER FLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/dashboard"});     // Tab 1
await mcp__playwright__browser_tab_new({url: "/forms/timeline"}); // Tab 2
await mcp__playwright__browser_tab_select({index: 0});                  // Switch tabs
// Simulate offline
await page.context().setOffline(true);
await mcp__playwright__browser_fill_form({                             // Test offline form
  fields: [{name: "notes", type: "textbox", ref: "[data-testid='offline-notes']", value: "Offline test note"}]
});
await mcp__playwright__browser_tab_select({index: 1});                  // Verify sync
await page.context().setOffline(false);
await mcp__playwright__browser_wait_for({text: "Synced"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    offlineResponse: performance.getEntriesByName('offline-cache-hit')[0]?.duration || 0
  })`
});

// 4. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const offlineSuccessRate = networkFailures.filter(req => req.fromCache).length;

// 5. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-offline-ui.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab workflows (complex user journeys)
- [ ] Scientific performance (Core Web Vitals)
- [ ] Zero console errors (verified)
- [ ] Network success (offline cache hits)
- [ ] Responsive at all sizes (375px, 768px, 1920px)


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

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration points working
- [ ] Performance targets met (<200ms offline data access)
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working offline functionality
- [ ] Playwright test results
- [ ] Performance metrics
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/offline/`
- Types: `/wedsync/src/types/offline.ts`
- Hooks: `/wedsync/src/hooks/useOfflineData.ts`
- Tests: `/wedsync/src/__tests__/unit/offline/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch26/WS-188-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-188) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-188 | ROUND_1_COMPLETE | team-a | batch26" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch26/WS-188-team-a-round-1-complete.md`

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY