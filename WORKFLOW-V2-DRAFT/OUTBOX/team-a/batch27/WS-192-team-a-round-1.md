# TEAM A — BATCH 27 — ROUND 1 — WS-192 - Integration Tests Suite - Core Integration Framework

**Date:** 2025-08-26  
**Feature ID:** WS-192 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive integration testing framework for supplier-couple workflow validation  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync development team member preparing for production deployment
**I want to:** Implement comprehensive integration tests that verify complete user workflows and data flows between components
**So that:** I can catch critical bugs before they affect wedding suppliers and couples, ensure data integrity across the entire platform, and maintain confidence when deploying updates during peak wedding season

**Real Wedding Problem This Solves:**
A photographer connects to a couple's wedding 2 months before the big day. The photographer's intake form auto-populates with the couple's venue and date information, the couple fills out the form, which triggers an automated journey with a consultation meeting booking, and the photographer receives the completed information. Integration tests verify this entire workflow works correctly - form creation, couple connection, core field synchronization, form submission, journey automation, and meeting scheduling - ensuring no couples lose their form data or miss critical photography timelines.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Complete supplier-couple workflow integration testing
- Form creation and auto-population testing
- Core field synchronization validation
- Journey automation trigger testing
- Data integrity across component boundaries
- Cross-system integration validation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest, Jest
- Integration: Supabase realtime, journey engine, form system

**Integration Points:**
- Core fields system: Auto-population testing
- Form system: Creation and submission validation
- Journey engine: Automation trigger testing
- Communication system: Meeting booking validation
- Database: Data consistency across workflows

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
// 1. LOAD TESTING DOCUMENTATION:
await mcp__Ref__ref_resolve_library_id("vitest");
await mcp__Ref__ref_get_library_docs("/vitest-dev/vitest", "integration-testing database-testing", 5000);
await mcp__Ref__ref_get_library_docs("/supabase/supabase", "testing realtime integration", 3000);
await mcp__Ref__ref_get_library_docs("/microsoft/playwright", "workflow-testing e2e", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("integration", "", true);
await mcp__serena__get_symbols_overview("/tests/integration/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "coordinate integration testing framework"
2. **test-automation-architect** --think-hard --use-loaded-docs "comprehensive integration testing"
3. **postgresql-database-expert** --think-ultra-hard --follow-existing-patterns "database integration testing" 
4. **supabase-specialist** --think-ultra-hard --check-current-best-practices
5. **nextjs-fullstack-developer** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing integration test patterns first
- Understand current testing infrastructure
- Check supplier-couple workflow components
- Review form and journey systems
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create comprehensive integration test strategy
- Write test cases FIRST (TDD)
- Plan workflow simulation approach
- Consider real-world wedding scenarios
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before any integration setup
- Follow existing test patterns
- Use Ref MCP examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Integration testing framework setup (`/tests/integration/setup.ts`)
- [ ] Database testing utilities (`/tests/integration/utils/database.ts`)
- [ ] Workflow simulation framework (`/tests/integration/utils/workflow-simulator.ts`)
- [ ] Core field synchronization tests (`/tests/integration/core-fields-sync.test.ts`)
- [ ] Test data factory system (`/tests/integration/factories/wedding-data-factory.ts`)
- [ ] Integration test runner configuration

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
- FROM Team B: API testing utilities and endpoint contracts
- FROM Team C: Journey engine testing hooks
- FROM Team D: Form system testing patterns

### What other teams NEED from you:
- TO Team B: Database testing utilities for API validation
- TO Team C: Workflow simulation framework for journey testing
- TO Team D: Integration test base classes for form testing
- TO Team E: Core testing infrastructure for comprehensive validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY TESTING INTEGRATION

```typescript
// ✅ SECURE INTEGRATION TESTING PATTERN:
import { IntegrationTestSecurity } from '@/tests/utils/security';

describe('Supplier-Couple Integration Security', () => {
  const securityUtils = new IntegrationTestSecurity();

  beforeEach(async () => {
    // Clean test environment with proper isolation
    await securityUtils.cleanTestEnvironment();
    await securityUtils.createIsolatedTestData();
  });

  test('supplier-couple connection requires proper authorization', async () => {
    const supplier = await securityUtils.createTestSupplier();
    const couple = await securityUtils.createTestCouple();
    
    // Test unauthorized connection attempt
    const unauthorizedConnection = await securityUtils.attemptConnection(
      supplier.id,
      couple.id,
      { authorization: 'invalid-token' }
    );
    
    expect(unauthorizedConnection.status).toBe(403);
  });

  test('form auto-population only accesses authorized data', async () => {
    const supplier = await securityUtils.createTestSupplier();
    const couple = await securityUtils.createTestCouple();
    const otherCouple = await securityUtils.createTestCouple();
    
    const form = await securityUtils.createSupplierForm(supplier.id);
    const populatedForm = await securityUtils.autoPopulateForm(
      form.id,
      couple.id
    );
    
    // Verify only authorized couple's data is included
    expect(populatedForm.data).toContain(couple.weddingDate);
    expect(populatedForm.data).not.toContain(otherCouple.weddingDate);
  });
});
```

### CRITICAL INTEGRATION SECURITY VALIDATION

**1. Data Isolation Testing:**
```typescript
// Ensure couples can't see other couples' data
describe('Data Isolation in Integration Flows', () => {
  test('couple A cannot access couple B data via supplier forms', async () => {
    const [coupleA, coupleB, supplier] = await Promise.all([
      createTestCouple('A'),
      createTestCouple('B'),
      createTestSupplier()
    ]);
    
    // Connect supplier to both couples
    await connectSupplierToCouple(supplier.id, coupleA.id);
    await connectSupplierToCouple(supplier.id, coupleB.id);
    
    // Test that form for couple A doesn't expose couple B data
    const formForCoupleA = await generateSupplierForm(supplier.id, coupleA.id);
    
    expect(formForCoupleA.prepopulatedData).toEqual(
      expect.objectContaining({
        weddingDate: coupleA.weddingDate,
        venue: coupleA.venue
      })
    );
    
    expect(formForCoupleA.prepopulatedData).not.toContain(coupleB.weddingDate);
    expect(formForCoupleA.prepopulatedData).not.toContain(coupleB.venue);
  });
});
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// COMPREHENSIVE INTEGRATION WORKFLOW TESTING

describe('Supplier-Couple Integration Workflows', () => {
  test('complete photographer-couple workflow', async () => {
    // 1. SETUP TEST DATA
    const testData = await createIntegrationTestData();
    
    // 2. SUPPLIER CREATES FORM
    await mcp__playwright__browser_navigate({
      url: `http://localhost:3000/supplier/forms/create`
    });
    
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: "Form Title",
          type: "textbox",
          ref: "input[data-testid='form-title']",
          value: "Photography Consultation Form"
        },
        {
          name: "Enable Auto-Population",
          type: "checkbox",
          ref: "input[data-testid='auto-populate']",
          value: "true"
        }
      ]
    });
    
    await mcp__playwright__browser_click({
      element: "Create Form button",
      ref: "button[data-testid='create-form']"
    });
    
    // 3. COUPLE ACCESSES FORM
    const formUrl = await mcp__playwright__browser_evaluate({
      function: `() => document.querySelector('[data-testid="form-url"]')?.textContent`
    });
    
    // Switch to new tab for couple's perspective
    await mcp__playwright__browser_tabs({action: "new", url: formUrl});
    
    // 4. VALIDATE AUTO-POPULATION
    const autoPopulatedData = await mcp__playwright__browser_evaluate({
      function: `() => ({
        weddingDate: document.querySelector('[data-testid="wedding-date"]')?.value,
        venue: document.querySelector('[data-testid="venue"]')?.value,
        guestCount: document.querySelector('[data-testid="guest-count"]')?.value
      })`
    });
    
    expect(autoPopulatedData.weddingDate).toBe(testData.couple.weddingDate);
    expect(autoPopulatedData.venue).toBe(testData.couple.venue);
    
    // 5. COUPLE COMPLETES FORM
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: "Photography Style Preference",
          type: "textbox",
          ref: "input[data-testid='style-preference']",
          value: "Natural candid moments"
        },
        {
          name: "Special Requests",
          type: "textbox",
          ref: "textarea[data-testid='special-requests']",
          value: "Include photos of grandparents"
        }
      ]
    });
    
    await mcp__playwright__browser_click({
      element: "Submit Form button",
      ref: "button[data-testid='submit-form']"
    });
    
    // 6. VALIDATE JOURNEY AUTOMATION
    await mcp__playwright__browser_wait_for({text: "Form submitted successfully"});
    
    // 7. CHECK SUPPLIER RECEIVES DATA
    await mcp__playwright__browser_tabs({action: "select", index: 0});
    await mcp__playwright__browser_navigate({
      url: "http://localhost:3000/supplier/forms/responses"
    });
    
    const supplierReceivesData = await mcp__playwright__browser_evaluate({
      function: `() => ({
        responseCount: document.querySelectorAll('[data-testid="form-response"]').length,
        latestResponse: document.querySelector('[data-testid="latest-response"]')?.textContent
      })`
    });
    
    expect(supplierReceivesData.responseCount).toBeGreaterThan(0);
    expect(supplierReceivesData.latestResponse).toContain("Natural candid moments");
  });

  test('journey automation triggers correctly', async () => {
    // Test that form submission triggers automated journey
    const testData = await createIntegrationTestData();
    
    // Setup journey monitoring
    const journeyStarted = await mcp__playwright__browser_evaluate({
      function: `() => {
        return new Promise((resolve) => {
          window.journeyEngine?.onJourneyStart((journeyId) => {
            resolve({ started: true, journeyId });
          });
          
          // Trigger form submission
          window.formSystem?.submitForm('${testData.formId}', {
            coupleId: '${testData.coupleId}',
            data: { consultation: 'requested' }
          });
        });
      }`
    });
    
    expect(journeyStarted.started).toBe(true);
    expect(journeyStarted.journeyId).toBeDefined();
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
- [ ] All deliverables for this round complete
- [ ] Integration testing framework operational
- [ ] Database testing utilities working
- [ ] Zero TypeScript errors
- [ ] Zero test framework errors

### Integration & Performance:
- [ ] Workflow simulation framework functional
- [ ] Core field synchronization validated
- [ ] Test data factory producing consistent data
- [ ] Security requirements met
- [ ] Integration tests run under 30 seconds

### Evidence Package Required:
- [ ] Integration test framework demonstration
- [ ] Workflow simulation proof
- [ ] Database testing utilities validation
- [ ] Security testing results
- [ ] Performance metrics for test execution

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Framework: `/wedsync/tests/integration/setup.ts`
- Utils: `/wedsync/tests/integration/utils/`
- Factories: `/wedsync/tests/integration/factories/`
- Core Tests: `/wedsync/tests/integration/core-fields-sync.test.ts`
- Types: `/wedsync/src/types/integration-testing.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch27/WS-192-team-a-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY