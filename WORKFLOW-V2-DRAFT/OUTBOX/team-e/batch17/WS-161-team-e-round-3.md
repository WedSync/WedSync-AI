# TEAM E - ROUND 3: WS-161 - Supplier Schedules - Final Integration Testing & Validation

**Date:** 2025-01-25  
**Feature ID:** WS-161 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing for complete supplier schedule system integration  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating with multiple suppliers
**I want to:** Generate individual schedules for each supplier based on the master timeline
**So that:** Each vendor knows exactly when they need to arrive, set up, perform, and break down

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build end-to-end testing for complete timeline-to-supplier workflow
- Create integration testing for supplier communication flows
- Implement performance testing for schedule generation at scale
- Build accuracy testing for supplier schedule calculations
- Create accessibility testing for supplier interfaces
- Implement security testing for supplier access controls


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

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Final Integration Testing):
- [ ] Complete E2E testing for timeline-to-supplier schedule workflow
- [ ] Integration testing for supplier notification delivery
- [ ] Performance testing for bulk supplier schedule generation
- [ ] Accuracy validation for supplier schedule calculations
- [ ] Security testing for supplier access and authentication
- [ ] Cross-platform testing for supplier mobile interfaces
- [ ] Load testing for supplier portal concurrent access
- [ ] Final integration testing with all three WS-159/160/161 features
- [ ] Production readiness validation and deployment preparation
- [ ] Comprehensive test coverage report >95%

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch17/WS-161-team-e-round-3-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY