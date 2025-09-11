# TEAM E - ROUND 1: WS-162 - Helper Schedules - Testing & Quality Assurance

**Date:** 2025-08-25  
**Feature ID:** WS-162 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Create comprehensive test suites and ensure quality for helper schedule feature  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding helper receiving task assignments
**I want to:** View my personalized wedding day schedule with all assigned tasks and timing
**So that:** I know exactly when and where to be for my responsibilities

**Real Wedding Problem This Solves:**
Currently, wedding helpers (bridesmaids, groomsmen, family) receive fragmented information via texts, emails, or verbal instructions. They often miss tasks or arrive late because they don't have a clear schedule. This feature creates a single source of truth for each helper's personalized timeline.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Comprehensive test coverage for all components
- E2E testing of schedule workflows
- Performance testing and benchmarking
- Accessibility validation
- Cross-browser compatibility testing

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Testing: Playwright MCP, Browser MCP, Vitest, Testing Library
- Performance: Lighthouse, Web Vitals
- Accessibility: axe-core, NVDA/JAWS testing

**Integration Points:**
- [All Components]: Test coverage for Teams A-D work
- [API Endpoints]: Integration testing
- [Database]: Data integrity validation
- [Mobile]: Device-specific testing

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
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
// Library ID resolution no longer needed with Ref MCP
  
await mcp__Ref__ref_search_documentation({query: "playwright e2e-testing mobile latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react testing library component-testing latest documentation"});
await mcp__Ref__ref_search_documentation({query: "vitest unit-testing mocks latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("test", "", true);
await mcp__serena__get_symbols_overview("/tests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Comprehensive test coverage"
2. **test-automation-architect** --think-hard --use-loaded-docs "Design test strategy"
3. **playwright-visual-testing-specialist** --think-ultra-hard --follow-existing-patterns "E2E scenarios"  --use-browser-mcp
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **performance-optimization-expert** --benchmark-focus --core-web-vitals
6. **accessibility** --wcag-compliance --screen-reader-testing
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Review all team components and APIs
- Understand test requirements
- Check existing test patterns
- Identify critical user paths
- Continue until you FULLY understand testing needs

### **PLAN PHASE (THINK HARD!)**
- Design test matrix covering all scenarios
- Plan performance benchmarks
- Create accessibility test cases
- Plan cross-browser testing
- Consider edge cases and error states

### **CODE PHASE (PARALLEL AGENTS!)**
- Write unit tests for all components
- Create integration tests for APIs
- Build E2E test scenarios
- Implement performance tests
- Add accessibility tests

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run full test suite
- Generate coverage reports
- Create performance metrics
- Validate accessibility scores
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Unit tests for HelperSchedule components (>80% coverage)
- [ ] Integration tests for schedule API endpoints
- [ ] E2E tests for complete schedule workflow
- [ ] Performance benchmarks and metrics
- [ ] Accessibility validation suite
- [ ] Cross-browser test results

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
- FROM Team A: Components with proper test IDs
- FROM Team B: API endpoints for integration testing
- FROM Team C: Notification mocks for testing
- FROM Team D: Mobile scenarios to validate

### What other teams NEED from you:
- TO ALL Teams: Test coverage reports
- TO ALL Teams: Performance metrics
- TO ALL Teams: Bug reports and fixes

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY TESTING

```typescript
// ✅ SECURITY TEST SCENARIOS:
describe('Helper Schedule Security', () => {
  it('should prevent unauthorized access to other helpers schedules', async () => {
    const response = await fetch('/api/schedules/other-helper-id', {
      headers: { 'Authorization': 'Bearer current-helper-token' }
    });
    expect(response.status).toBe(403);
  });
  
  it('should sanitize user input in schedule notes', async () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const sanitized = await sanitizeScheduleInput(maliciousInput);
    expect(sanitized).not.toContain('<script>');
  });
  
  it('should rate limit schedule refresh requests', async () => {
    const requests = Array(20).fill(null).map(() => 
      fetch('/api/schedules/refresh')
    );
    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### SECURITY CHECKLIST
- [ ] **Authorization Tests**: Verify access controls
- [ ] **Input Validation Tests**: Test all input sanitization
- [ ] **Rate Limiting Tests**: Verify limits work
- [ ] **XSS Prevention Tests**: Check content sanitization
- [ ] **Data Leakage Tests**: Ensure no PII exposed

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// COMPREHENSIVE E2E TESTING
test.describe('Helper Schedule Complete Flow', () => {
  test('Full helper schedule workflow', async () => {
    // Navigate to schedule
    await mcp__playwright__browser_navigate({url: '/helper-schedule'});
    
    // Test on multiple viewports
    for (const device of ['iPhone 12', 'iPad', 'Desktop']) {
      if (device === 'iPhone 12') {
        await mcp__playwright__browser_resize({width: 390, height: 844});
      } else if (device === 'iPad') {
        await mcp__playwright__browser_resize({width: 820, height: 1180});
      } else {
        await mcp__playwright__browser_resize({width: 1920, height: 1080});
      }
      
      // Take accessibility snapshot
      const a11ySnapshot = await mcp__playwright__browser_snapshot();
      
      // Verify schedule loads
      await mcp__playwright__browser_wait_for({text: 'Your Wedding Day Schedule'});
      
      // Test schedule acceptance
      await mcp__playwright__browser_click({
        element: 'Accept Schedule button',
        ref: '[data-testid="accept-schedule"]'
      });
      
      // Verify confirmation
      await mcp__playwright__browser_wait_for({text: 'Schedule Accepted'});
      
      // Test offline mode
      await mcp__playwright__browser_evaluate({
        function: `() => navigator.onLine = false`
      });
      
      // Verify offline access
      const offlineSnapshot = await mcp__playwright__browser_snapshot();
      expect(offlineSnapshot).toContain('schedule-event');
      
      // Performance metrics
      const metrics = await mcp__playwright__browser_evaluate({
        function: `() => ({
          LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
          FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
          CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
        })`
      });
      
      // Assert performance thresholds
      expect(metrics.LCP).toBeLessThan(2500);
      expect(metrics.FCP).toBeLessThan(1800);
      expect(metrics.CLS).toBeLessThan(0.1);
    }
  });
});
```


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
- [ ] Unit test coverage >80% for all components
- [ ] Integration tests passing for all APIs
- [ ] E2E tests covering critical paths
- [ ] Performance metrics meeting targets
- [ ] Accessibility score >95
- [ ] Zero critical security vulnerabilities

### Evidence Package Required:
- [ ] Coverage report showing >80%
- [ ] Performance metrics dashboard
- [ ] Accessibility audit results
- [ ] Cross-browser test matrix

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Unit Tests: `/wedsync/tests/unit/schedules/`
- Integration: `/wedsync/tests/integration/schedules/`
- E2E Tests: `/wedsync/tests/e2e/helper-schedules.spec.ts`
- Performance: `/wedsync/tests/performance/schedules.perf.ts`
- Security: `/wedsync/tests/security/schedules.security.ts`

### Test Reports:
- Coverage: `/wedsync/coverage/lcov-report/index.html`
- Performance: `/wedsync/lighthouse-reports/`
- Accessibility: `/wedsync/a11y-reports/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch18/WS-162-team-e-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT skip any test categories
- Do NOT ignore failing tests
- Do NOT lower coverage thresholds
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL on same feature

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY