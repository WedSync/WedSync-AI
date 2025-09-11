# TEAM B - ROUND 3: WS-139 - Pricing Strategy System - Backend & Integration

**Date:** 2025-08-24  
**Feature ID:** WS-139 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Implement comprehensive freemium pricing system with Stripe integration and feature gating  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer running a small business
**I want to:** Start with a free account and upgrade to paid features as my business grows
**So that:** I can access advanced client management tools without upfront costs, and scale my subscription as I get more clients

**Real Wedding Problem This Solves:**
A new wedding photographer signs up for free to try basic features like client lists. After booking 10 weddings, they need automated journeys and AI chatbot features. They upgrade to Professional ($49/month) to handle their growing business without manual work overload.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Implement freemium tier (10 clients, 1 form, basic dashboard)
- Feature gating blocks access with upgrade prompts
- Full Stripe integration (subscriptions, upgrades, downgrades)
- Trial extension system (15 days, once per account)
- Usage tracking enforces tier limits
- Advanced billing system with subscription management
- RLS policies protect subscription data

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Payment: Stripe Subscriptions, Webhooks
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Stripe API: Subscription creation, management, billing
- Database: New tables for tiers, subscriptions, usage tracking
- Middleware: Feature gating for protected routes
- Frontend: Pricing cards, upgrade modals, billing dashboard

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("stripe");  // Get correct library ID first
await mcp__context7__get-library-docs("/stripe/stripe-node", "subscriptions pricing", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "row level security billing", 2000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes middleware", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("subscription", "", true);
await mcp__serena__find_symbol("billing", "", true);
await mcp__serena__get_symbols_overview("/src/lib/billing");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated Stripe APIs (frequent updates!)
- Serena shows existing billing patterns to follow (don't reinvent!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track pricing system implementation"
2. **integration-specialist** --think-hard --use-loaded-docs "Stripe billing integration specialist" 
3. **postgresql-database-expert** --think-ultra-hard --follow-existing-patterns "Billing database architecture with RLS" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --billing-focused --subscription-management
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant billing and subscription files first
- Understand existing Stripe integration patterns
- Check current subscription table schemas
- Review similar billing implementations
- Continue until you FULLY understand the billing architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed billing system plan
- Write subscription logic tests FIRST (TDD)
- Plan Stripe webhook handling
- Consider billing edge cases and failures
- Don't rush - proper planning prevents billing disasters

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing billing patterns
- Use Context7 Stripe examples as templates
- Implement with parallel agents
- Focus on billing accuracy, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including payment simulation
- Verify with Stripe test mode
- Create billing flow evidence package
- Generate subscription management reports
- Only mark complete when billing flows verified

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Integration & Finalization):
- [ ] **Database Migration**: Complete subscription tiers and usage tracking tables
- [ ] **Stripe Integration**: Full subscription lifecycle management
- [ ] **Feature Gating Service**: Middleware for access control
- [ ] **Trial Extension Logic**: Smart trial management with activity tracking
- [ ] **Billing API Endpoints**: Upgrade, downgrade, usage tracking routes
- [ ] **Webhook Handlers**: Stripe event processing for subscription changes
- [ ] **Usage Enforcement**: Real-time limit checking and enforcement
- [ ] **RLS Policies**: Secure database access for subscription data
- [ ] **Complete Integration Tests**: End-to-end billing flow validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: PricingCards component integration - Required for frontend display
- FROM Team C: Performance monitoring for billing APIs - Dependency for metrics

### What other teams NEED from you:
- TO Team A: Feature gating middleware exports - They need this for frontend gates
- TO Team D: Subscription status API - Blocking their billing dashboard work

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MANDATORY SECURITY IMPLEMENTATION FOR ALL BILLING APIS:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { subscriptionSchema } from '@/lib/validation/schemas';
import { getCurrentSupplier } from '@/lib/auth/server';

export const POST = withSecureValidation(
  subscriptionSchema.extend({
    stripe_signature: z.string().optional()
  }),
  async (request: NextRequest, validatedData) => {
    // Verify user owns subscription
    const supplier = await getCurrentSupplier();
    if (!supplier) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Stripe webhook signature for webhook routes
    if (validatedData.stripe_signature) {
      const signature = request.headers.get('stripe-signature');
      if (!verifyStripeSignature(signature, await request.text())) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    }

    // Rate limit billing operations
    const rateLimitCheck = await checkBillingRateLimit(supplier.id);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded',
        resetTime: rateLimitCheck.resetTime
      }, { status: 429 });
    }

    // Sanitize and validate all billing data
    const sanitizedData = sanitizeBillingData(validatedData);
    
    // Your implementation here with sanitized data
  }
);
```

### SECURITY CHECKLIST FOR BILLING APIS

- [ ] **Stripe Webhook Verification**: Validate ALL webhook signatures
- [ ] **Subscription Ownership**: Verify user can only access their own subscriptions
- [ ] **Rate Limiting**: Prevent billing API abuse attacks
- [ ] **Data Sanitization**: Clean all financial data before processing
- [ ] **RLS Policies**: Database-level subscription data protection
- [ ] **Audit Logging**: Log ALL billing events (subscriptions, upgrades, downgrades)
- [ ] **PCI Compliance**: Never store credit card data locally
- [ ] **Error Handling**: Never expose internal billing errors to users

### ⚠️ DATABASE MIGRATIONS:

```sql
-- ⚠️ CRITICAL: Teams CREATE migration files but DO NOT APPLY them
-- Migration files go to: /wedsync/supabase/migrations/[timestamp]_pricing_strategy_system.sql
-- Teams MUST send migration request to SQL Expert inbox
-- SQL Expert handles ALL migration application and conflict resolution

-- Create file: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-139.md
-- Include: migration file path, dependencies, testing status
-- SQL Expert will validate, fix patterns, and apply safely
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 BILLING-SPECIFIC E2E VALIDATION:**

```javascript
// REVOLUTIONARY BILLING TESTING APPROACH!

// 1. SUBSCRIPTION UPGRADE FLOW TESTING
test('Complete subscription upgrade flow', async () => {
  await mcp__playwright__browser_navigate({ url: '/billing' });
  await mcp__playwright__browser_snapshot();
  
  // Test pricing cards display
  await mcp__playwright__browser_wait_for({ text: 'Professional' });
  
  // Click upgrade button
  await mcp__playwright__browser_click({
    element: 'Professional tier upgrade button',
    ref: '[data-testid="upgrade-professional"]'
  });
  
  // Should redirect to Stripe checkout
  await mcp__playwright__browser_wait_for({ text: 'Stripe Checkout' });
  
  // Verify checkout page has correct amount
  const checkoutAmount = await mcp__playwright__browser_evaluate({
    function: `() => document.querySelector('[data-testid="checkout-amount"]').textContent`
  });
  expect(checkoutAmount).toContain('$49.00');
});

// 2. FEATURE GATING VALIDATION
test('Feature gates work correctly for each tier', async () => {
  // Test free tier limitations
  await mcp__playwright__browser_navigate({ url: '/chatbot' });
  
  // Should show feature gate modal
  await mcp__playwright__browser_wait_for({ text: 'Upgrade Required' });
  await mcp__playwright__browser_snapshot();
  
  // Verify modal content
  const modalText = await page.locator('[data-testid="feature-gate-modal"]').textContent();
  expect(modalText).toContain('AI Chatbot requires Professional plan');
});

// 3. TRIAL EXTENSION FLOW
test('Trial extension eligibility checking', async () => {
  await mcp__playwright__browser_navigate({ url: '/billing' });
  
  // Check trial status
  const trialInfo = await mcp__playwright__browser_evaluate({
    function: `() => ({
      daysLeft: document.querySelector('[data-testid="trial-days"]').textContent,
      extendButton: document.querySelector('[data-testid="extend-trial"]')?.disabled
    })`
  });
  
  expect(trialInfo.daysLeft).toMatch(/\d+ days/);
  
  if (!trialInfo.extendButton) {
    // Click extend trial
    await mcp__playwright__browser_click({
      element: 'Extend trial button',
      ref: '[data-testid="extend-trial"]'
    });
    
    // Should show extension confirmation
    await mcp__playwright__browser_wait_for({ text: 'Trial Extended' });
  }
});

// 4. USAGE LIMIT ENFORCEMENT
test('Usage limits are enforced correctly', async () => {
  await mcp__playwright__browser_navigate({ url: '/clients' });
  
  // Try to exceed free tier limit (10 clients)
  for (let i = 0; i < 12; i++) {
    await mcp__playwright__browser_click({
      element: 'Add new client button',
      ref: '[data-testid="add-client"]'
    });
    
    if (i >= 10) {
      // Should show upgrade prompt
      await mcp__playwright__browser_wait_for({ text: 'Upgrade to add more clients' });
      break;
    }
  }
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Subscription creation and upgrade flows
- [ ] Feature gating for each tier's limitations
- [ ] Trial extension eligibility and activation
- [ ] Usage limit enforcement across all features
- [ ] Stripe webhook processing
- [ ] Billing error handling and recovery
- [ ] Downgrade data preservation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Freemium tier working (10 clients, 1 form limit)
- [ ] Feature gates blocking premium features
- [ ] Stripe integration complete (create, upgrade, cancel)
- [ ] Trial extension system functional
- [ ] Usage tracking and enforcement active
- [ ] All billing APIs secured and validated

### Integration & Performance:
- [ ] Database migrations applied successfully
- [ ] RLS policies protecting subscription data
- [ ] Billing API response times under 200ms
- [ ] Stripe webhooks processing correctly
- [ ] Error handling prevents billing corruption

### Evidence Package Required:
- [ ] Complete subscription flow recordings
- [ ] Stripe test mode transaction receipts
- [ ] Feature gate screenshots for each tier
- [ ] Trial extension proof of functionality
- [ ] Usage limit enforcement demonstrations

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Services: `/wedsync/src/lib/billing/pricing-tiers.ts`, `/wedsync/src/lib/billing/subscription-manager.ts`
- APIs: `/wedsync/src/app/api/pricing/tiers/route.ts`, `/wedsync/src/app/api/subscription/*/route.ts`
- Middleware: `/wedsync/src/lib/billing/feature-gating.ts`
- Migrations: `/wedsync/supabase/migrations/20250824000003_pricing_strategy_system.sql`
- Tests: `/wedsync/tests/billing/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch10/WS-139-round-3-complete.md`
- **Include:** Feature ID (WS-139) in all filenames
- **Save in:** batch10 folder 
- **After completion:** Run `./route-messages.sh`

### CRITICAL - Database Migration Handover:
- **Create:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-139.md`
- **Include:** Migration file path, dependencies, testing status
- **Note:** SQL Expert will validate and apply migration

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT apply database migrations yourself - send to SQL Expert
- Do NOT skip Stripe webhook signature verification
- Do NOT expose sensitive billing data in error messages
- REMEMBER: All 5 teams work in PARALLEL - no overlapping billing features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All pricing system deliverables complete
- [ ] Tests written and passing (>85% coverage)
- [ ] Security validated for all billing endpoints
- [ ] Stripe integration dependencies provided
- [ ] Database migration request sent to SQL Expert
- [ ] Evidence package with billing flow proof created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY