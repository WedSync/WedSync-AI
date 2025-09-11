# TEAM A - ROUND 2: Payment UI Completion - Billing Components and Subscription Management

**Date:** 2025-01-21  
**Priority:** P0 from roadmap  
**Mission:** Complete payment UI with Stripe integration, billing components, and subscription management  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Complete payment UI implementation with 30% backend already done:
- PaymentForm with Stripe Elements integration
- SubscriptionCard for plan management
- PricingPlans component with plan comparison
- PaymentHistory for billing transparency
- Payment method management
- Subscription status and billing cycle controls

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Payments: Stripe Elements, Payment Intents
- Forms: React Hook Form with Zod validation

**Integration Points:**
- Stripe: Payment Elements, Payment Intents, Subscriptions
- Backend API: /api/billing/* endpoints already implemented
- Database: payment_sessions, payment_methods tables
- Auth: Organization-level billing permissions

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. CONTEXT7 MCP - Load latest docs for Payment UI:
await mcp__context7__resolve-library-id("stripe");  // Get correct library ID first
await mcp__context7__get-library-docs("/stripe/stripe-js", "elements payment-intents", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "app-router client-components", 3000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "validation async", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "pricing-tables responsive", 2000);

// For payment security and UX:
await mcp__context7__get-library-docs("/stripe/stripe-js", "error-handling webhooks", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing billing patterns and Stripe integration:
await mcp__serena__find_symbol("create-checkout-session", "", true);
await mcp__serena__get_symbols_overview("src/app/api/stripe");
await mcp__serena__find_symbol("Button", "", false);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Stripe API changes frequently!)
- Serena shows existing patterns to follow (backend is already implemented!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Payment UI with Stripe Elements"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Payment components with validation"
3. **integration-specialist** --think-ultra-hard --stripe-elements-expert
4. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
5. **playwright-visual-testing-specialist** --accessibility-first --payment-flows
6. **code-quality-guardian** --check-patterns --match-codebase-style
7. **security-compliance-officer** --think-ultra-hard --pci-compliance

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing Stripe integration code
- Understand current payment flow
- Check pricing tier configurations
- Review API responses and data structures
- Continue until you FULLY understand the payment system

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling for payment failures
- Consider edge cases (card declined, network issues)
- Don't rush - payment UX is critical

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing payment patterns
- Use Context7 Stripe examples as templates
- Implement with parallel agents
- Focus on user experience and error handling

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright payment flows
- Test all payment scenarios
- Generate evidence package
- Only mark complete when payments work flawlessly

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Core Implementation):
- [ ] PaymentForm component with Stripe Elements
- [ ] SubscriptionCard for current subscription display
- [ ] PricingPlans component with plan comparison
- [ ] PaymentHistory component for billing transparency
- [ ] Payment method management (add/remove/default)
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for payment flows

### Round 3 (Enhancement & Polish):
- [ ] Advanced payment error handling
- [ ] Loading states and success animations
- [ ] Invoice download functionality
- [ ] Integration with subscription webhooks
- [ ] Advanced Playwright payment scenarios

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Billing API endpoints (/api/billing/*) - Already implemented
- FROM Team B: Stripe webhook handling - Required for subscription updates

### What other teams NEED from you:
- TO All Teams: Pricing component patterns - Reusable for marketing pages
- TO Team E: Subscription status indicators - Needed for lead tracking

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] PCI DSS compliance with Stripe Elements
- [ ] No card data stored on client
- [ ] Secure token handling (Payment Intents)
- [ ] Input validation for all billing forms
- [ ] HTTPS enforcement for payment pages
- [ ] Rate limiting for payment attempts
- [ ] Audit logging for billing actions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 PAYMENT FLOW VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY PAYMENT TESTING - Real Payment Flows!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/billing"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. STRIPE ELEMENTS INTEGRATION TESTING
await mcp__playwright__browser_click({element: "upgrade plan button", ref: '[data-testid="upgrade-professional"]'});

await mcp__playwright__browser_wait_for({text: "Payment Details"});

// Test Stripe Elements (using test mode)
await mcp__playwright__browser_type({
  element: "card number input", 
  ref: '[name="cardnumber"]', 
  text: "4242424242424242"
});

await mcp__playwright__browser_type({
  element: "expiry input", 
  ref: '[name="exp-date"]', 
  text: "12/28"
});

await mcp__playwright__browser_type({
  element: "cvc input", 
  ref: '[name="cvc"]', 
  text: "123"
});

// 3. PAYMENT SUCCESS FLOW
await mcp__playwright__browser_click({element: "confirm payment", ref: '[type="submit"]'});
await mcp__playwright__browser_wait_for({text: "Payment successful"});

// 4. SUBSCRIPTION MANAGEMENT TESTING
await mcp__playwright__browser_navigate({url: "/billing"});
await mcp__playwright__browser_wait_for({text: "Professional Plan"});

await mcp__playwright__browser_click({element: "manage subscription", ref: '[data-testid="manage-subscription"]'});
await mcp__playwright__browser_wait_for({text: "Cancel Subscription"});

// 5. ERROR SCENARIOS TESTING
await mcp__playwright__browser_navigate({url: "/billing/payment"});
await mcp__playwright__browser_type({
  element: "card number input", 
  ref: '[name="cardnumber"]', 
  text: "4000000000000002"  // Test card that will be declined
});
await mcp__playwright__browser_click({element: "confirm payment", ref: '[type="submit"]'});
await mcp__playwright__browser_wait_for({text: "Your card was declined"});

// 6. RESPONSIVE PAYMENT UI
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-billing.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Stripe Elements integration working
- [ ] Payment success and failure flows
- [ ] Subscription management functionality
- [ ] Zero console errors during payment
- [ ] Network success (no payment API failures)
- [ ] Responsive billing UI at all sizes

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating payment flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors during payment

### Integration & Performance:
- [ ] Stripe Elements integration working
- [ ] Payment processing <3s response time
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] PCI DSS compliance verified
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working payment flows
- [ ] Playwright test results
- [ ] Payment success/failure demos
- [ ] Console error-free proof during payments
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/billing/`
- Pages: `/wedsync/src/app/(dashboard)/billing/`
- Tests: `/wedsync/tests/billing/`
- Hooks: `/wedsync/src/hooks/usePayments.ts`
- Stripe Client: `/wedsync/src/lib/stripe/client.ts`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-2-overview.md`

```markdown
# TEAM A ROUND 2 OVERVIEW

We completed 7 of 7 deliverables for payment UI completion. The main implementation includes PaymentForm with Stripe Elements, SubscriptionCard, PricingPlans, and PaymentHistory components with comprehensive error handling and accessibility. All tests are passing with 88% coverage and Playwright validation confirms payments work end-to-end.

Key metrics: 12 files created/modified, 31 tests written, payment processing at 1.8s. Integration with existing Stripe backend successful. Ready for review.
```

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-2-to-dev-manager.md`

```markdown
# TEAM A FEEDBACK FOR ROUND 2 PLANNING

**What needs adjustment:** Stripe webhooks integration needed earlier for real-time subscription updates.

**Recommendation for next round:** Assign loading states framework to Team A, builds on payment UI loading patterns established.
```

### REPORT 3: Senior Dev Review Prompt (CRITICAL - This IS their prompt!)
**File:** `/SESSION-LOGS/2025-01-21/team-a-round-2-senior-dev-prompt.md`

```markdown
# SENIOR DEV: REVIEW TEAM A ROUND 2 - Payment UI Completion

**PRIORITY:** 🔴 CRITICAL (payment processing security)

## 🎯 FILES TO REVIEW (In Priority Order)

### Critical Review (Security/Data):
1. `/wedsync/src/components/billing/PaymentForm.tsx` - Check Stripe Elements integration and PCI compliance
2. `/wedsync/src/lib/stripe/client.ts` - Verify secure token handling
3. `/wedsync/src/hooks/usePayments.ts` - Check error handling and state management

### Standard Review:
4. `/wedsync/src/components/billing/SubscriptionCard.tsx` - Verify subscription display logic
5. `/wedsync/tests/billing/payment-flow.test.ts` - Verify payment test coverage

## ⚠️ SPECIFIC CONCERNS WE NEED VALIDATED
- [ ] Stripe Elements security - Is PCI DSS compliance maintained?
- [ ] Payment error handling - Are all failure scenarios covered?
- [ ] Token lifecycle - No payment tokens persisted inappropriately?

## ✅ WHAT WE'RE CONFIDENT ABOUT
- Payment flows working with comprehensive error states
- Tests passing with 88% coverage
- Playwright payment validation complete
- PCI DSS compliance verified

## 🔍 COMMANDS TO RUN
```bash
npm run test -- /tests/billing/payment-flow.test.ts
npm run typecheck -- /src/components/billing
npm run audit
```

## 📊 OUR METRICS
- Tests: 31/31 passing
- Coverage: 88%
- Performance: 1.8s payment processing
- Bundle impact: +28kb (includes Stripe Elements)

**Review Focus: Payment security is critical - thorough review of all payment flows required**
```

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip PCI compliance checks - payments are critical
- Do NOT ignore error handling scenarios
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Payment tests written and passing
- [ ] PCI DSS compliance validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Reports created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY