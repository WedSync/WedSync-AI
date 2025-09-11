# TEAM B - ROUND 2: Interactive Tutorial System Backend - Tutorial Engine & Progress Tracking

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build backend tutorial engine with step tracking, progress persistence, and interactive tutorial API endpoints  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/01-Onboarding/06-interactive-tutorial md.md
- Create tutorial engine with step-by-step guidance system
- Build progress tracking and persistence infrastructure
- Implement tutorial content management and versioning
- Add analytics for tutorial completion rates
- Prepare API endpoints for Team A's frontend tutorial components

**Technology Stack (VERIFIED):**
- Frontend: Team A will build UI components
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Analytics: Tutorial engagement tracking

**Integration Points:**
- **Tutorial Database**: tutorial_steps, user_progress, tutorial_analytics tables
- **User Management**: Integration with existing auth system
- **Onboarding Flow**: Step 4 in the onboarding sequence

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime-subscriptions", 2000);

// Tutorial-specific libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "json-columns", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("api", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Tutorial engine backend"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Tutorial progress schema"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Interactive tutorial APIs" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --restful-design --version-management
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build tutorial engine APIs."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Enhancement & Tutorial Engine:
- [ ] Database schema for tutorial_steps, user_tutorial_progress, tutorial_analytics
- [ ] TutorialEngine class with step management and progress tracking
- [ ] POST /api/tutorials/start endpoint for initializing user tutorials
- [ ] GET /api/tutorials/[id]/progress endpoint for fetching progress
- [ ] POST /api/tutorials/[id]/complete-step endpoint for step completion
- [ ] Tutorial content management system with versioning
- [ ] Analytics tracking for tutorial engagement
- [ ] Unit and integration tests with >80% coverage

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (VERIFY FIRST!):
- FROM Team E: Pain point wizard completion data - Required for personalized tutorials
- FROM Team A: Tutorial UI requirements specification - Needed for API design

### What other teams NEED from you:
- TO Team A: Tutorial API endpoints - They need this for frontend tutorial components
- TO Team C: Tutorial analytics data - Blocking their integration dashboard

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Tutorial progress data protected by RLS policies
- [ ] No tutorial content accessible without authentication
- [ ] Input validation on all tutorial step data
- [ ] Rate limiting on tutorial API endpoints
- [ ] Audit logging for tutorial completion events
- [ ] No cross-user tutorial progress leakage
- [ ] GDPR compliance for tutorial analytics data

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. TUTORIAL INITIALIZATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/tutorials/start', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      tutorialType: 'photographer_onboarding',
      vendorType: 'photographer'
    })
  }).then(r => r.json())`
});

// 2. STEP PROGRESS TRACKING TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/tutorials/photographer_onboarding/complete-step', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      stepId: 'create_first_form',
      completedAt: new Date().toISOString()
    })
  }).then(r => r.json())`
});

// 3. PROGRESS RETRIEVAL TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/tutorials/photographer_onboarding/progress')
    .then(r => r.json())`
});

// 4. TUTORIAL ANALYTICS TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/admin/tutorial-analytics')
    .then(r => r.json())`
});

// 5. DATABASE INTEGRITY TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test that completing steps out of order is handled correctly
    return fetch('/api/tutorials/test_tutorial/complete-step', {
      method: 'POST',
      body: JSON.stringify({stepId: 'step_5', currentStep: 'step_2'})
    }).then(r => ({status: r.status, validOrder: r.status === 400}));
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Tutorial initialization creates proper database records
- [ ] Step completion updates progress correctly
- [ ] Progress retrieval returns accurate data
- [ ] Analytics capture tutorial engagement metrics
- [ ] Database constraints prevent invalid step sequences

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Tutorial engine API endpoints functional
- [ ] Database schema supports versioned tutorial content
- [ ] Zero TypeScript errors
- [ ] Zero SQL syntax errors

### Integration & Performance:
- [ ] Tutorial progress persists across sessions
- [ ] API endpoints respond in <500ms
- [ ] Analytics capture all tutorial interactions
- [ ] Security requirements fully implemented
- [ ] Ready for Team A's frontend integration

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Migration: `/wedsync/supabase/migrations/017_interactive_tutorial_system.sql`
- Tutorial engine: `/wedsync/src/lib/tutorials/engine.ts`
- API routes: `/wedsync/src/app/api/tutorials/`
- Types: `/wedsync/src/types/tutorial.ts`
- Tests: `/wedsync/tests/tutorials/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-2-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-2-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-2-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT skip tutorial content versioning (tutorials will be updated)
- Do NOT allow tutorial step skipping without proper validation
- Do NOT expose tutorial analytics without proper permissions
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - prepare APIs for Team A

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY