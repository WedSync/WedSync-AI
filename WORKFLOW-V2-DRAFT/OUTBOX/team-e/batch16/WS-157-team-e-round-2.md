# TEAM E - ROUND 2: WS-157 - Helper Assignment - Advanced Testing & Quality Assurance

**Date:** 2025-01-25  
**Feature ID:** WS-157 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing suite for helper assignment with performance validation and security testing  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple delegating tasks to family and friends
**I want to:** Assign specific wedding tasks to helpers with clear instructions and timing
**So that:** Everyone knows their responsibilities and can execute tasks without confusion on the wedding day

**Real Wedding Problem This Solves:**
A couple currently creates handwritten task lists like "Mom - handle gifts table" without clear timing or instructions. With this feature, they assign "Mary Johnson - Gift table setup (5:00pm-5:30pm) - Set up gift table in foyer, arrange card box, ensure gift security" with automatic notifications and check-in reminders.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification (Round 2 Focus):**
- Comprehensive E2E testing for helper assignment workflows
- Performance testing for bulk assignment operations
- Security testing for helper data and permissions
- Cross-browser and cross-device testing validation
- Load testing for concurrent assignment operations
- Accessibility testing for helper assignment interface

**Technology Stack (VERIFIED):**
- Testing: Playwright MCP, Vitest, Jest
- Performance: Lighthouse, Web Vitals, Load Testing
- Security: OWASP testing, SQL injection prevention
- Accessibility: axe-core, WCAG 2.1 validation
- Cross-platform: BrowserStack, Device testing

**Integration Points:**
- All Team Components: Complete integration testing
- Database: Helper assignment data validation
- APIs: Assignment endpoint testing
- Mobile: Cross-device testing validation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs:
await mcp__context7__get-library-docs("/microsoft/playwright", "testing automation", 5000);
await mcp__context7__get-library-docs("/vitest-dev/vitest", "unit-testing", 3000);
await mcp__context7__get-library-docs("/dequelabs/axe-core", "accessibility-testing", 2000);

// 3. SERENA MCP - Initialize:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing Round 1 work:
await mcp__serena__find_symbol("HelperAssignmentTest", "", true);
await mcp__serena__get_symbols_overview("/tests");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --testing-focus "Track comprehensive helper assignment testing"
2. **test-automation-architect** --advanced-testing "Build complete testing infrastructure"
3. **playwright-visual-testing-specialist** --assignment-workflows "Test all assignment interactions"
4. **security-compliance-officer** --helper-security "Validate assignment security"
5. **performance-optimization-expert** --load-testing "Test bulk assignment performance"
6. **code-quality-guardian** --test-coverage "Ensure 100% critical path coverage"

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Polish):
- [ ] Complete E2E test suite for helper assignment workflows
- [ ] Performance testing for bulk assignment operations (50+ concurrent)
- [ ] Security testing for helper data access and permissions
- [ ] Cross-browser testing validation (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing across iOS and Android
- [ ] Accessibility testing with WCAG 2.1 AA compliance
- [ ] Load testing for concurrent assignment scenarios
- [ ] Integration testing with all team components

---

## 🔗 DEPENDENCIES

### Building on Round 1 Work:
- EXTEND: Basic helper assignment tests with comprehensive coverage
- ENHANCE: Unit tests with integration and E2E testing
- VALIDATE: All team outputs with complete test validation

### What you NEED from other teams:
- FROM All Teams: Components and APIs - Required for complete testing
- Integration Ready: All team deliverables for comprehensive validation

### What other teams NEED from you:
- TO All Teams: Test results and feedback - Critical for bug fixes
- TO Dev Manager: Comprehensive quality report - Required for next round

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] 100% critical path test coverage for helper assignment
- [ ] All tests pass with zero flaky test tolerance
- [ ] Performance benchmarks meet targets (<2s for bulk operations)
- [ ] Security validation passes all OWASP checks
- [ ] Accessibility score of 100% with axe-core
- [ ] Cross-browser compatibility verified

### Evidence Package Required:
- [ ] Complete test execution report with coverage metrics
- [ ] Performance benchmark results with load testing data
- [ ] Security audit report with vulnerability assessment
- [ ] Accessibility testing report with WCAG compliance
- [ ] Cross-browser compatibility matrix
- [ ] Mobile device testing results

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- E2E Tests: `/wedsync/tests/e2e/helper-assignment/`
- Performance Tests: `/wedsync/tests/performance/helper-assignment/`
- Security Tests: `/wedsync/tests/security/helper-assignment/`
- Accessibility Tests: `/wedsync/tests/accessibility/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch16/WS-157-team-e-round-2-complete.md`

---

## 🧪 TESTING FOCUS AREAS

### Helper Assignment Core Flows:
- [ ] Create helper profile and assign to tasks
- [ ] Bulk assignment operations with conflict detection
- [ ] Real-time assignment updates and notifications
- [ ] Helper availability checking and scheduling
- [ ] Assignment modification and reassignment workflows

### Performance Testing Scenarios:
- [ ] 50+ concurrent helper assignments
- [ ] Bulk operations with 100+ tasks
- [ ] Real-time sync with multiple users
- [ ] Mobile performance under network constraints

### Security Testing Requirements:
- [ ] Helper data access controls
- [ ] Task assignment permissions validation
- [ ] SQL injection prevention in search
- [ ] XSS prevention in helper profiles
- [ ] CSRF protection in assignment operations

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY