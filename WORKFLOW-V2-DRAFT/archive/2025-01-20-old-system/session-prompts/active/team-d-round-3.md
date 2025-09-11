# TEAM D - ROUND 3: Payment Fields Integration - Stripe Integration & Financial Processing

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive payment fields with Stripe integration, invoice generation, and financial workflow automation  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/04-Forms-System/03-field-types/05-payment-fields md.md
- Create payment form fields with Stripe integration
- Build invoice generation and payment processing
- Implement payment status tracking and notifications
- Add payment plan and installment options
- Integration with existing form system and Team B's templates

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Payment: Stripe API with secure webhooks
- Testing: Playwright MCP, Vitest
- PDF Generation: For invoices and payment confirmations

**Integration Points:**
- **Stripe Payment System**: Secure payment processing and webhook handling
- **Form Builder**: Payment field integration with Team B's form templates
- **Client Management**: Payment tracking linked to client records

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("stripe");
await mcp__context7__get-library-docs("/stripe/stripe-js", "payment-intents", 5000);
await mcp__context7__get-library-docs("/stripe/stripe-node", "webhooks", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes", 2000);

// Payment processing libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "webhook-handling", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing payment patterns:
await mcp__serena__find_symbol("payment", "src/lib", true);
await mcp__serena__get_symbols_overview("src/components/forms");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Payment fields implementation"
2. **integration-specialist** --think-hard --use-loaded-docs "Stripe payment integration"
3. **security-compliance-officer** --think-ultra-hard --follow-existing-patterns "PCI DSS compliance" 
4. **api-architect** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Implement secure payment processing."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 3

### Final Payment System:
- [ ] PaymentField component with Stripe Elements integration
- [ ] Invoice generation system with PDF output
- [ ] Payment status tracking and real-time updates
- [ ] Payment plan and installment management
- [ ] Stripe webhook handler for payment events
- [ ] Payment analytics and reporting
- [ ] Refund and dispute handling system
- [ ] Complete E2E testing of payment workflows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (VERIFY FIRST!):
- FROM Team B: Form template integration points - MUST BE AVAILABLE for payment field embedding
- FROM Team C: Client record structure - Required for payment-client linking

### What other teams NEED from you:
- TO Team B: Payment field specifications for templates - Final integration requirement
- TO Team E: Payment component patterns - Final UI component delivery

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] PCI DSS compliance for payment data handling
- [ ] No payment card data stored locally (use Stripe tokens)
- [ ] Webhook signature verification for all Stripe events
- [ ] Payment amount validation and limits
- [ ] Encrypted storage of payment metadata
- [ ] Audit logging for all payment transactions
- [ ] Rate limiting on payment endpoints

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. PAYMENT FIELD INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/forms/123/payment"});
await mcp__playwright__browser_wait_for({text: "Payment Information"});
const paymentFormSnapshot = await mcp__playwright__browser_snapshot();

// 2. STRIPE ELEMENTS INTEGRATION TESTING
// Note: Use Stripe test mode tokens for testing
await mcp__playwright__browser_type({
  element: "Card number input",
  ref: "input[data-testid='card-number']",
  text: "4242424242424242"
});
await mcp__playwright__browser_type({
  element: "Expiry input",
  ref: "input[data-testid='card-expiry']",
  text: "12/28"
});
await mcp__playwright__browser_type({
  element: "CVC input",
  ref: "input[data-testid='card-cvc']",
  text: "123"
});

// 3. PAYMENT PROCESSING TESTING
await mcp__playwright__browser_click({
  element: "Process payment button",
  ref: "button[data-testid='process-payment']"
});
await mcp__playwright__browser_wait_for({text: "Processing payment..."});
await mcp__playwright__browser_wait_for({text: "Payment successful"});

// 4. INVOICE GENERATION TESTING
await mcp__playwright__browser_click({
  element: "Generate invoice button",
  ref: "button[data-testid='generate-invoice']"
});
await mcp__playwright__browser_wait_for({text: "Invoice generated"});
// Verify PDF download
await mcp__playwright__browser_click({
  element: "Download invoice button",
  ref: "button[data-testid='download-invoice']"
});

// 5. PAYMENT PLAN TESTING
await mcp__playwright__browser_navigate({url: "/forms/123/payment-plan"});
await mcp__playwright__browser_select_option({
  element: "Payment plan selector",
  ref: "select[data-testid='payment-plan']",
  values: ["3-installments"]
});
await mcp__playwright__browser_wait_for({text: "3 payments of $500.00"});

// 6. PAYMENT STATUS TRACKING TESTING
await mcp__playwright__browser_navigate({url: "/payments/status/pi_test123"});
await mcp__playwright__browser_wait_for({text: "Payment Status: Completed"});
await mcp__playwright__browser_wait_for({text: "Amount: $1,500.00"});
await mcp__playwright__browser_wait_for({text: "Transaction ID:"});
```

**REQUIRED TEST COVERAGE:**
- [ ] Payment fields integrate with Stripe Elements
- [ ] Payment processing handles test transactions
- [ ] Invoice generation creates valid PDFs
- [ ] Payment plans calculate installments correctly
- [ ] Payment status updates in real-time
- [ ] Webhook handling processes Stripe events

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 3 deliverables complete
- [ ] Stripe integration handles payments securely
- [ ] Invoice generation produces professional PDFs
- [ ] Zero TypeScript errors
- [ ] Zero payment processing errors

### Security & Integration:
- [ ] PCI DSS compliance verified
- [ ] Webhook signature verification working
- [ ] Payment fields integrate with form templates
- [ ] Performance targets met (<3s payment processing)
- [ ] Ready for production deployment

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Payment components: `/wedsync/src/components/forms/payment/`
- Stripe service: `/wedsync/src/lib/payments/stripe-service.ts`
- Webhook handler: `/wedsync/src/app/api/stripe/webhooks/route.ts`
- Invoice generator: `/wedsync/src/lib/payments/invoice-generator.ts`
- Tests: `/wedsync/tests/payments/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-3-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-3-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-3-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT store payment card data locally (PCI DSS violation)
- Do NOT skip webhook signature verification (security risk)
- Do NOT test with real payment data in development
- Do NOT claim completion without evidence
- REMEMBER: This is FINAL ROUND - payment system must be production-ready

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY