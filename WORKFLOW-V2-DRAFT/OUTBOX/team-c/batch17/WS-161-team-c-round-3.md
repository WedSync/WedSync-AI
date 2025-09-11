# TEAM C - ROUND 3: WS-161 - Supplier Schedules - Supplier Communication & Integration

**Date:** 2025-01-25  
**Feature ID:** WS-161 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build supplier communication system and external calendar integrations for vendor schedules  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating with multiple suppliers
**I want to:** Generate individual schedules for each supplier based on the master timeline
**So that:** Each vendor knows exactly when they need to arrive, set up, perform, and break down

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build automated supplier notification system for schedule changes
- Create supplier schedule sharing via email, SMS, and calendar invites
- Implement supplier calendar integration (Google, Outlook, iCal)
- Build supplier feedback and confirmation system
- Create schedule change approval workflow
- Implement supplier access portal with secure authentication

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Supplier Communication & Integration):
- [ ] Automated email notifications for supplier schedule updates
- [ ] SMS notification system for urgent schedule changes
- [ ] Calendar invite generation for supplier schedules
- [ ] Google Calendar integration for supplier schedule sync
- [ ] Supplier feedback system for schedule conflicts
- [ ] Schedule change approval workflow for couples
- [ ] Supplier access portal with secure login
- [ ] WhatsApp integration for supplier communication
- [ ] Unit tests with >80% coverage
- [ ] Integration tests for supplier communication flows



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
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch17/WS-161-team-c-round-3-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY