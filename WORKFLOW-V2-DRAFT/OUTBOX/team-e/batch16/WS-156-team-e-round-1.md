# TEAM E - ROUND 1: WS-156 - Task Creation System - Testing & Quality Assurance

**Date:** 2025-01-25  
**Feature ID:** WS-156 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing suite and quality validation for task creation system  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple preparing for their big day
**I want to:** Create detailed tasks for my wedding helpers with specific timing, locations, and instructions
**So that:** My helpers know exactly what to do, when to do it, and where to be, eliminating confusion and ensuring smooth execution

**Real Wedding Problem This Solves:**
A couple typically creates a "day-of timeline" in a Word document that gets lost or outdated. With this feature, they create tasks like "Set up ceremony chairs (2pm-2:30pm at Garden Pavilion, need 100 white chairs from storage)" that get assigned to specific helpers. This eliminates the chaos of people asking "what should I be doing now?" throughout the wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Comprehensive test suite covering all task creation workflows
- Performance validation for large task sets (100+ tasks)
- Security testing for input validation and data protection
- Accessibility compliance testing (WCAG 2.1 AA)
- Cross-browser compatibility validation
- Load testing for concurrent user scenarios

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest, Jest
- Quality Tools: ESLint, Lighthouse, Axe accessibility

**Integration Points:**
- All Team Components: Frontend, backend, integrations, mobile
- Testing Infrastructure: CI/CD pipelines, automated testing
- Quality Gates: Performance, security, accessibility validation
- Monitoring: Error tracking, performance metrics

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (For testing patterns):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("playwright");  // Get correct library ID first
await mcp__context7__get-library-docs("/microsoft/playwright", "testing-best-practices", 5000);
await mcp__context7__get-library-docs("/vitest-dev/vitest", "unit-testing mocking", 3000);
await mcp__context7__get-library-docs("/testing-library/react-testing-library", "integration-tests", 2000);
await mcp__context7__get-library-docs("/deque-systems/axe-core", "accessibility-testing", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("TaskCreator.test", "", true);
await mcp__serena__get_symbols_overview("/wedsync/tests");
await mcp__serena__get_symbols_overview("/wedsync/__tests__");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (testing frameworks evolve rapidly!)
- Serena shows existing patterns to follow (consistent test architecture!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track task testing and quality assurance"
2. **test-automation-architect** --think-hard --use-loaded-docs "Build comprehensive test suite architecture"
3. **playwright-visual-testing-specialist** --think-ultra-hard --follow-existing-patterns "Create visual regression and E2E tests" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **code-quality-guardian** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --think-hard --performance-testing "Validate performance under load"
7. **verification-cycle-coordinator** --accessibility-first --quality-gates "Coordinate all quality checks"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing patterns and conventions
- Check integration points
- Review similar implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling
- Consider edge cases
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Context7 examples as templates
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
- [ ] Unit test suite for TaskCreator component (>90% coverage)
- [ ] Integration tests for task API endpoints
- [ ] Playwright E2E tests for complete task creation workflow
- [ ] Performance benchmarks for task creation operations
- [ ] Accessibility validation suite (WCAG 2.1 AA compliance)
- [ ] Security testing for input validation and XSS prevention
- [ ] Cross-browser compatibility test matrix

### Round 2 (Enhancement & Polish):
- [ ] Load testing for concurrent task creation (50+ users)
- [ ] Visual regression testing for UI consistency
- [ ] Error handling and recovery scenario testing
- [ ] Database performance testing with large datasets
- [ ] Mobile device testing across different screen sizes

### Round 3 (Integration & Finalization):
- [ ] Complete end-to-end user journey testing
- [ ] Production readiness checklist validation
- [ ] Automated quality gate configuration
- [ ] Performance monitoring dashboard setup
- [ ] Final security audit and compliance verification

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Frontend components for testing - Required for comprehensive test coverage
- FROM Team B: API contracts and test data - Required for integration testing
- FROM Team C: Integration endpoints for testing - Dependency for service validation
- FROM Team D: Mobile components and PWA features - Required for mobile testing

### What other teams NEED from you:
- TO ALL TEAMS: Test results and quality metrics - They need this for deployment validation
- TO DevOps: Automated test configurations - Blocking CI/CD pipeline setup

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY TESTING IMPLEMENTATION

**EVERY security test MUST validate the security framework:**

```typescript
// ❌ NEVER DO THIS (INCOMPLETE SECURITY TESTING):
test('Task creation API', async () => {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Test task' })
  });
  expect(response.status).toBe(200); // NO SECURITY VALIDATION!
});

// ✅ ALWAYS DO THIS (MANDATORY COMPREHENSIVE TESTING):
import { generateCSRFToken, createAuthenticatedRequest } from '@/test-utils/security-helpers';
import { setupSecurityTestData, cleanupSecurityTestData } from '@/test-utils/test-data';

describe('Task Creation Security', () => {
  beforeEach(async () => {
    await setupSecurityTestData();
  });
  
  afterEach(async () => {
    await cleanupSecurityTestData();
  });
  
  test('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Unauthorized test' })
    });
    
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Authentication required'
    });
  });
  
  test('should validate CSRF tokens', async () => {
    const validRequest = await createAuthenticatedRequest({
      title: 'CSRF test task',
      category: 'setup'
    });
    
    // Test without CSRF token
    const noCsrfResponse = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': validRequest.headers.Authorization
      },
      body: validRequest.body
    });
    
    expect(noCsrfResponse.status).toBe(403);
    
    // Test with invalid CSRF token
    const invalidCsrfResponse = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 
        ...validRequest.headers,
        'X-CSRF-Token': 'invalid-token'
      },
      body: validRequest.body
    });
    
    expect(invalidCsrfResponse.status).toBe(403);
    
    // Test with valid CSRF token
    const validResponse = await fetch('/api/tasks', {
      method: 'POST',
      headers: validRequest.headers,
      body: validRequest.body
    });
    
    expect(validResponse.status).toBe(200);
  });
  
  test('should prevent XSS attacks', async () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "';alert('XSS');//"
    ];
    
    for (const payload of xssPayloads) {
      const request = await createAuthenticatedRequest({
        title: payload,
        description: `Test task with payload: ${payload}`,
        category: 'setup'
      });
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: request.headers,
        body: request.body
      });
      
      expect(response.status).toBe(200);
      
      const result = await response.json();
      
      // Verify payload is sanitized
      expect(result.data.title).not.toContain('<script>');
      expect(result.data.title).not.toContain('javascript:');
      expect(result.data.description).not.toContain('<script>');
    }
  });
  
  test('should prevent SQL injection', async () => {
    const sqlPayloads = [
      "'; DROP TABLE wedding_tasks; --",
      "' OR '1'='1",
      "1; DELETE FROM wedding_tasks WHERE id = '1'; --",
      "' UNION SELECT * FROM users --"
    ];
    
    for (const payload of sqlPayloads) {
      const request = await createAuthenticatedRequest({
        title: payload,
        category: 'setup',
        timing_value: payload
      });
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: request.headers,
        body: request.body
      });
      
      // Should either be sanitized (200) or rejected (400)
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        const result = await response.json();
        // Verify no SQL injection occurred
        expect(result.data.title).not.toContain('DROP TABLE');
        expect(result.data.title).not.toContain('DELETE FROM');
        expect(result.data.timing_value).not.toContain('UNION SELECT');
      }
    }
  });
  
  test('should enforce rate limiting', async () => {
    const requests = [];
    
    // Send 100 rapid requests
    for (let i = 0; i < 100; i++) {
      const request = createAuthenticatedRequest({
        title: `Rate limit test ${i}`,
        category: 'setup'
      });
      
      requests.push(
        fetch('/api/tasks', {
          method: 'POST',
          headers: (await request).headers,
          body: (await request).body
        })
      );
    }
    
    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    // Should have rate limited some requests
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### SECURITY CHECKLIST FOR ALL TESTS

Teams MUST implement ALL of these security test categories:

- [ ] **Authentication Testing**: Verify all endpoints require valid authentication
- [ ] **Authorization Testing**: Ensure users can only access their own data
- [ ] **Input Validation Testing**: Test XSS, SQL injection, and malformed data
- [ ] **CSRF Protection Testing**: Verify CSRF tokens are required and validated
- [ ] **Rate Limiting Testing**: Ensure abuse protection is working
- [ ] **File Upload Security Testing**: Validate file type, size, and content restrictions
- [ ] **Error Handling Testing**: Ensure no sensitive information leaks in errors
- [ ] **Session Security Testing**: Verify proper session management

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 COMPREHENSIVE QUALITY VALIDATION (Beyond Basic Testing!):**

```javascript
// REVOLUTIONARY QUALITY ASSURANCE APPROACH!

// 1. COMPLETE USER JOURNEY TESTING
test('Complete wedding task creation journey', async () => {
  // Test realistic wedding planning scenario
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  await mcp__playwright__browser_snapshot();
  
  // Create comprehensive wedding task set
  const weddingTasks = [
    {
      title: 'Set up ceremony chairs',
      category: 'setup',
      timing: '13:00',
      duration: 30,
      location: 'Garden Pavilion'
    },
    {
      title: 'Sound check with DJ',
      category: 'ceremony',
      timing: '14:00',
      duration: 15,
      location: 'Main Stage'
    },
    {
      title: 'Guest reception setup',
      category: 'reception',
      timing: '16:00',
      duration: 60,
      location: 'Grand Hall'
    }
  ];
  
  for (const task of weddingTasks) {
    await mcp__playwright__browser_click({
      element: 'Create new task button',
      ref: 'button[data-testid="create-task"]'
    });
    
    await mcp__playwright__browser_type({
      element: 'Task title input',
      ref: 'input[name="title"]',
      text: task.title
    });
    
    await mcp__playwright__browser_select_option({
      element: 'Category selector',
      ref: 'select[name="category"]',
      values: [task.category]
    });
    
    await mcp__playwright__browser_type({
      element: 'Timing input',
      ref: 'input[name="timing_value"]',
      text: task.timing
    });
    
    await mcp__playwright__browser_type({
      element: 'Duration input',
      ref: 'input[name="estimated_duration"]',
      text: task.duration.toString()
    });
    
    await mcp__playwright__browser_type({
      element: 'Location input',
      ref: 'input[name="location"]',
      text: task.location
    });
    
    await mcp__playwright__browser_click({
      element: 'Save task button',
      ref: 'button[type="submit"]'
    });
    
    // Verify task created successfully
    await mcp__playwright__browser_wait_for({
      text: 'Task created successfully'
    });
  }
  
  // Verify all tasks appear in timeline
  await mcp__playwright__browser_wait_for({text: weddingTasks[0].title});
  await mcp__playwright__browser_wait_for({text: weddingTasks[1].title});
  await mcp__playwright__browser_wait_for({text: weddingTasks[2].title});
  
  await mcp__playwright__browser_snapshot();
});

// 2. PERFORMANCE AND LOAD TESTING
test('Performance under heavy load', async () => {
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  const startTime = Date.now();
  
  // Create 50 tasks rapidly to test performance
  const taskPromises = [];
  for (let i = 1; i <= 50; i++) {
    taskPromises.push(
      (async () => {
        await mcp__playwright__browser_click({
          element: 'Create task button',
          ref: 'button[data-testid="create-task"]'
        });
        
        await mcp__playwright__browser_type({
          element: 'Task title input',
          ref: 'input[name="title"]',
          text: `Performance test task ${i}`
        });
        
        await mcp__playwright__browser_click({
          element: 'Save button',
          ref: 'button[type="submit"]'
        });
        
        await mcp__playwright__browser_wait_for({
          text: 'Task created successfully'
        });
      })()
    );
  }
  
  await Promise.all(taskPromises);
  
  const totalTime = Date.now() - startTime;
  
  // Should handle 50 task creations in under 30 seconds
  expect(totalTime).toBeLessThan(30000);
  
  // Measure page performance
  const performanceMetrics = await mcp__playwright__browser_evaluate({
    function: `() => {
      return {
        LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
        FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0),
        FID: performance.getEntriesByType('first-input')?.delay || 0
      };
    }`
  });
  
  // Validate Core Web Vitals
  expect(performanceMetrics.LCP).toBeLessThan(2500); // Good LCP
  expect(performanceMetrics.FCP).toBeLessThan(1800); // Good FCP
  expect(performanceMetrics.CLS).toBeLessThan(0.1);  // Good CLS
  
  await mcp__playwright__browser_snapshot();
});

// 3. ACCESSIBILITY COMPREHENSIVE TESTING
test('Complete accessibility compliance', async () => {
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Test keyboard navigation
  await mcp__playwright__browser_press_key({key: 'Tab'});
  await mcp__playwright__browser_press_key({key: 'Tab'});
  await mcp__playwright__browser_press_key({key: 'Enter'}); // Open create form
  
  // Navigate form with keyboard only
  await mcp__playwright__browser_press_key({key: 'Tab'});
  await mcp__playwright__browser_type({
    element: 'Focused input',
    ref: ':focus',
    text: 'Keyboard navigation test'
  });
  
  await mcp__playwright__browser_press_key({key: 'Tab'});
  await mcp__playwright__browser_press_key({key: 'ArrowDown'}); // Select category
  
  // Test screen reader announcements
  const accessibilitySnapshot = await mcp__playwright__browser_snapshot();
  
  // Verify aria labels and roles
  const ariaCompliance = await mcp__playwright__browser_evaluate({
    function: `() => {
      const issues = [];
      
      // Check all form inputs have labels
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const hasLabel = input.getAttribute('aria-label') || 
                        input.getAttribute('aria-labelledby') ||
                        document.querySelector('label[for="' + input.id + '"]');
        if (!hasLabel) {
          issues.push('Input without label: ' + input.name);
        }
      });
      
      // Check color contrast
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        const styles = getComputedStyle(button);
        // Simplified contrast check - in real implementation use proper contrast calculation
        if (styles.color === styles.backgroundColor) {
          issues.push('Poor contrast: ' + button.textContent);
        }
      });
      
      return issues;
    }`
  });
  
  expect(ariaCompliance).toHaveLength(0);
  
  await mcp__playwright__browser_snapshot();
});

// 4. ERROR HANDLING AND RECOVERY TESTING
test('Error scenarios and recovery', async () => {
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Test network failure scenarios
  await mcp__playwright__browser_evaluate({
    function: `() => {
      // Mock network failures
      const originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (args[0].includes('/api/tasks')) {
          return Promise.reject(new Error('Network error'));
        }
        return originalFetch(...args);
      };
    }`
  });
  
  // Try to create task during network failure
  await mcp__playwright__browser_click({
    element: 'Create task button',
    ref: 'button[data-testid="create-task"]'
  });
  
  await mcp__playwright__browser_type({
    element: 'Task title input',
    ref: 'input[name="title"]',
    text: 'Network failure test'
  });
  
  await mcp__playwright__browser_click({
    element: 'Save button',
    ref: 'button[type="submit"]'
  });
  
  // Verify error handling
  await mcp__playwright__browser_wait_for({
    text: 'Unable to save task. Please try again.'
  });
  
  // Test recovery when network returns
  await mcp__playwright__browser_evaluate({
    function: `() => {
      // Restore network
      window.fetch = window.originalFetch || fetch;
    }`
  });
  
  await mcp__playwright__browser_click({
    element: 'Retry button',
    ref: 'button[data-testid="retry-save"]'
  });
  
  await mcp__playwright__browser_wait_for({
    text: 'Task created successfully'
  });
  
  await mcp__playwright__browser_snapshot();
});

// 5. CROSS-BROWSER COMPATIBILITY TESTING
const browsers = ['chromium', 'firefox', 'webkit'];
for (const browserName of browsers) {
  test(`Task creation in ${browserName}`, async () => {
    // Note: This would require browser context switching in real implementation
    await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
    
    // Basic functionality test in each browser
    await mcp__playwright__browser_click({
      element: 'Create task button',
      ref: 'button[data-testid="create-task"]'
    });
    
    await mcp__playwright__browser_type({
      element: 'Task title input',
      ref: 'input[name="title"]',
      text: `${browserName} compatibility test`
    });
    
    await mcp__playwright__browser_click({
      element: 'Save button',
      ref: 'button[type="submit"]'
    });
    
    await mcp__playwright__browser_wait_for({
      text: 'Task created successfully'
    });
    
    await mcp__playwright__browser_take_screenshot({
      filename: `task-creation-${browserName}.png`
    });
  });
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Complete user journey testing (realistic wedding scenarios)
- [ ] Performance testing under load (50+ concurrent operations)
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Error handling and recovery scenarios
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)
- [ ] Security penetration testing
- [ ] Mobile device testing across screen sizes
- [ ] Offline functionality and sync validation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Test coverage >90% for all components and APIs
- [ ] All security tests passing
- [ ] Zero failing tests in CI/CD pipeline
- [ ] Performance benchmarks meet or exceed targets

### Quality & Compliance:
- [ ] Accessibility compliance validated (WCAG 2.1 AA)
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested across devices
- [ ] Security audit passed with zero critical issues
- [ ] Performance metrics within acceptable thresholds

### Evidence Package Required:
- [ ] Complete test execution report with metrics
- [ ] Performance benchmark results
- [ ] Security testing validation report
- [ ] Accessibility compliance certificate
- [ ] Cross-browser compatibility matrix

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Unit Tests: `/wedsync/__tests__/components/tasks/`
- Integration Tests: `/wedsync/__tests__/integration/tasks/`
- E2E Tests: `/wedsync/tests/e2e/tasks/`
- Performance Tests: `/wedsync/tests/performance/tasks/`
- Security Tests: `/wedsync/tests/security/tasks/`

### Test Reports:
- Coverage Reports: `/wedsync/coverage/`
- Performance Reports: `/wedsync/lighthouse-reports/`
- Security Reports: `/wedsync/security-audit-reports/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch16/WS-156-team-e-round-1-complete.md`
- **Include:** Feature ID (WS-156) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch16)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-156 | ROUND_1_COMPLETE | team-e | batch16" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

Use the standard team output template in `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md`
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch16/WS-156-team-e-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - this IS your primary deliverable
- Do NOT ignore security requirements - test ALL security measures
- Do NOT claim completion without evidence - provide comprehensive reports
- REMEMBER: All 5 teams work in PARALLEL - validate ALL team outputs
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing (>90% coverage)
- [ ] Security validated and tested
- [ ] Performance benchmarks completed
- [ ] Quality reports generated
- [ ] Evidence package complete

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY