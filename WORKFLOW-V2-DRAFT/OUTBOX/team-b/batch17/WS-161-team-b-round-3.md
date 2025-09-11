# TEAM B - ROUND 3: WS-161 - Supplier Schedules - Backend Schedule Generation APIs

**Date:** 2025-01-25  
**Feature ID:** WS-161 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build supplier schedule generation APIs and automated update system  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating with multiple suppliers
**I want to:** Generate individual schedules for each supplier based on the master timeline
**So that:** Each vendor knows exactly when they need to arrive, set up, perform, and break down

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build supplier schedule generation APIs from master timeline data
- Create automated schedule update system when timeline changes
- Implement supplier notification system for schedule changes
- Build supplier access authentication and authorization
- Create schedule export APIs for multiple formats
- Implement schedule confirmation tracking system

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Supplier Schedule Backend):
- [ ] `/api/timeline/[id]/supplier-schedules` - Generate all supplier schedules
- [ ] `/api/suppliers/[id]/schedule` - Individual supplier schedule API
- [ ] `/api/suppliers/[id]/schedule/confirm` - Schedule confirmation API
- [ ] Automated schedule update service when master timeline changes
- [ ] Supplier notification service for schedule updates
- [ ] Schedule export service for suppliers (PDF, calendar)
- [ ] Supplier access token generation for schedule viewing
- [ ] Database migrations for supplier schedule schema
- [ ] Unit tests with >80% coverage
- [ ] API integration tests for supplier workflow



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

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch17/WS-161-team-b-round-3-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY