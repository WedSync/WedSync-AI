# TEAM B - ROUND 1: WS-010 - Timeline Optimization - Core Engine (P0 CRITICAL!)

**Date:** 2025-01-21  
**Feature ID:** WS-010 (Track all work with this ID)
**Priority:** P0 CRITICAL from roadmap  
**Mission:** Build the core timeline optimization engine that automatically resolves vendor conflicts and optimizes wedding day schedules  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planner
**I want to:** Automatically detect and resolve schedule conflicts between vendors, optimize setup/breakdown times, and ensure seamless transitions
**So that:** My wedding day runs perfectly without vendor delays, setup conflicts, or timeline disasters

**Real Wedding Problem This Solves:**
Wedding day disasters happen when: photographer arrives during ceremony setup, catering conflicts with band equipment setup, flowers delivered during photos, venue flip time insufficient. Current planning is manual spreadsheets prone to human error. This engine prevents 90% of timeline conflicts through intelligent optimization.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Intelligent conflict detection algorithm
- Automated timeline optimization
- Vendor dependency mapping
- Buffer time calculations
- Critical path analysis
- Real-time schedule validation
- Integration with vendor systems
- Scalable optimization algorithms

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Components: Untitled UI + Magic UI (NO Radix/shadcn!)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Algorithm: Custom optimization engine
- Testing: Playwright MCP, Vitest
- Queue: Redis for background processing

**Integration Points:**
- [Team A Round 1]: Dashboard for timeline display
- [Team E Round 1]: Notifications for conflict alerts
- [Team C Round 1]: Security for vendor data access
- [Database]: timeline_events, vendor_schedules, optimization_rules

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDES (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md"); // Untitled UI + Magic UI
// CRITICAL: This uses Untitled UI + Magic UI components ONLY - NO Radix/shadcn!

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "edge-functions serverless algorithms", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions real-time triggers", 3000);
await mcp__context7__get-library-docs("/postgresql/docs", "constraints optimization performance", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Timeline", "", true);
await mcp__serena__find_symbol("Optimization", "", true);
await mcp__serena__search_for_pattern("algorithm|schedule|conflict");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build timeline optimization engine with conflict detection"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Design optimization algorithms with database constraints"
3. **performance-optimization-expert** --think-ultra-hard --follow-existing-patterns "Create scalable scheduling algorithms"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --test-algorithm-results
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Study existing timeline and scheduling patterns
- Understand vendor workflow dependencies
- Research optimization algorithms
- Check database schema for constraints
- Continue until you FULLY understand the scheduling domain

### **PLAN PHASE (THINK HARD!)**
- Design conflict detection algorithms
- Plan optimization strategies
- Design database schema for performance
- Plan testing with complex scenarios
- Don't rush - this is the CORE business logic

### **CODE PHASE (PARALLEL AGENTS!)**
- Write comprehensive tests for edge cases FIRST
- Implement conflict detection engine
- Build optimization algorithms
- Create vendor dependency mapping
- Focus on accuracy over speed initially

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run extensive algorithm tests
- Validate with complex wedding scenarios
- Verify with Playwright
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Algorithm):
- [ ] Conflict detection algorithm with 95% accuracy
- [ ] Basic timeline optimization engine
- [ ] Vendor dependency mapping system
- [ ] Database schema and migrations
- [ ] API endpoints for timeline operations
- [ ] Comprehensive test suite with edge cases
- [ ] Performance benchmarks

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Basic authentication (can mock initially)
- FROM Team E: Notification interface definitions

### What other teams NEED from you:
- TO Team A: Timeline API for dashboard display
- TO Team B Round 2: Core engine for ML enhancement
- TO All Teams: Timeline optimization foundation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Vendor data access controls
- [ ] Timeline modification audit logs
- [ ] Secure algorithm parameters
- [ ] Rate limiting on optimization requests
- [ ] Input validation on timeline data

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ALGORITHM TESTING APPROACH:**

```javascript
// TIMELINE OPTIMIZATION TESTING

// 1. TEST CONFLICT DETECTION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/timeline-test"});

// Create complex conflict scenario
await mcp__playwright__browser_evaluate({
  function: `() => {
    window.__testTimeline = {
      vendors: [
        {id: 'photo', arrival: '14:00', setup: 30, duration: 120, breakdown: 15},
        {id: 'catering', arrival: '14:15', setup: 45, duration: 180, breakdown: 30},
        {id: 'flowers', arrival: '14:00', setup: 60, duration: 30, breakdown: 0}
      ],
      constraints: {
        ceremonyStart: '15:00',
        cocktailStart: '15:30',
        receptionStart: '17:00'
      }
    };
  }`
});

// Run optimization
await mcp__playwright__browser_click({
  element: "Optimize timeline button", ref: "button[data-testid='optimize-timeline']"
});

// Verify results
await mcp__playwright__browser_wait_for({text: "Optimization complete", time: 10});

const optimizationResult = await mcp__playwright__browser_evaluate({
  function: `() => window.__optimizationResult`
});

// 2. TEST PERFORMANCE WITH LARGE DATASETS
const performanceTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const startTime = performance.now();
    
    // Simulate 50 vendors, 200 timeline events
    const largeTimeline = {
      vendors: Array.from({length: 50}, (_, i) => ({
        id: 'vendor-' + i,
        arrival: '10:00',
        setup: Math.random() * 60 + 15,
        duration: Math.random() * 240 + 60,
        breakdown: Math.random() * 30 + 10
      })),
      events: Array.from({length: 200}, (_, i) => ({
        id: 'event-' + i,
        start: '10:00',
        duration: Math.random() * 120 + 30
      }))
    };
    
    return fetch('/api/timeline/optimize', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(largeTimeline)
    }).then(r => r.json()).then(result => ({
      processingTime: performance.now() - startTime,
      conflicts: result.conflicts || 0,
      optimized: result.optimized || false
    }));
  }`
});

// 3. TEST EDGE CASES
const edgeCaseTests = [
  "Impossible timeline (too many vendors, too little time)",
  "Vendor with zero setup time",
  "Overlapping ceremony and setup",
  "Vendor cancellation mid-optimization"
];

for (const testCase of edgeCaseTests) {
  await mcp__playwright__browser_type({
    element: "Test case input", ref: "input[data-testid='edge-case']",
    text: testCase
  });
  
  await mcp__playwright__browser_click({
    element: "Run test", ref: "button[data-testid='run-edge-case']"
  });
  
  await mcp__playwright__browser_wait_for({text: "Test completed"});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Conflict detection accuracy >95%
- [ ] Optimization completes in <5 seconds for 50 vendors
- [ ] Edge cases handled gracefully
- [ ] No infinite loops in optimization
- [ ] All vendor constraints respected
- [ ] Memory usage remains stable

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Conflict detection algorithm working with 95%+ accuracy
- [ ] Timeline optimization produces valid results
- [ ] Tests written FIRST and passing (>90% coverage for critical path)
- [ ] Playwright tests validating complex scenarios
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Algorithm Performance:
- [ ] Handles 50+ vendors without timeout
- [ ] Optimization completes in <5 seconds
- [ ] Memory usage stable over time
- [ ] Security requirements met
- [ ] All edge cases handled gracefully

### Evidence Package Required:
- [ ] Algorithm accuracy report
- [ ] Performance benchmark results
- [ ] Complex timeline test results
- [ ] Edge case handling proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Algorithm: `/wedsync/src/lib/timeline/optimization/`
- API: `/wedsync/src/app/api/timeline/`
- Database: `/wedsync/supabase/migrations/`
- Tests: `/wedsync/__tests__/lib/timeline/`
- Types: `/wedsync/src/types/timeline.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-010-round-1-complete.md`
- **Include:** Feature ID (WS-010) in all filenames
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/WS-010-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: This is P0 CRITICAL - other teams depend on this
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Algorithm accuracy validated
- [ ] Performance benchmarks met
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY