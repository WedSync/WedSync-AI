# TEAM E — BATCH 21 — ROUND 1 — WS-170: Viral Optimization System - Testing Suite

**Date:** 2025-08-26  
**Feature ID:** WS-170 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive testing suite for viral referral system  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before Round 2.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync
**I want to:** Leverage happy clients to refer other couples and suppliers
**So that:** I can grow my business through word-of-mouth while helping WedSync expand

**Real Wedding Problem This Solves:**
A photographer completes a wedding and their happy couple shares their WedSync experience with 3 other engaged couples. Each referral that signs up gives both the photographer and couple rewards. This viral loop reduces customer acquisition cost by 60%.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-170:**
- Build end-to-end testing for viral referral flows
- Create load testing for referral code generation
- Implement security testing for reward system
- Build analytics validation testing
- Create user journey testing for viral mechanics


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

### Round 1 (Viral Testing Suite):
- [ ] End-to-end referral flow testing with Playwright
- [ ] Load testing for referral code generation at scale
- [ ] Security testing for reward system fraud prevention
- [ ] Analytics calculation validation testing
- [ ] User journey testing for complete viral flow
- [ ] Performance testing for viral coefficient calculations
- [ ] Integration testing across all team components

**Objective:** Ensure viral system reliability through comprehensive testing
**Scope In:** E2E testing, load testing, security validation, integration testing
**Scope Out:** Feature implementation, API development, UI components
**Affected Paths:** /wedsync/tests/e2e/viral/, /wedsync/tests/load/, /wedsync/tests/security/
**Dependencies:** All teams' viral system components for integration testing
**Acceptance Criteria:**
- E2E tests cover complete referral journey
- Load tests validate performance at scale
- Security tests prevent fraud scenarios
- Analytics tests validate calculation accuracy
- Integration tests verify team coordination

**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch21/WS-170-team-e-round-1-complete.md`

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY