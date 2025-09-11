# TEAM E - ROUND 1: WS-132 - Trial Management System - Core Implementation

**Date:** 2025-01-24  
**Feature ID:** WS-132 (Track all work with this ID)  
**Priority:** HIGH from roadmap  
**Mission:** Implement 30-day trial system with milestone tracking and ROI calculation capabilities  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier evaluating WedSync Professional features
**I want to:** Experience the full platform capabilities for 30 days without payment commitment
**So that:** I can validate ROI before making a financial commitment and see measurable business impact

**Real Business Scenario:**
A wedding photographer signs up for a free trial after seeing competitor success stories. During the 30-day trial, they connect 8 couples, automate their client intake process, and save 12 hours per week on administrative tasks. On day 25, they receive personalized trial results showing $2,400 in time savings value. They upgrade to Professional before trial expiration, increasing annual revenue by $18,000 while working fewer hours.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- 30-day trial system for Professional and Premium tiers
- Feature usage tracking with time savings calculations
- Milestone achievement system with automated celebrations
- ROI calculation engine based on actual usage
- Trial onboarding flow and progress dashboard
- Conversion optimization and upgrade recommendations

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Integration: Email automation, usage analytics, conversion tracking
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team D Subscription System: Trial to paid conversion workflows
- User Management: Trial feature access and temporary permissions
- Feature Gates: Premium feature activation during trial
- Analytics System: Usage tracking and ROI calculations

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("date-fns");  // Get correct library ID first
await mcp__context7__get-library-docs("/date-fns/date-fns", "date calculations trial management", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes trial system", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database tracking analytics", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "progress-bars dashboard-ui", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("SubscriptionService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/billing/");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 ensures accurate date/time handling (critical for trials!)
- Serena shows existing subscription patterns to integrate with
- Agents work with current knowledge of trial management systems

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Trial management system and ROI tracking implementation"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Trial system backend with milestone tracking"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Trial dashboard and progress visualization UI" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for trial systems."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant trial management and subscription files first
- Understand existing user management patterns
- Check integration points with subscription system
- Review similar trial implementations in the codebase
- Continue until you FULLY understand the trial architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed trial system architecture
- Write test cases FIRST (TDD)
- Plan error handling for trial expiration and conversion
- Consider edge cases in milestone tracking
- Don't rush - trial systems require precision

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns for API routes and database integration
- Use Context7 examples as templates for date handling
- Implement with parallel agents
- Focus on accuracy, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright trial scenarios
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Trial subscription management system with 30-day lifecycle
- [ ] Feature usage tracking infrastructure with time savings calculations
- [ ] Milestone achievement system with 5 core milestones
- [ ] Basic ROI calculation engine based on usage patterns
- [ ] Trial onboarding flow with business context capture
- [ ] Core API endpoints for trial management
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for trial signup flows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team D: Subscription tier infrastructure and billing system integration
- FROM Feature Gates: Premium feature access control during trials

### What other teams NEED from you:
- TO Team D: Trial conversion events for subscription upgrades
- TO Analytics: Trial usage data for business intelligence
- TO Email System: Trial milestone celebrations and conversion prompts

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All trial endpoints require authentication
- [ ] Input validation with Zod schemas for trial data  
- [ ] No sensitive trial data in logs
- [ ] Trial feature access rate limiting
- [ ] Secure trial extension approval process
- [ ] Audit logging for all trial events
- [ ] CSRF protection for trial management endpoints

---

## ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-132.md
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/trial/signup"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB TRIAL WORKFLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/trial/signup"});        // Tab 1: Trial Signup
await mcp__playwright__browser_tab_new({url: "/trial/dashboard"});     // Tab 2: Trial Dashboard
await mcp__playwright__browser_tab_select({index: 0});                 // Switch to signup

await mcp__playwright__browser_click({                                 // Start trial
  element: "Start Professional Trial Button", ref: "button[data-trial='professional']"
});

await mcp__playwright__browser_type({
  element: 'Business Name Input',
  ref: 'input[name="businessName"]',
  text: 'Test Photography Studio'
});

await mcp__playwright__browser_select_option({
  element: 'Vendor Type Select',
  ref: 'select[name="vendorType"]',
  values: ['photography']
});

await mcp__playwright__browser_click({element: 'Activate Trial Button', ref: 'button[type="submit"]'});

await mcp__playwright__browser_tab_select({index: 1});                 // Check dashboard
await mcp__playwright__browser_wait_for({text: "30 Days Remaining"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory?.usedJSHeapSize || 0,
    trialSystemLoaded: !!document.querySelector('[data-testid="trial-dashboard"]')
  })`
});

// 4. MILESTONE ACHIEVEMENT VALIDATION
await mcp__playwright__browser_navigate({url: '/clients'});
await mcp__playwright__browser_click({element: 'Add Client Button', ref: 'button.add-client'});

await mcp__playwright__browser_type({
  element: 'Client Name Input',
  ref: 'input[name="clientName"]',
  text: 'John & Jane Smith'
});

await mcp__playwright__browser_click({element: 'Save Client Button', ref: 'button[type="submit"]'});

// Wait for milestone achievement
await mcp__playwright__browser_wait_for({text: 'Milestone Achieved: First Client Connected'});

// 5. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 6. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-trial-dashboard.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab trial workflow testing (signup to dashboard tracking)
- [ ] Scientific performance (Core Web Vitals + trial system loading)
- [ ] Zero console errors (verified)
- [ ] Network success (no 4xx/5xx, especially for trial API calls)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating trial workflows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Basic integration working with Team D subscription system
- [ ] Trial creation and tracking under 2 seconds
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working trial system
- [ ] Playwright test results showing trial workflows
- [ ] Performance metrics for trial operations
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/trial/`
- Backend: `/wedsync/src/app/api/trial/`
- Services: `/wedsync/src/lib/trial/`
- Tests: `/wedsync/tests/trial/`
- Types: `/wedsync/src/types/trial.ts`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch10/WS-132-round-1-complete.md`
- **Include:** Feature ID (WS-132) in all filenames
- **Save in:** Correct batch folder (batch10)
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch10/WS-132-round-1-complete.md`

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