# TEAM A - ROUND 1: Password Reset Flow - Frontend Authentication Components

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Build secure password reset UI components with comprehensive form validation and UX  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build complete password reset flow with security-first approach:
- Forgot password form with email validation
- Reset password form with strong password requirements
- Token verification and expiration handling
- Rate limiting UI feedback
- CAPTCHA integration after failed attempts
- Comprehensive error handling and user feedback

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Forms: React Hook Form with Zod validation
- Auth: Supabase Auth with custom flows

**Integration Points:**
- Supabase Auth: Email sending and token verification
- Backend API: Password reset endpoints /api/auth/forgot-password & /api/auth/reset-password
- Database: password_reset_tokens, password_reset_attempts tables
- Middleware: Rate limiting and security headers

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. CONTEXT7 MCP - Load latest docs for Password Reset UI:
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "app-router authentication", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "auth-ui forms", 3000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "validation error-handling", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "form-styles accessibility", 2000);

// For password reset security features:
await mcp__context7__get-library-docs("/supabase/supabase", "password-reset email-templates", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing auth patterns before creating new ones:
await mcp__serena__find_symbol("LoginForm", "", true);
await mcp__serena__get_symbols_overview("src/components/auth");
await mcp__serena__find_symbol("AuthLayout", "", false);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Password reset UI implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Form components with validation"
3. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
4. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
5. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
6. **code-quality-guardian** --check-patterns --match-codebase-style
7. **nextjs-fullstack-developer** --app-router-expert --form-security-specialist

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing auth components and patterns
- Understand current authentication flow
- Check Supabase auth configuration
- Review similar form implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling for all failure scenarios
- Consider edge cases (expired tokens, rate limiting)
- Don't rush - proper planning prevents security issues

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing auth patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on security and completeness

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Test all user flows
- Generate security evidence
- Only mark complete when ACTUALLY secure and complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] ForgotPasswordForm component with email validation
- [ ] ResetPasswordForm component with strong password requirements
- [ ] Auth pages: /forgot-password and /reset-password
- [ ] Form validation schemas with Zod
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for user flows

### Round 2 (Enhancement & Polish):
- [ ] CAPTCHA integration after failed attempts
- [ ] Advanced error handling and user feedback
- [ ] Loading states and success animations
- [ ] Integration with backend rate limiting
- [ ] Advanced Playwright scenarios

### Round 3 (Integration & Finalization):
- [ ] Full integration with all authentication flows
- [ ] Complete E2E testing
- [ ] Accessibility validation
- [ ] Security testing
- [ ] Production readiness

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Password reset API endpoints - Required for form submissions
- FROM Team B: Rate limiting configuration - Needed for UI feedback

### What other teams NEED from you:
- TO Team B: Form validation schemas - They need this for API validation
- TO All Teams: Auth layout patterns - Reusable for other auth flows

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All forms require CSRF protection
- [ ] Input validation with Zod schemas  
- [ ] No sensitive data in browser console
- [ ] Password strength indicators
- [ ] Rate limiting UI feedback
- [ ] Secure token handling (never logged)
- [ ] CAPTCHA after multiple failures

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/forgot-password"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB PASSWORD RESET FLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/forgot-password"});     // Tab 1
await mcp__playwright__browser_type({
  element: "email input", ref: '[name="email"]', text: "test@example.com"
});
await mcp__playwright__browser_click({element: "send reset button", ref: '[type="submit"]'});

await mcp__playwright__browser_tab_new({url: "http://localhost:8000/mailhog"});  // Tab 2 - Check email
await mcp__playwright__browser_wait_for({text: "Password Reset"});

await mcp__playwright__browser_tab_select({index: 0});                  // Back to app
await mcp__playwright__browser_navigate({url: "/reset-password?token=test-token"});

// 3. FORM VALIDATION TESTING
await mcp__playwright__browser_type({
  element: "password input", ref: '[name="password"]', text: "weak"
});
await mcp__playwright__browser_wait_for({text: "Password must be at least 8 characters"});

await mcp__playwright__browser_type({
  element: "password input", ref: '[name="password"]', text: "StrongP@ssw0rd123"
});
await mcp__playwright__browser_wait_for({text: "Strong password"});

// 4. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 5. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-password-reset.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab email verification workflow
- [ ] Form validation edge cases
- [ ] Zero console errors (verified)
- [ ] Network success (no 4xx/5xx)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration with backend APIs working
- [ ] Form submission <500ms response time
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working forms
- [ ] Playwright test results
- [ ] Form validation demos
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/auth/`
- Pages: `/wedsync/src/app/(auth)/`
- Tests: `/wedsync/tests/auth/`
- Types: `/wedsync/src/types/auth.ts`
- Validation: `/wedsync/src/lib/validations/auth.ts`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-1-overview.md`

```markdown
# TEAM A ROUND 1 OVERVIEW

We completed 6 of 6 deliverables for password reset flow frontend. The main implementation includes ForgotPasswordForm and ResetPasswordForm components with comprehensive validation, error handling, and accessibility. All tests are passing with 85% coverage and Playwright validation confirms the forms work end-to-end.

Key metrics: 8 files created/modified, 24 tests written, form submission at 200ms. Integration with Team B APIs successful. Ready for review.
```

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-1-to-dev-manager.md`

```markdown
# TEAM A FEEDBACK FOR ROUND 2 PLANNING

**What needs adjustment:** Backend API endpoints from Team B needed earlier in development cycle for proper integration testing.

**Recommendation for next round:** Assign payment UI to Team A, keep frontend focus consistent with auth expertise gained.
```

### REPORT 3: Senior Dev Review Prompt (CRITICAL - This IS their prompt!)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-1-senior-dev-prompt.md`

```markdown
# SENIOR DEV: REVIEW TEAM A ROUND 1 - Password Reset Flow

**PRIORITY:** 🔴 CRITICAL (authentication security)

## 🎯 FILES TO REVIEW (In Priority Order)

### Critical Review (Security/Data):
1. `/wedsync/src/components/auth/ForgotPasswordForm.tsx` - Check input validation and CSRF protection
2. `/wedsync/src/components/auth/ResetPasswordForm.tsx` - Verify password strength requirements
3. `/wedsync/src/lib/validations/auth.ts` - Validate Zod schemas for security

### Standard Review:
4. `/wedsync/src/app/(auth)/forgot-password/page.tsx` - Check routing and error handling
5. `/wedsync/tests/auth/password-reset.test.ts` - Verify coverage

## ⚠️ SPECIFIC CONCERNS WE NEED VALIDATED
- [ ] Password strength validation - Is regex sufficient for enterprise security?
- [ ] Rate limiting integration - Will UI properly reflect backend limits?
- [ ] Token handling - No tokens logged or exposed in client?

## ✅ WHAT WE'RE CONFIDENT ABOUT
- Form validation working with comprehensive error states
- Tests passing with 85% coverage
- Playwright validation complete
- Accessibility compliance verified

## 🔍 COMMANDS TO RUN
```bash
npm run test -- /tests/auth/password-reset.test.ts
npm run typecheck -- /src/components/auth
npm audit
```

## 📊 OUR METRICS
- Tests: 24/24 passing
- Coverage: 85%
- Performance: 200ms form submission
- Bundle impact: +12kb

**Review Focus: Security validation is critical - take the time needed for thorough security review**
```

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip security tests - authentication is critical
- Do NOT ignore accessibility requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Security tests written and passing
- [ ] Accessibility validated
- [ ] Dependencies provided to Team B
- [ ] Code committed
- [ ] Reports created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY