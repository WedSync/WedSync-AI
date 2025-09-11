# TEAM C - ROUND 2: WS-160 - Master Timeline - Real-time Collaboration & Calendar Integrations

**Date:** 2025-01-25  
**Feature ID:** WS-160 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build real-time collaborative timeline editing and calendar service integrations  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple coordinating their wedding day schedule
**I want to:** Create a comprehensive timeline from getting ready to send-off with automatic time calculations and conflict detection
**So that:** All suppliers and helpers know exactly when and where to be, preventing delays and ensuring smooth transitions between events

**Real Wedding Problem This Solves:**
Multiple people (couple, wedding planner, family) need to collaborate on the same timeline simultaneously. Currently, email back-and-forth with different versions causes confusion. This system enables real-time collaborative editing where changes appear instantly to all collaborators, plus automatic export to Google Calendar, Outlook, and Apple Calendar for suppliers.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build real-time collaborative timeline editing with conflict resolution
- Implement calendar service integrations (Google, Outlook, Apple)
- Create timeline sharing and permission management
- Build automatic timeline sync across all connected calendars
- Implement timeline change notifications and approval workflows
- Create timeline version history and rollback functionality

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Real-time & Calendar Integrations):
- [ ] Real-time collaborative editing with Supabase Realtime
- [ ] Google Calendar integration for timeline export
- [ ] Outlook Calendar integration with Exchange API
- [ ] Apple Calendar (.ics) export functionality
- [ ] Timeline sharing and permission management API
- [ ] Change notification system for timeline updates
- [ ] Version history tracking for timeline changes
- [ ] Conflict resolution for simultaneous edits
- [ ] Unit tests with >80% coverage
- [ ] Integration tests for calendar services



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
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch17/WS-160-team-c-round-2-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY