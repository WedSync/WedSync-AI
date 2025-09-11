# TEAM A - ROUND 3: Loading States Framework - Unified Loading UX and Polish

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Complete loading states framework and integrate with all Team A components  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Complete loading states framework with 60% existing implementation:
- Unified loading component library
- Skeleton loaders for all major components
- Progress indicators for long operations
- Error states with retry mechanisms
- Loading state management hooks
- Integration with auth forms and payment UI built in Rounds 1-2

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- State Management: React hooks with Context
- Animation: Tailwind transitions and transforms

**Integration Points:**
- Auth Components: Password reset forms from Round 1
- Payment Components: Billing UI from Round 2
- Global App: Layout-level loading states
- API Layer: All async operations need loading states

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. CONTEXT7 MCP - Load latest docs for Loading States:
await mcp__context7__resolve-library-id("react");  // Get correct library ID first
await mcp__context7__get-library-docs("/facebook/react", "suspense concurrent", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "loading-ui streaming", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "animation transitions", 3000);
await mcp__context7__get-library-docs("/framer/motion", "loading-animations", 2000);

// For loading state patterns:
await mcp__context7__get-library-docs("/tanstack/react-query", "loading-states caching", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing loading patterns and components built in previous rounds:
await mcp__serena__find_symbol("LoadingSpinner", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
await mcp__serena__find_symbol("ForgotPasswordForm", "", false);  // From Round 1
await mcp__serena__find_symbol("PaymentForm", "", false);  // From Round 2

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest React 19 loading patterns!
- Serena shows existing components to integrate with!
- Agents can enhance previous rounds' work!

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Loading states framework integration"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Skeleton loaders and animations"
3. **ui-ux-designer** --think-ultra-hard --loading-experience-expert
4. **test-automation-architect** --tdd-approach --loading-state-testing
5. **playwright-visual-testing-specialist** --accessibility-first --animation-testing
6. **code-quality-guardian** --check-patterns --match-codebase-style
7. **performance-optimization-expert** --loading-performance --bundle-analysis

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Integrate with Rounds 1-2 components."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing loading implementations (60% complete)
- Understand current loading state patterns
- Review auth and payment components from Rounds 1-2
- Check performance impact of current loaders
- Continue until you FULLY understand the loading system

### **PLAN PHASE (THINK HARD!)**
- Create detailed integration plan
- Write test cases FIRST (TDD)
- Plan performance optimization strategy
- Consider accessibility for loading states
- Don't rush - consistent UX is critical

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Enhance existing loading patterns
- Use Context7 React 19 examples
- Integrate with previous rounds' work
- Focus on performance and consistency

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright animations
- Test loading performance
- Generate integration evidence
- Only mark complete when all components have consistent loading

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Integration & Finalization):
- [ ] Enhanced loading component library
- [ ] Skeleton loaders for auth forms (Round 1 integration)
- [ ] Loading states for payment UI (Round 2 integration)
- [ ] Global loading context and hooks
- [ ] Performance optimization for loading animations
- [ ] Unit tests with >80% coverage
- [ ] Complete Playwright loading state tests

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: API response timing data - Required for optimal loading duration
- FROM Team C: Integration test results - Needed for loading state validation

### What other teams NEED from you:
- TO All Teams: Loading component patterns - Reusable across all features
- TO Team E: Loading hooks - Needed for lead tracking and quote generation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Loading states don't expose sensitive data
- [ ] No authentication bypass during loading
- [ ] Secure error state handling
- [ ] Rate limiting respect during retries
- [ ] No loading state memory leaks
- [ ] CSRF protection maintained during async operations

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 LOADING STATE VALIDATION (Animation & Performance!):**

```javascript
// REVOLUTIONARY LOADING TESTING - Real Performance Analysis!

// 1. LOADING ANIMATION ACCESSIBILITY
await mcp__playwright__browser_navigate({url: "http://localhost:3000/forgot-password"});

await mcp__playwright__browser_type({
  element: "email input", ref: '[name="email"]', text: "test@example.com"
});

await mcp__playwright__browser_click({element: "send reset button", ref: '[type="submit"]'});

// Verify loading state appears
await mcp__playwright__browser_wait_for({text: "Sending..."});
const loadingSnapshot = await mcp__playwright__browser_snapshot();

// 2. LOADING PERFORMANCE MEASUREMENT
const loadingMetrics = await mcp__playwright__browser_evaluate({
  function: `() => {
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('loading')) {
          window.__loadingMetrics = entry;
        }
      }
    });
    observer.observe({entryTypes: ['measure', 'navigation']});
    
    return {
      loadingDuration: performance.now(),
      memoryUsage: performance.memory?.usedJSHeapSize || 0
    };
  }`
});

// 3. SKELETON LOADER TESTING
await mcp__playwright__browser_navigate({url: "/billing"});
await mcp__playwright__browser_wait_for({text: "Loading subscription..."});

// Verify skeleton appears before content
const skeletonSnapshot = await mcp__playwright__browser_snapshot();

await mcp__playwright__browser_wait_for({text: "Professional Plan"});

// 4. ERROR STATE RECOVERY TESTING
await mcp__playwright__browser_evaluate({
  function: '() => window.__simulateNetworkError()'
});

await mcp__playwright__browser_wait_for({text: "Something went wrong"});
await mcp__playwright__browser_click({element: "retry button", ref: '[data-testid="retry"]'});
await mcp__playwright__browser_wait_for({text: "Retrying..."});

// 5. RESPONSIVE LOADING STATES
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_navigate({url: "/billing?slow=true"});
  await mcp__playwright__browser_wait_for({text: "Loading..."});
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-loading.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Loading animations don't cause accessibility issues
- [ ] Skeleton loaders render consistently
- [ ] Error states provide clear recovery options
- [ ] Loading performance <100ms animation start
- [ ] No memory leaks during loading cycles
- [ ] Responsive loading states at all sizes

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Integration with Rounds 1-2 components working
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating loading animations
- [ ] Zero TypeScript errors
- [ ] Zero console errors during loading

### Integration & Performance:
- [ ] Loading states integrated across all Team A features
- [ ] Animation performance <100ms start time
- [ ] Accessibility validation passed for loading states
- [ ] No memory leaks during loading cycles
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Video proof of consistent loading across features
- [ ] Playwright test results for loading states
- [ ] Performance metrics for animations
- [ ] Console error-free proof during loading
- [ ] Integration test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Loading Library: `/wedsync/src/components/ui/loading/`
- Hooks: `/wedsync/src/hooks/useLoading.ts`
- Integration: Enhanced existing auth and billing components
- Tests: `/wedsync/tests/loading/`
- Context: `/wedsync/src/contexts/LoadingContext.tsx`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-3-overview.md`

```markdown
# TEAM A ROUND 3 OVERVIEW

We completed 7 of 7 deliverables for loading states framework integration. The main implementation includes enhanced loading component library, skeleton loaders integrated with auth forms and payment UI, global loading context, and performance optimizations. All tests are passing with 89% coverage and Playwright validation confirms consistent loading UX across all Team A features.

Key metrics: 15 files created/modified (including enhancements to Rounds 1-2), 42 tests written, loading animation start at 45ms. Full integration with password reset and billing components successful. Ready for review.
```

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-3-to-dev-manager.md`

```markdown
# TEAM A FEEDBACK FOR ROUND 3 PLANNING

**What needs adjustment:** Loading states framework should be established earlier in future sprints for better integration across teams.

**Recommendation for next round:** Team A frontend expertise well-established - recommend focusing on polish and advanced user interactions in future rounds.
```

### REPORT 3: Senior Dev Review Prompt (CRITICAL - This IS their prompt!)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-3-senior-dev-prompt.md`

```markdown
# SENIOR DEV: REVIEW TEAM A ROUND 3 - Loading States Framework

**PRIORITY:** 🟡 STANDARD (UX consistency)

## 🎯 FILES TO REVIEW (In Priority Order)

### Critical Review (Performance):
1. `/wedsync/src/components/ui/loading/LoadingLibrary.tsx` - Check animation performance and memory usage
2. `/wedsync/src/hooks/useLoading.ts` - Verify hook efficiency and cleanup
3. `/wedsync/src/contexts/LoadingContext.tsx` - Check context performance impact

### Integration Review:
4. Enhanced `/wedsync/src/components/auth/ForgotPasswordForm.tsx` - Verify loading integration
5. Enhanced `/wedsync/src/components/billing/PaymentForm.tsx` - Check loading state consistency
6. `/wedsync/tests/loading/integration.test.ts` - Verify cross-component integration

## ⚠️ SPECIFIC CONCERNS WE NEED VALIDATED
- [ ] Loading animation performance - Any frame drops or janky animations?
- [ ] Memory management - Are loading contexts properly cleaned up?
- [ ] Integration consistency - Do all Team A components have unified loading UX?

## ✅ WHAT WE'RE CONFIDENT ABOUT
- Loading states working consistently across all Team A features
- Tests passing with 89% coverage including integration tests
- Playwright validation complete for loading animations
- Performance optimizations verified

## 🔍 COMMANDS TO RUN
```bash
npm run test -- /tests/loading/
npm run typecheck -- /src/components/ui/loading
npm run build # Check bundle size impact
```

## 📊 OUR METRICS
- Tests: 42/42 passing (including integration)
- Coverage: 89%
- Performance: 45ms loading animation start
- Bundle impact: +8kb (optimized animations)

**Review Focus: Performance and consistency - ensure loading framework doesn't impact app performance**
```

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT create performance regressions with animations
- Do NOT break existing loading patterns
- Do NOT claim completion without cross-feature integration
- REMEMBER: This is final round - complete integration required
- INTEGRATION: Ensure all Team A work from Rounds 1-3 works together

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Integration with Rounds 1-2 verified
- [ ] Performance tests passing
- [ ] Dependencies provided to other teams
- [ ] Code committed
- [ ] Final reports created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY