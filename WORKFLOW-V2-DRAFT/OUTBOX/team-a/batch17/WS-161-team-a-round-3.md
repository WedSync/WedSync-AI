# TEAM A - ROUND 3: WS-161 - Supplier Schedules - Individual Vendor Timeline Views

**Date:** 2025-01-25  
**Feature ID:** WS-161 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build individual supplier schedule interfaces generated from master timeline  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating with multiple suppliers
**I want to:** Generate individual schedules for each supplier based on the master timeline
**So that:** Each vendor knows exactly when they need to arrive, set up, perform, and break down

**Real Wedding Problem This Solves:**
A couple currently emails separate timeline PDFs to their photographer, DJ, florist, and caterer, leading to version control issues. With this feature, when they update the master timeline from "Ceremony 4:00pm" to "Ceremony 4:30pm", all supplier schedules automatically update showing "Photographer: Arrive 3:00pm for prep shots, Ceremony coverage 4:30-5:00pm" ensuring everyone has synchronized, current information.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build supplier-specific schedule generation from master timeline
- Create customizable supplier schedule templates  
- Implement automatic schedule updates when master timeline changes
- Build supplier schedule export functionality
- Create supplier access portal for viewing their schedules
- Implement schedule confirmation and feedback system

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Supplier Schedule Integration):
- [ ] SupplierScheduleGenerator component from master timeline
- [ ] Individual SupplierScheduleView for each vendor type
- [ ] SupplierPortal for vendors to view their specific schedules
- [ ] Schedule confirmation system for vendor acknowledgment
- [ ] Automatic schedule update notifications for suppliers
- [ ] Supplier schedule export (PDF, calendar, email)
- [ ] Custom schedule templates for different vendor types
- [ ] Schedule change history and notification system
- [ ] Unit tests with >80% coverage
- [ ] E2E tests for supplier workflow integration



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
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch17/WS-161-team-a-round-3-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY