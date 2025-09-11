# TEAM A - ROUND 1: WS-001 - Enhanced Client Portal - Dashboard Components

**Date:** 2025-01-21  
**Feature ID:** WS-001 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the core React dashboard components for the wedding client portal with TypeScript, real-time updates, and responsive design  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding client (bride/groom)
**I want to:** Access a comprehensive, personalized portal where I can view my wedding timeline, communicate with vendors, track progress, and manage documents
**So that:** I feel informed and in control of my wedding planning process

**Real Wedding Problem This Solves:**
Couples currently have to juggle 10-15 different vendor emails, contracts, and timelines. They lose track of who's doing what, when payments are due, and what decisions need to be made. This portal creates a single source of truth where they can see everything about their wedding in one beautiful, organized dashboard.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Modern React 18+ dashboard with TypeScript
- Real-time updates using WebSocket connections
- Responsive design for mobile/tablet/desktop (375px, 768px, 1920px)
- Interactive timeline visualization component
- Document upload/preview system
- Vendor communication interface
- Progress tracking widgets
- Multi-factor authentication support

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: Supabase Realtime subscriptions
- State Management: Zustand or Context API

**Integration Points:**
- [WS-008 Notification Engine]: Real-time notification display
- [WS-011 Document Management]: Document viewer integration
- [Supabase Auth]: Authentication and session management
- [Database]: client_portal_settings, portal_activities tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This dashboard uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-components", 5000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "form-validation typescript", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "responsive-design component-styles", 2000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime-subscriptions auth", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("/wedsync/src/components/ui/");
await mcp__serena__search_for_pattern("realtime|websocket|subscription");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build client portal dashboard with timeline, vendor list, and progress widgets"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create responsive dashboard layout with Tailwind v4"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Set up realtime subscriptions for live updates"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant component files in /wedsync/src/components/
- Understand existing dashboard patterns
- Check authentication implementation
- Review Supabase schema and RLS policies
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed component architecture
- Write test cases FIRST (TDD)
- Plan state management approach
- Design responsive breakpoints
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI patterns from style guide
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright at all breakpoints
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Main dashboard layout component with responsive grid
- [ ] Wedding timeline visualization component
- [ ] Vendor list component with status indicators
- [ ] Progress tracking widgets (budget, tasks, timeline)
- [ ] Navigation and routing setup
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for core flows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Authentication setup (can mock initially)
- FROM Team E: Notification component interface

### What other teams NEED from you:
- TO Team B: Dashboard layout for timeline integration
- TO Team D: Component structure for analytics widgets
- TO All Teams: Base UI components and patterns

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All components require authentication wrapper
- [ ] No sensitive data in component state
- [ ] XSS prevention in all user inputs
- [ ] CSRF tokens on all forms
- [ ] Secure WebSocket connections only

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB COMPLEX USER FLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/dashboard"});                // Client view
await mcp__playwright__browser_tab_new({url: "/dashboard/timeline"});       // Timeline view
await mcp__playwright__browser_tab_select({index: 0});                      // Switch tabs
await mcp__playwright__browser_click({                                      // Update timeline
  element: "Edit timeline button", ref: "button[data-testid='edit-timeline']"
});
await mcp__playwright__browser_tab_select({index: 1});                      // Verify sync
await mcp__playwright__browser_wait_for({text: "Timeline updated"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory?.usedJSHeapSize || 0
  })`
});

// 4. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 5. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-dashboard.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab workflows (complex user journeys)
- [ ] Scientific performance (Core Web Vitals < 2s)
- [ ] Zero console errors (verified)
- [ ] Network success (no 4xx/5xx)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All dashboard components render correctly
- [ ] Real-time updates work via WebSockets
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Dashboard loads in <2 seconds
- [ ] Real-time updates appear within 500ms
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working dashboard
- [ ] Playwright test results
- [ ] Performance metrics (LCP < 2s)
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/dashboard/`
- Pages: `/wedsync/src/app/(dashboard)/`
- Tests: `/wedsync/__tests__/components/dashboard/`
- Types: `/wedsync/src/types/dashboard.ts`
- Styles: Use Tailwind classes, no separate CSS

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-001-round-1-complete.md`
- **Include:** Feature ID (WS-001) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/WS-001-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY