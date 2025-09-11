# TEAM A — BATCH 21 — ROUND 2 — WS-171: Mobile PWA Configuration - Install Components

**Date:** 2025-08-26  
**Feature ID:** WS-171 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build PWA install prompts and UI components for mobile app experience  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before Round 3.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier working on-site at wedding venues
**I want to:** Access WedSync as a mobile app that works offline and installs on my phone
**So that:** I can manage timelines, check vendor status, and update couples without needing internet at remote venues

**Real Wedding Problem This Solves:**
A wedding coordinator at a countryside venue with poor WiFi can install WedSync as a PWA, access offline timeline views, check vendor arrival status, and sync changes when connection returns. This prevents 3+ hours of delays from communication gaps.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-171:**
- Build InstallButton component with platform-specific instructions
- Create PWA install prompt detection and management
- Implement usage tips and onboarding for installed app
- Add install funnel progress tracking
- Build success messaging post-install

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- PWA: Service Worker, Web App Manifest

**Integration Points:**
- Team B Backend: PWA tracking API endpoints
- Team C Integration: Manifest configuration from Team C
- Team D Caching: Offline data management from Team D
- Database: pwa_installations, offline_usage tables

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE:
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "workbox pwa install latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next pwa configuration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "web app manifest install prompt latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("InstallButton", "", true);
await mcp__serena__get_symbols_overview("/src/components/pwa/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "PWA install UI components"
2. **react-ui-specialist** --think-hard --use-loaded-docs "mobile install prompts"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "PWA integration"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --mobile-testing --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (PWA Install Components):
- [ ] InstallButton component with platform detection (iOS/Android/Desktop)
- [ ] PWA install prompt management hook (usePWAInstall)
- [ ] Platform-specific install instructions modal
- [ ] Post-install success messaging and tips
- [ ] Install funnel analytics tracking
- [ ] Unit tests with >80% coverage
- [ ] Playwright tests for install flows

**Objective:** Create seamless PWA installation experience across all platforms
**Scope In:** Install UI components, prompt management, user onboarding
**Scope Out:** Service worker configuration, manifest generation, offline caching
**Affected Paths:** /src/components/pwa/, /src/hooks/usePWAInstall.ts
**Dependencies:** Team C manifest configuration, Team B tracking APIs
**Acceptance Criteria:**
- Install button shows only when PWA is installable
- Platform-specific instructions display correctly
- Install prompt can be deferred and triggered
- Success messaging appears after installation
- Analytics track install funnel steps

**NFRs:** <100ms button render time, works on all mobile browsers
**Test Plan:** Unit tests for install logic, E2E tests for install flows
**Risk/Mitigation:** Browser compatibility issues - progressive enhancement
**Handoff Notes:** Export install state management for other components
**Overlap Guard:** Team A only handles install UI, not service worker setup

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

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: PWA tracking API endpoints - Required for install analytics
- FROM Team C: Manifest configuration - Needed for install prompts

### What other teams NEED from you:
- TO Team B: Install event interfaces - They need this for API tracking
- TO Team E: Install components for testing - Required for E2E validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### PWA SECURITY CONSIDERATIONS
- [ ] **Install Verification**: Verify PWA install events are legitimate
- [ ] **Privacy Protection**: Don't track sensitive device information
- [ ] **Permission Handling**: Properly manage notification permissions
- [ ] **Secure Context**: Ensure HTTPS-only PWA features

```typescript
// ✅ SECURE PWA INSTALL TRACKING:
const trackInstallEvent = async (installData: InstallData) => {
  const sanitizedData = {
    platform: installData.platform,
    timestamp: new Date().toISOString(),
    // DO NOT log: device IDs, personal info, location
  };
  
  await fetch('/api/pwa/track-install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitizedData)
  });
};
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// PWA INSTALL TESTING WITH REAL BROWSER AUTOMATION

// 1. ACCESSIBILITY SNAPSHOT FOR INSTALL FLOW
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
const installSnapshot = await mcp__playwright__browser_snapshot();

// 2. INSTALL PROMPT SIMULATION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate beforeinstallprompt event
    const event = new Event('beforeinstallprompt');
    event.prompt = () => Promise.resolve();
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  }`
});

// 3. INSTALL BUTTON INTERACTION
await mcp__playwright__browser_wait_for({text: "Install App"});
await mcp__playwright__browser_click({element: "Install Button", ref: "[data-testid=install-btn]"});
await mcp__playwright__browser_wait_for({text: "App Installed Successfully"});

// 4. PLATFORM-SPECIFIC INSTRUCTIONS
for (const platform of ['iOS Safari', 'Chrome Android', 'Chrome Desktop']) {
  await mcp__playwright__browser_evaluate({
    function: `() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: '${platform === 'iOS Safari' ? 'iPhone' : 'Chrome'}',
        configurable: true
      });
    }`
  });
  
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({
    filename: `install-instructions-${platform.toLowerCase()}.png`
  });
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Install button appears when PWA installable
- [ ] Platform-specific instructions show correctly
- [ ] Install prompt can be triggered and deferred
- [ ] Post-install success flow works
- [ ] Analytics events fire properly
- [ ] Responsive design on all devices


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

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] InstallButton component complete and functional
- [ ] usePWAInstall hook manages install state correctly
- [ ] Platform detection works across iOS/Android/Desktop
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Install button renders in <100ms
- [ ] Works across all major mobile browsers
- [ ] Integrates with Team C manifest configuration
- [ ] Analytics integration ready for Team B
- [ ] Responsive design validated

### Evidence Package Required:
- [ ] Screenshots of install flow on different platforms
- [ ] Playwright test results for install scenarios
- [ ] Platform-specific instruction screenshots
- [ ] Mobile device testing proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/pwa/`
- Hooks: `/wedsync/src/hooks/usePWAInstall.ts`
- Tests: `/wedsync/tests/pwa/`
- Types: `/wedsync/src/types/pwa.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch21/WS-171-team-a-round-2-complete.md`
- **Update status:** Add entry to feature-tracker.log

---

## ⚠️ CRITICAL WARNINGS
- Focus on UI components only - Team C handles service worker
- Test across multiple browsers and platforms
- Ensure install prompts don't appear inappropriately
- Coordinate with Team B for analytics integration

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY