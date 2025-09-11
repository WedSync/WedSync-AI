# TEAM E - ROUND 1: WS-159 - Task Tracking - Testing & Quality Assurance

**Date:** 2025-01-25  
**Feature ID:** WS-159 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing suite and quality assurance for task tracking system  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple monitoring task completion
**I want to:** Track task progress with status updates and completion confirmations from helpers
**So that:** I can ensure all wedding preparations are on track and identify bottlenecks early

**Real Wedding Problem This Solves:**
Wedding couples currently struggle to track whether their assigned helpers (bridesmaids, family, friends) have completed their tasks like "Order flowers," "Book transportation," or "Confirm guest count." This leads to last-minute panic when couples discover critical tasks weren't completed. This system must be bulletproof and thoroughly tested to prevent any failures during the critical wedding planning period.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build comprehensive testing framework for task tracking functionality
- Create end-to-end testing scenarios covering complete task lifecycle
- Implement performance testing for real-time updates
- Build accessibility testing for all task tracking interfaces
- Create load testing for notification systems
- Implement security testing for task status validation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest, Jest
- Load Testing: Artillery, K6
- Security Testing: OWASP ZAP integration

**Integration Points:**
- WS-156 Task Creation: Testing existing task structure integration
- WS-157 Helper Assignment: Testing helper assignment workflows
- Team A: Frontend UI component testing
- Team B: Backend API endpoint testing
- Team C: Real-time notification testing
- Team D: Mobile interface testing

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
await mcp__Ref__ref_search_documentation({query: "playwright testing accessibility mobile latest documentation"});
await mcp__Ref__ref_search_documentation({query: "vitest unit-testing mocking latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react testing library component-testing latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing testing patterns:
await mcp__serena__find_symbol("test", "/tests/", true);
await mcp__serena__get_symbols_overview("/tests/");
await mcp__serena__find_symbol("spec", "/tests/", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Task tracking testing coordination"
2. **test-automation-architect** --think-hard --use-loaded-docs "Comprehensive testing framework design"
3. **playwright-visual-testing-specialist** --think-ultra-hard --follow-existing-patterns "E2E and visual testing" --use-browser-mcp
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **code-quality-guardian** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --check-patterns --match-codebase-style
7. **ai-ml-engineer** --accessibility-testing --comprehensive-validation

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing test files and patterns
- Understand current testing infrastructure
- Review other teams' deliverables for testing requirements
- Analyze testing gaps in task tracking functionality
- Continue until you FULLY understand the testing ecosystem

### **PLAN PHASE (THINK HARD!)**
- Create comprehensive testing strategy for task tracking
- Plan test scenarios covering all user workflows
- Design performance and load testing approaches
- Plan accessibility and security testing
- Don't rush - comprehensive testing prevents production issues

### **CODE PHASE (PARALLEL AGENTS!)**
- Build unit tests for all components and services
- Create integration tests for API endpoints
- Implement E2E tests for complete task tracking workflows
- Build performance tests for real-time updates
- Create accessibility tests for all interfaces
- Focus on comprehensive coverage, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run entire test suite
- Generate coverage reports
- Verify all tests passing
- Create comprehensive evidence package
- Only mark complete when ALL tests are passing

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Comprehensive Testing Suite):
- [ ] Unit tests for all task tracking components (>90% coverage)
- [ ] Integration tests for status update APIs
- [ ] E2E tests for complete task tracking workflows
- [ ] Performance tests for real-time notification system
- [ ] Accessibility tests for all task interfaces
- [ ] Security tests for task status validation
- [ ] Load tests for notification delivery
- [ ] Cross-browser compatibility tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI components and interfaces - Required for component testing
- FROM Team B: API endpoints and business logic - Required for integration testing
- FROM Team C: Notification system - Required for real-time testing
- FROM Team D: Mobile interfaces - Required for mobile testing

### What other teams NEED from you:
- TO ALL: Test results and quality reports - Required for their validation
- TO ALL: Performance benchmarks - Required for optimization
- TO ALL: Security validation - Required for production readiness

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### SECURITY TESTING IMPLEMENTATION

**Comprehensive security testing for task tracking:**

```typescript
// ✅ SECURITY TESTING PATTERNS:
describe('Task Tracking Security Tests', () => {
  test('should prevent unauthorized task status updates', async () => {
    const unauthorizedRequest = await request(app)
      .post('/api/tasks/test-uuid/status')
      .send({status: 'completed'})
      .expect(401);
    
    expect(unauthorizedRequest.body.error).toContain('Authentication required');
  });

  test('should validate task ownership before updates', async () => {
    const wrongUserToken = generateTestToken({userId: 'wrong-user'});
    
    const response = await request(app)
      .post('/api/tasks/test-uuid/status')
      .set('Authorization', `Bearer ${wrongUserToken}`)
      .send({status: 'completed'})
      .expect(403);
    
    expect(response.body.error).toContain('Access denied');
  });

  test('should sanitize task status input', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    
    const response = await request(app)
      .post('/api/tasks/test-uuid/status')
      .set('Authorization', validAuthToken)
      .send({status: maliciousInput, notes: maliciousInput})
      .expect(400);
    
    expect(response.body.error).toContain('Invalid status');
  });
});
```

### SECURITY TESTING CHECKLIST

- [ ] **Authentication Testing**: Verify all endpoints require valid authentication
- [ ] **Authorization Testing**: Confirm users can only access their own tasks
- [ ] **Input Validation Testing**: Test all inputs for XSS and injection attacks
- [ ] **Rate Limiting Testing**: Verify rate limits protect against abuse
- [ ] **File Upload Testing**: Validate photo evidence upload security
- [ ] **Session Testing**: Confirm secure session handling

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 COMPREHENSIVE E2E TESTING SCENARIOS:**

```javascript
// COMPREHENSIVE TASK TRACKING E2E TESTS

describe('Task Tracking Complete Workflows', () => {
  test('Complete task lifecycle workflow', async () => {
    // 1. Navigate to task tracking dashboard
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/tasks/tracking"});
    
    // 2. Verify initial state
    const initialSnapshot = await mcp__playwright__browser_snapshot();
    expect(initialSnapshot).toContain('task-tracking-dashboard');
    
    // 3. Create new task
    await mcp__playwright__browser_click({element: "New Task Button", ref: "[data-testid=new-task]"});
    await mcp__playwright__browser_type({
      element: "Task Title Input", 
      ref: "[data-testid=task-title]", 
      text: "Order wedding flowers"
    });
    
    // 4. Assign helper
    await mcp__playwright__browser_click({element: "Assign Helper", ref: "[data-testid=assign-helper]"});
    await mcp__playwright__browser_select_option({
      element: "Helper Dropdown",
      ref: "[data-testid=helper-select]",
      values: ["Maid of Honor"]
    });
    
    // 5. Update status to in progress
    await mcp__playwright__browser_click({element: "Status Update", ref: "[data-testid=status-update]"});
    await mcp__playwright__browser_select_option({
      element: "Status Select",
      ref: "[data-testid=status-select]",
      values: ["in_progress"]
    });
    
    // 6. Add photo evidence
    await mcp__playwright__browser_file_upload({
      paths: ["/path/to/test-image.jpg"]
    });
    
    // 7. Complete task
    await mcp__playwright__browser_click({element: "Mark Complete", ref: "[data-testid=mark-complete]"});
    
    // 8. Verify completion
    await mcp__playwright__browser_wait_for({text: "Task Completed", timeout: 5000});
    
    // 9. Verify real-time updates in second tab
    await mcp__playwright__browser_tab_new({url: "/tasks/dashboard"});
    await mcp__playwright__browser_wait_for({text: "100% Complete"});
  });

  test('Mobile task tracking workflow', async () => {
    // Test on mobile viewport
    await mcp__playwright__browser_resize({width: 390, height: 844});
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/tasks"});
    
    // Test touch interactions
    await mcp__playwright__browser_drag({
      startElement: "Task Card",
      startRef: "[data-testid=mobile-task]",
      endElement: "Complete Zone",
      endRef: "[data-testid=complete-zone]"
    });
    
    // Verify swipe to complete
    await mcp__playwright__browser_wait_for({text: "Task Completed"});
  });

  test('Accessibility validation', async () => {
    await mcp__playwright__browser_navigate({url: "http://localhost:3000/tasks/tracking"});
    
    // Get accessibility snapshot
    const a11ySnapshot = await mcp__playwright__browser_snapshot();
    
    // Verify ARIA labels and roles are present
    expect(a11ySnapshot).toContain('role="button"');
    expect(a11ySnapshot).toContain('aria-label');
    
    // Test keyboard navigation
    await mcp__playwright__browser_press_key({key: "Tab"});
    await mcp__playwright__browser_press_key({key: "Enter"});
    
    // Verify focus management
    const focusedElement = await mcp__playwright__browser_evaluate({
      function: `() => document.activeElement.getAttribute('data-testid')`
    });
    expect(focusedElement).toBeTruthy();
  });
});
```

**REQUIRED COMPREHENSIVE TEST COVERAGE:**
- [ ] Complete task lifecycle testing (create → assign → update → complete)
- [ ] Multi-user collaboration workflows
- [ ] Real-time synchronization across multiple sessions
- [ ] Mobile device testing with touch interactions
- [ ] Accessibility compliance validation
- [ ] Performance under load (100+ concurrent users)
- [ ] Error handling and recovery scenarios
- [ ] Offline functionality testing


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

### Comprehensive Testing Implementation:
- [ ] All deliverables for this round complete
- [ ] Unit tests achieving >90% code coverage
- [ ] Integration tests covering all API endpoints
- [ ] E2E tests covering complete user workflows
- [ ] Performance tests validating <200ms response times
- [ ] All tests passing in CI/CD pipeline

### Quality Assurance Validation:
- [ ] Security tests confirming no vulnerabilities
- [ ] Accessibility tests meeting WCAG 2.1 AA standards
- [ ] Load tests handling 100+ concurrent users
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing on multiple screen sizes

### Evidence Package Required:
- [ ] Complete test suite execution report
- [ ] Code coverage report showing >90% coverage
- [ ] Performance testing results and benchmarks
- [ ] Accessibility compliance report
- [ ] Security testing validation report
- [ ] Cross-browser compatibility report

---

## 💾 WHERE TO SAVE YOUR WORK

### Test Files:
- Unit Tests: `/wedsync/tests/unit/tasks/`
- Integration Tests: `/wedsync/tests/integration/tasks/`
- E2E Tests: `/wedsync/tests/e2e/tasks/`
- Performance Tests: `/wedsync/tests/performance/`
- Security Tests: `/wedsync/tests/security/`

### Test Reports:
- Coverage Reports: `/wedsync/coverage/`
- Performance Reports: `/wedsync/performance-reports/`
- Accessibility Reports: `/wedsync/accessibility-reports/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch17/WS-159-team-e-round-1-complete.md`
- **Include:** Feature ID (WS-159) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-159 | ROUND_1_COMPLETE | team-e | batch17" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip any category of testing - all are required
- Do NOT claim completion with failing tests
- Do NOT ignore performance or security testing requirements
- REMEMBER: All 5 teams work in PARALLEL - your tests validate their work

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Complete test suite written and passing
- [ ] >90% code coverage achieved
- [ ] Performance benchmarks met
- [ ] Security validation passed
- [ ] Accessibility compliance confirmed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY