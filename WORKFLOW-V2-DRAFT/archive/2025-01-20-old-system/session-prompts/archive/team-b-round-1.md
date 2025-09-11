# TEAM B - ROUND 1: Journey Builder Execution Engine - Core Backend Implementation

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Complete Journey Builder execution engine with retry logic, scheduling, and recovery  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Complete Journey Builder execution engine (75% done, execution partial):
- Enhanced execution engine with retry logic and exponential backoff
- Journey scheduler for timed execution
- Recovery manager for failed journeys
- Timeline calculator for wedding-based scheduling
- Business rules engine for execution conditions
- Metrics tracking and performance monitoring

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Database: Advanced PostgreSQL with JSONB and indexing
- Scheduling: Custom scheduler with priority queues

**Integration Points:**
- Journey Canvas: Visual builder already implemented
- Database: journey_instances, scheduled_executions tables
- Email/SMS Services: Integration points for Team C
- Real-time Updates: WebSocket connections for progress

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. CONTEXT7 MCP - Load latest docs for Journey Engine:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "route-handlers streaming", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database functions rls", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions typescript", 3000);
await mcp__context7__get-library-docs("/date-fns/date-fns", "date manipulation", 2000);

// For journey execution patterns:
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing journey patterns and 75% implementation:
await mcp__serena__find_symbol("engine", "src/lib/journey", true);
await mcp__serena__get_symbols_overview("src/lib/journey");
await mcp__serena__find_symbol("executor", "src/lib/journey", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest Next.js API route patterns!
- Serena shows existing 75% implementation to build on!
- Agents understand current architecture!

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Journey execution engine completion"
2. **api-architect** --think-hard --use-loaded-docs "Journey execution APIs"
3. **postgresql-database-expert** --think-ultra-hard --scheduling-optimization
4. **test-automation-architect** --tdd-approach --journey-testing
5. **playwright-visual-testing-specialist** --accessibility-first --execution-monitoring
6. **code-quality-guardian** --check-patterns --match-codebase-style
7. **performance-optimization-expert** --think-ultra-hard --queue-optimization

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build on existing 75% implementation."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing journey engine implementation (75% complete)
- Understand current execution flow and limitations
- Check database schema and performance
- Review integration points with canvas
- Continue until you FULLY understand the existing system

### **PLAN PHASE (THINK HARD!)**
- Create detailed completion plan
- Write test cases FIRST (TDD)
- Plan retry logic and error handling
- Design scheduler architecture
- Don't rush - execution engine is critical

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Enhance existing engine patterns
- Use Context7 Supabase examples
- Implement with parallel agents
- Focus on reliability and performance

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright execution flows
- Test all scheduling scenarios
- Generate performance evidence
- Only mark complete when execution is bulletproof

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Enhanced JourneyEngine with retry logic and exponential backoff
- [ ] JourneyScheduler for timed execution with 5-minute intervals
- [ ] RecoveryManager for failed journey recovery
- [ ] TimelineCalculator for wedding-based scheduling
- [ ] Business rules engine for execution conditions
- [ ] Database migrations for scheduling tables
- [ ] API endpoints: /api/journeys/execute, /api/journeys/instances/:id/status
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for execution flows

### Round 2 (Enhancement & Polish):
- [ ] Rate limiting implementation
- [ ] CSRF protection enhancement
- [ ] Advanced error handling
- [ ] Performance optimization
- [ ] Advanced testing scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with service connections
- [ ] Complete E2E testing
- [ ] Performance validation
- [ ] Production readiness

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Service connection interfaces - Required for email/SMS execution
- FROM Team D: Database optimization - Needed for scheduler performance

### What other teams NEED from you:
- TO Team A: API endpoints for execution monitoring - Required for frontend
- TO Team C: Execution events - Needed for service integration
- TO Team E: Journey instance data - Required for lead tracking

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All endpoints require authentication
- [ ] Journey execution authorization checks
- [ ] Input validation with Zod schemas
- [ ] No sensitive wedding data in logs
- [ ] SQL injection prevention in scheduler
- [ ] Rate limiting for execution requests
- [ ] Audit logging for journey executions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 JOURNEY EXECUTION VALIDATION:**

```javascript
// REVOLUTIONARY JOURNEY TESTING - Real Execution Flows!

// 1. JOURNEY EXECUTION MONITORING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/journeys/test-journey"});

// Start journey execution
await mcp__playwright__browser_click({
  element: "Start Journey button",
  ref: '[data-testid="start-journey"]'
});

// Verify execution monitor shows progress
const executionSnapshot = await mcp__playwright__browser_snapshot();

// 2. RETRY LOGIC TESTING
await mcp__playwright__browser_evaluate({
  function: '() => window.__simulateNodeFailure("email-1")'
});

// Verify retry indicator appears
await mcp__playwright__browser_wait_for({
  text: 'Retrying (attempt 2 of 3)'
});

// Verify recovery after success
await mcp__playwright__browser_wait_for({
  text: 'Journey completed successfully'
});

// 3. SCHEDULER FUNCTIONALITY
await mcp__playwright__browser_navigate({url: "/admin/scheduler"});
await mcp__playwright__browser_click({
  element: "Start Scheduler",
  ref: '[data-testid="start-scheduler"]'
});

await mcp__playwright__browser_wait_for({text: "Scheduler running"});

// Check queue processing
await mcp__playwright__browser_wait_for({text: "Processed 5 executions"});

// 4. ERROR RECOVERY TESTING
await mcp__playwright__browser_navigate({url: "/journeys/failed-journey/recover"});
await mcp__playwright__browser_click({
  element: "Recover from last checkpoint",
  ref: '[data-testid="recover-journey"]'
});

await mcp__playwright__browser_wait_for({text: "Recovery successful"});

// 5. PERFORMANCE MONITORING
const performanceMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    executionTime: window.__journeyMetrics?.executionTime || 0,
    queueDepth: window.__journeyMetrics?.queueDepth || 0,
    successRate: window.__journeyMetrics?.successRate || 0
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Journey execution with retry logic working
- [ ] Scheduler processing queue correctly
- [ ] Recovery manager handling failures
- [ ] Timeline calculation for wedding dates
- [ ] Performance metrics within targets
- [ ] Zero execution engine errors

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating execution flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors during execution

### Integration & Performance:
- [ ] Scheduler running with 5-minute intervals
- [ ] Journey execution <2s per node
- [ ] Recovery success rate >99%
- [ ] Queue depth stays below 1000 items
- [ ] Database performance optimized

### Evidence Package Required:
- [ ] Video proof of journey execution with retries
- [ ] Scheduler performance metrics
- [ ] Recovery success demonstrations
- [ ] Console error-free proof during execution
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Engine Core: `/wedsync/src/lib/journey/`
- API Routes: `/wedsync/src/app/api/journeys/`
- Tests: `/wedsync/tests/journey/execution/`
- Database: `/wedsync/supabase/migrations/`
- Types: `/wedsync/src/types/journey.ts`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-01-21/team-b-round-1-overview.md`

```markdown
# TEAM B ROUND 1 OVERVIEW

We completed 9 of 9 deliverables for Journey Builder execution engine completion. The main implementation includes enhanced execution engine with retry logic, scheduler with 5-minute intervals, recovery manager, timeline calculator, and business rules engine. All tests are passing with 87% coverage and Playwright validation confirms journey execution works end-to-end with proper error handling.

Key metrics: 18 files created/modified, 38 tests written, execution performance at 1.4s per node. Full integration with existing 75% canvas implementation successful. Ready for review.
```

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-01-21/team-b-round-1-to-dev-manager.md`

```markdown
# TEAM B FEEDBACK FOR ROUND 1 PLANNING

**What needs adjustment:** Database optimization from Team D needed earlier for optimal scheduler performance.

**Recommendation for next round:** Assign rate limiting to Team B, builds naturally on execution engine infrastructure.
```

### REPORT 3: Senior Dev Review Prompt (CRITICAL - This IS their prompt!)
**File:** `/SESSION-LOGS/2025-01-21/team-b-round-1-senior-dev-prompt.md`

```markdown
# SENIOR DEV: REVIEW TEAM B ROUND 1 - Journey Builder Execution Engine

**PRIORITY:** 🔴 CRITICAL (core business logic)

## 🎯 FILES TO REVIEW (In Priority Order)

### Critical Review (Business Logic):
1. `/wedsync/src/lib/journey/engine.ts` - Check execution logic and error handling
2. `/wedsync/src/lib/journey/scheduler.ts` - Verify queue management and timing
3. `/wedsync/src/lib/journey/recovery-manager.ts` - Check failure recovery logic

### Standard Review:
4. `/wedsync/src/app/api/journeys/execute/route.ts` - Verify API security
5. `/wedsync/tests/journey/execution/engine.test.ts` - Check test coverage
6. Database migration files - Verify schema design

## ⚠️ SPECIFIC CONCERNS WE NEED VALIDATED
- [ ] Retry logic implementation - Is exponential backoff correctly implemented?
- [ ] Scheduler performance - Can it handle 1000+ concurrent journeys?
- [ ] Recovery reliability - Will failed journeys properly resume?

## ✅ WHAT WE'RE CONFIDENT ABOUT
- Journey execution engine working with comprehensive retry logic
- Tests passing with 87% coverage
- Playwright validation complete for execution flows
- Performance targets met

## 🔍 COMMANDS TO RUN
```bash
npm run test -- /tests/journey/execution/
npm run typecheck -- /src/lib/journey
npm run db:migration:up
```

## 📊 OUR METRICS
- Tests: 38/38 passing
- Coverage: 87%
- Performance: 1.4s per node execution
- Queue processing: <5min intervals

**Review Focus: Business logic correctness is critical - thorough review of execution flows required**
```

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip retry logic testing - execution must be bulletproof
- Do NOT ignore performance targets
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- CRITICAL: Team C depends on this completion for Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Execution tests written and passing
- [ ] Performance validated
- [ ] Dependencies provided to Teams A and C
- [ ] Code committed
- [ ] Reports created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY