# TEAM B — BATCH 27 — ROUND 1 — WS-192 - Integration Tests Suite - API Integration Testing

**Date:** 2025-08-26  
**Feature ID:** WS-192 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive API integration testing for supplier-couple workflow validation  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync development team member preparing for production deployment
**I want to:** Implement comprehensive integration tests that verify complete user workflows and data flows between components
**So that:** I can catch critical bugs before they affect wedding suppliers and couples, ensure data integrity across the entire platform, and maintain confidence when deploying updates during peak wedding season

**Real Wedding Problem This Solves:**
A photographer connects to a couple's wedding 2 months before the big day. The photographer's intake form auto-populates with the couple's venue and date information, the couple fills out the form, which triggers an automated journey with a consultation meeting booking, and the photographer receives the completed information. Integration tests verify this entire workflow works correctly - form creation, couple connection, core field synchronization, form submission, journey automation, and meeting scheduling - ensuring no couples lose their form data or miss critical photography timelines.


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

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- API endpoint integration testing
- Form submission API validation
- Journey trigger API testing
- Core field synchronization API testing
- Meeting booking API integration
- Cross-API workflow validation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest, Jest
- APIs: Next.js API routes, Supabase Edge Functions

**Integration Points:**
- Team A testing framework: API testing utilities
- Form APIs: Creation, submission, and auto-population
- Journey APIs: Automation trigger endpoints
- Core field APIs: Synchronization validation
- Communication APIs: Meeting scheduling

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
await mcp__Ref__ref_resolve_library_id("next.js");
await mcp__Ref__ref_get_library_docs("/vercel/next.js", "api-testing integration-testing", 5000);
await mcp__Ref__ref_get_library_docs("/supabase/supabase", "api-testing edge-functions", 3000);
await mcp__Ref__ref_get_library_docs("/vitest-dev/vitest", "api-integration mocking", 2000);

await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__find_symbol("api", "route", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "coordinate API integration testing"
2. **api-architect** --think-hard --use-loaded-docs "comprehensive API testing"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "API route testing" 
4. **supabase-specialist** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **security-compliance-officer** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] API integration test suite (`/tests/integration/api/supplier-couple-flow.test.ts`)
- [ ] Form submission API tests (`/tests/integration/api/form-submission.test.ts`)
- [ ] Journey automation API tests (`/tests/integration/api/journey-automation.test.ts`)
- [ ] Core field sync API tests (`/tests/integration/api/core-fields-sync.test.ts`)
- [ ] API test utilities (`/tests/integration/utils/api-testing.ts`)
- [ ] API mock server setup (`/tests/integration/mocks/api-server.ts`)

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ SECURE API TESTING PATTERN:
import { APITestSecurity } from '@/tests/utils/api-security';

describe('API Integration Security', () => {
  const apiSecurity = new APITestSecurity();

  test('form submission APIs validate input', async () => {
    const maliciousData = {
      weddingDate: '<script>alert("xss")</script>',
      venue: 'DROP TABLE couples;',
      specialRequests: 'x'.repeat(10000) // DOS attempt
    };

    const response = await apiSecurity.testAPIEndpoint(
      '/api/forms/submit',
      'POST',
      maliciousData
    );

    expect(response.status).toBe(400); // Should reject malicious input
    expect(response.body).not.toContain('<script>');
  });

  test('journey APIs require proper authorization', async () => {
    const unauthorizedRequest = await apiSecurity.testUnauthorizedAccess(
      '/api/journeys/trigger',
      'POST',
      { coupleId: 'test-couple-id', journeyType: 'consultation' }
    );

    expect(unauthorizedRequest.status).toBe(403);
  });
});
```

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

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- API Tests: `/wedsync/tests/integration/api/`
- Utilities: `/wedsync/tests/integration/utils/api-testing.ts`
- Mocks: `/wedsync/tests/integration/mocks/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch27/WS-192-team-b-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY