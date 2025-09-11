# TEAM D - ROUND 3: WS-161 - Supplier Schedules - Mobile Supplier Interface

**Date:** 2025-01-25  
**Feature ID:** WS-161 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build mobile-optimized supplier interface for viewing and confirming schedules  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier receiving schedule updates on mobile
**I want to:** View my specific timeline, confirm availability, and report conflicts
**So that:** I can stay synchronized with the wedding timeline while working on-site or traveling

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build mobile supplier portal for schedule viewing
- Create mobile schedule confirmation interface
- Implement mobile conflict reporting system
- Build mobile calendar integration for suppliers
- Create mobile schedule export and sharing
- Implement mobile notifications for schedule changes

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Mobile Supplier Interface):
- [ ] Mobile SupplierPortal with responsive design
- [ ] Mobile schedule confirmation with touch interface
- [ ] Mobile conflict reporting system
- [ ] Mobile calendar export for supplier schedules
- [ ] Push notifications for schedule changes on mobile
- [ ] Mobile QR code scanner for quick schedule access
- [ ] Mobile-optimized schedule PDF viewer
- [ ] Touch-friendly schedule navigation
- [ ] Unit tests with >80% coverage
- [ ] Mobile device testing with Playwright



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
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch17/WS-161-team-d-round-3-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY