# TEAM E - ROUND 1: WS-153 - Photo Groups Management - Comprehensive Testing & Validation

**Date:** 2025-08-25  
**Feature ID:** WS-153 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Comprehensive testing, validation, and quality assurance for photo group management system  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple organizing photo sessions
**I want to:** Create photo groups from my guest list for efficient photography organization
**So that:** My photographer can efficiently capture all desired group combinations without confusion

**Real Wedding Problem This Solves:**
A couple currently creates handwritten lists like "Family photos: Mom's side, Dad's side, siblings only" leading to missed shots. With this feature, they create groups like "Smith Family (8 people): John Sr., Mary, John Jr., Sarah..." with automatic conflict detection if someone is in overlapping photos scheduled simultaneously.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- End-to-end testing of complete photo group workflow
- Integration testing across all team components
- Performance testing for drag-drop operations
- Security testing for data protection
- Accessibility testing for inclusive design
- Cross-browser and mobile device testing

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest, Jest
- Quality: ESLint, TypeScript strict mode

**Integration Points:**
- **UI Components**: Testing Team A's components
- **API Endpoints**: Validating Team B's backend
- **Database**: Verifying Team C's schema
- **WedMe Platform**: Testing Team D's integration

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any testing begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("playwright");  // Get correct library ID first
await mcp__context7__get-library-docs("/microsoft/playwright", "testing accessibility mobile", 5000);
await mcp__context7__get-library-docs("/testing-library/react-testing-library", "component testing", 3000);
await mcp__context7__get-library-docs("/vitest-dev/vitest", "unit integration testing", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing testing patterns:
await mcp__serena__find_symbol("test", "src/__tests__", true);
await mcp__serena__get_symbols_overview("src/__tests__/integration");
```

**WHY THIS ORDER MATTERS:**
- Context7 gives latest testing frameworks and patterns
- Serena shows existing test patterns to follow
- Agents work with current testing knowledge!

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photo group testing strategy"
2. **test-automation-architect** --think-hard --comprehensive-coverage "Full system testing" 
3. **playwright-visual-testing-specialist** --think-ultra-hard --accessibility-first "Visual and accessibility testing" 
4. **security-compliance-officer** --think-ultra-hard --penetration-testing
5. **performance-optimization-expert** --load-testing --performance-validation
6. **code-quality-guardian** --quality-metrics --coverage-analysis
7. **wedding-domain-expert** --user-journey-testing --real-wedding-scenarios

**AGENT INSTRUCTIONS:** "Use Context7 testing docs. Create comprehensive test coverage."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: TESTING WORKFLOW (With loaded docs + agents)

### **EXPLORATION PHASE (UNDERSTAND SYSTEM!)**
- Review ALL team outputs (A, B, C, D)
- Understand complete photo group workflow
- Identify integration points and dependencies
- Map user journeys and edge cases
- Continue until you FULLY understand the system

### **TEST PLANNING PHASE (THINK HARD!)**
- Create comprehensive test plan
- Design user journey test scenarios
- Plan performance benchmarks
- Design security test cases
- Don't rush - thorough planning ensures complete coverage

### **TEST IMPLEMENTATION PHASE (PARALLEL AGENTS!)**
- Write unit tests for all components
- Create integration tests for workflows
- Implement E2E tests with Playwright
- Set up performance monitoring
- Focus on comprehensive coverage

### **VALIDATION PHASE (VERIFY EVERYTHING!)**
- Execute all test suites
- Generate coverage reports
- Document findings and issues
- Create evidence package
- Only mark complete when ALL tests pass

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Comprehensive Test Suite):
- [ ] **Unit Tests**: All photo group components (>90% coverage)
- [ ] **Integration Tests**: API-Database-UI workflow tests
- [ ] **E2E Tests**: Complete user journey from guest list to photo groups
- [ ] **Performance Tests**: Drag-drop performance and API response times
- [ ] **Security Tests**: Authentication, authorization, and data validation
- [ ] **Accessibility Tests**: WCAG compliance and screen reader testing
- [ ] **Mobile Tests**: Touch interactions and responsive behavior

### Test Coverage Requirements:
- [ ] Unit test coverage >90% for all photo group code
- [ ] Integration tests for all API endpoints
- [ ] E2E coverage of complete user workflows
- [ ] Performance benchmarks for all interactions
- [ ] Security validation for all data operations
- [ ] Accessibility compliance verification

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI components for component testing
- FROM Team B: API endpoints for integration testing
- FROM Team C: Database schema for data testing
- FROM Team D: WedMe integration for platform testing

### What other teams NEED from you:
- TO ALL TEAMS: Test results and issue reports
- TO ALL TEAMS: Performance benchmarks and recommendations
- TO ALL TEAMS: Security vulnerability reports
- TO ALL TEAMS: Quality metrics and coverage reports

---

## 🔒 SECURITY TESTING REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 COMPREHENSIVE SECURITY VALIDATION

**MANDATORY SECURITY TEST SUITE:**

```typescript
// Security Test Examples
describe('Photo Group Security Tests', () => {
  test('prevents unauthorized access to photo groups', async () => {
    // Test with invalid auth token
    const response = await request(app)
      .get('/api/photo-groups')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });
  
  test('validates input data to prevent XSS', async () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/photo-groups')
      .send({ name: maliciousInput });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid input');
  });
  
  test('enforces row-level security', async () => {
    // Test accessing other couple's photo groups
    const response = await request(app)
      .get('/api/photo-groups')
      .set('Authorization', 'Bearer couple1-token')
      .query({ couple_id: 'couple2-id' });
    
    expect(response.status).toBe(403);
  });
});
```

**SECURITY TEST CHECKLIST:**
- [ ] **Authentication Tests**: Invalid tokens, expired sessions
- [ ] **Authorization Tests**: Access control, ownership validation
- [ ] **Input Validation**: XSS, injection, malformed data
- [ ] **Rate Limiting**: API abuse prevention
- [ ] **Data Exposure**: No sensitive data in errors
- [ ] **CSRF Protection**: Cross-site request validation

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 COMPREHENSIVE E2E TESTING SUITE:**

```javascript
// REVOLUTIONARY COMPREHENSIVE TESTING!

// 1. COMPLETE USER JOURNEY TEST
test('Photo group management complete workflow', async () => {
  // Navigate to photo groups
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
  
  // Verify page loaded
  const snapshot = await mcp__playwright__browser_snapshot();
  
  // Create new photo group
  await mcp__playwright__browser_click({
    element: "Create Photo Group button",
    ref: "[data-testid='create-group-btn']"
  });
  
  // Fill group details
  await mcp__playwright__browser_type({
    element: "Group name input",
    ref: "input[name='groupName']",
    text: "Family Photos"
  });
  
  // Add guests via drag-drop
  await mcp__playwright__browser_drag({
    startElement: "Guest: John Smith",
    startRef: "[data-guest-id='guest-1']",
    endElement: "Photo Group: Family Photos",
    endRef: "[data-group-id='new-group']"
  });
  
  // Verify guest added
  await mcp__playwright__browser_wait_for({text: "John Smith added to group"});
  
  // Save group
  await mcp__playwright__browser_click({
    element: "Save group button",
    ref: "[data-testid='save-group-btn']"
  });
  
  // Verify saved successfully
  await mcp__playwright__browser_wait_for({text: "Photo group saved"});
});

// 2. PERFORMANCE TESTING
test('Photo group performance benchmarks', async () => {
  const performanceMetrics = await mcp__playwright__browser_evaluate({
    function: `async () => {
      const startTime = performance.now();
      
      // Simulate heavy photo group operations
      const groups = Array.from({length: 50}, (_, i) => ({
        id: i,
        name: \`Group \${i}\`,
        members: Array.from({length: 10}, (_, j) => ({id: j, name: \`Guest \${j}\`}))
      }));
      
      // Measure rendering time
      const renderStartTime = performance.now();
      // ... render groups
      const renderEndTime = performance.now();
      
      return {
        totalTime: performance.now() - startTime,
        renderTime: renderEndTime - renderStartTime,
        memoryUsage: performance.memory?.usedJSHeapSize || 0
      };
    }`
  });
  
  // Verify performance targets
  expect(performanceMetrics.renderTime).toBeLessThan(1000); // <1s render
  expect(performanceMetrics.memoryUsage).toBeLessThan(50 * 1024 * 1024); // <50MB
});

// 3. ACCESSIBILITY TESTING
test('Photo group accessibility compliance', async () => {
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/photo-groups"});
  
  // Get accessibility tree
  const accessibilitySnapshot = await mcp__playwright__browser_snapshot();
  
  // Verify ARIA labels exist
  const ariaElements = await mcp__playwright__browser_evaluate({
    function: `() => {
      return Array.from(document.querySelectorAll('[aria-label], [aria-labelledby]')).length;
    }`
  });
  
  expect(ariaElements).toBeGreaterThan(0);
  
  // Test keyboard navigation
  await mcp__playwright__browser_press_key({key: "Tab"});
  await mcp__playwright__browser_press_key({key: "Enter"});
  
  // Verify focus management
  const focusedElement = await mcp__playwright__browser_evaluate({
    function: `() => document.activeElement.tagName`
  });
  
  expect(focusedElement).toBeTruthy();
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Complete user workflows (create, edit, delete groups)
- [ ] Drag-drop functionality across all browsers
- [ ] Mobile touch interactions
- [ ] Performance under load (50+ groups, 500+ guests)
- [ ] Accessibility compliance (keyboard, screen readers)
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Test Coverage:
- [ ] Unit tests >90% code coverage
- [ ] Integration tests cover all API endpoints
- [ ] E2E tests cover complete user journeys
- [ ] Performance tests meet benchmarks (<1s load, <200ms API)
- [ ] Security tests validate all protection mechanisms
- [ ] Accessibility tests confirm WCAG compliance

### Quality Metrics:
- [ ] Zero critical bugs found
- [ ] All performance targets met
- [ ] No security vulnerabilities detected
- [ ] Full accessibility compliance
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness validated

### Evidence Package Required:
- [ ] Complete test suite execution results
- [ ] Code coverage reports (>90%)
- [ ] Performance benchmark results
- [ ] Security test results
- [ ] Accessibility compliance report
- [ ] Cross-browser test results

---

## 💾 WHERE TO SAVE YOUR WORK

### Test Files:
- Unit Tests: `/wedsync/src/__tests__/unit/photo-groups/`
- Integration: `/wedsync/src/__tests__/integration/photo-groups-integration.test.ts`
- E2E Tests: `/wedsync/src/__tests__/playwright/photo-groups-e2e.spec.ts`
- Performance: `/wedsync/src/__tests__/performance/photo-groups-performance.test.ts`
- Security: `/wedsync/src/__tests__/security/photo-groups-security.test.ts`
- Mobile: `/wedsync/src/__tests__/mobile/photo-groups-mobile.spec.ts`

### Reports:
- Coverage: `/wedsync/coverage/photo-groups-coverage.html`
- Performance: `/wedsync/reports/photo-groups-performance.json`
- Security: `/wedsync/reports/photo-groups-security-scan.json`
- Accessibility: `/wedsync/reports/photo-groups-a11y.json`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch14/WS-153-team-e-round-1-complete.md`
- **Update status:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-153 | ROUND_1_COMPLETE | team-e | batch14" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT skip any test categories - comprehensive coverage required
- Do NOT ignore performance benchmarks - UX is critical
- Do NOT overlook security testing - data protection is vital
- Do NOT claim completion without evidence
- REMEMBER: You validate ALL team outputs - thoroughness is key
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All test suites implemented and passing
- [ ] Coverage reports generated (>90%)
- [ ] Performance benchmarks met
- [ ] Security validation complete
- [ ] Quality reports created
- [ ] Evidence package complete

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY