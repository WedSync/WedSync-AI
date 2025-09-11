# TEAM D - ROUND 2: WS-131 - Pricing Strategy System - Advanced Features & Optimization

**Date:** 2025-01-24  
**Feature ID:** WS-131 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Enhance subscription system with usage analytics, upgrade flows, and A/B testing capabilities  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding planner managing WedSync's business operations
**I want to:** Implement a tiered subscription system that converts free users to paid plans through value-driven upgrades
**So that:** We achieve sustainable revenue growth while providing clear value at each price point

**Real Business Scenario:**
A photography business starts with our free plan to test the platform with 3 couples. After seeing 40% faster client onboarding and 6 hours saved per wedding, they upgrade to Professional ($49/month) for unlimited clients. When they reach 20+ weddings per year and need advanced automation features, they upgrade to Premium ($149/month), increasing their annual revenue by $15,000 while reducing administrative overhead by 60%.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Advanced usage tracking with limit enforcement
- Subscription upgrade/downgrade flows with proration
- A/B testing framework for pricing experiments
- Revenue analytics dashboard with MRR calculations
- Dunning management for failed payments
- Coupon and discount code system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Payments: Stripe Subscriptions with advanced webhooks
- Analytics: Revenue tracking and cohort analysis
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team A/B/C AI Services: Usage metrics for billing limits
- Team E Trial System: Conversion tracking and upgrade flows
- Admin Dashboard: Revenue analytics and business metrics
- Email System: Dunning and upgrade notifications

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("stripe");  // Get correct library ID first
await mcp__context7__get-library-docs("/stripe/stripe-node", "subscription-upgrades proration webhooks", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "middleware caching optimization", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "realtime analytics triggers", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/recharts/recharts", "revenue-charts analytics", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns from Round 1:
await mcp__serena__find_symbol("FeatureGateManager", "", true);
await mcp__serena__get_symbols_overview("/src/lib/billing/");

// NOW you have current docs + existing billing context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 ensures advanced Stripe features are implemented correctly
- Serena shows Round 1 patterns to build upon
- Agents work with complete billing system knowledge

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Advanced subscription features and analytics"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Revenue analytics and upgrade optimization"
3. **data-analytics-engineer** --think-ultra-hard --follow-existing-patterns "MRR tracking and cohort analysis" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --complex-flows --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-user-flows
7. **code-quality-guardian** --advanced-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build on Round 1 billing foundations."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL Round 1 billing implementation
- Understand current subscription flow patterns
- Check integration points with AI usage tracking
- Review advanced Stripe features and webhooks
- Continue until advanced billing features are FULLY understood

### **PLAN PHASE (THINK HARD!)**
- Create detailed enhancement plan for Round 2
- Write test cases FIRST for complex upgrade flows (TDD)
- Plan analytics and reporting architecture
- Consider edge cases in subscription management
- Don't rush - revenue tracking requires precision

### **CODE PHASE (PARALLEL AGENTS!)**
- Write comprehensive tests before implementation
- Follow patterns established in Round 1
- Use Context7 examples for advanced Stripe features
- Implement with parallel agents focusing on reliability
- Focus on user experience and conversion optimization

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including complex upgrade scenarios
- Verify with Playwright advanced billing flows
- Create evidence package
- Generate analytics reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Optimization):
- [ ] Advanced usage tracking with smart alerting system
- [ ] Subscription upgrade/downgrade flows with accurate proration
- [ ] A/B testing framework for pricing experiments
- [ ] Revenue analytics dashboard with MRR and churn metrics
- [ ] Failed payment handling with dunning management
- [ ] Coupon and discount code system
- [ ] Advanced Playwright scenarios for complex billing flows
- [ ] Performance optimization for analytics queries

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Music AI final usage metrics integration
- FROM Team B: Florist AI final usage metrics integration  
- FROM Team C: Photography AI final usage metrics integration
- FROM Team E: Trial conversion data and optimization insights

### What other teams NEED from you:
- TO Team E: Advanced subscription upgrade flows for trial conversion
- TO Admin Dashboard: Revenue analytics and business intelligence
- TO All Teams: Feature usage limit enforcement

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Advanced webhook signature validation for all Stripe events
- [ ] PCI DSS compliance for payment data handling  
- [ ] Encrypted storage of sensitive billing information
- [ ] Role-based access control for billing administration
- [ ] Advanced rate limiting on payment endpoints
- [ ] Comprehensive audit logging for all revenue events
- [ ] Fraud detection and prevention mechanisms

---

## ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-131-advanced.md
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ADVANCED SUBSCRIPTION FLOW VALIDATION:**

```javascript
// COMPREHENSIVE BILLING SYSTEM TESTING

// 1. COMPLEX SUBSCRIPTION UPGRADE WORKFLOW
await mcp__playwright__browser_navigate({url: "http://localhost:3000/billing/dashboard"});
const billingDashboard = await mcp__playwright__browser_snapshot();

// 2. MULTI-TAB UPGRADE FLOW TESTING
await mcp__playwright__browser_tab_new({url: "/billing/current-plan"});    // Tab 1: Current Plan
await mcp__playwright__browser_tab_new({url: "/billing/usage-analytics"}); // Tab 2: Usage Analytics  
await mcp__playwright__browser_tab_new({url: "/billing/upgrade-flow"});    // Tab 3: Upgrade Flow

// Test upgrade recommendation based on usage
await mcp__playwright__browser_tab_select({index: 1}); // Usage analytics
await mcp__playwright__browser_wait_for({text: "Approaching client limit"});

await mcp__playwright__browser_click({element: 'Upgrade Recommendation', ref: 'button.upgrade-rec'});
await mcp__playwright__browser_tab_select({index: 2}); // Upgrade flow
await mcp__playwright__browser_wait_for({text: "Recommended: Professional Plan"});

// 3. PRORATION CALCULATION TESTING
const prorationTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate mid-cycle upgrade
    const response = await fetch('/api/billing/calculate-proration', {
      method: 'POST',
      body: JSON.stringify({
        currentTier: 'starter',
        targetTier: 'professional',
        billingCycle: 'monthly'
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    return {
      prorationAmount: result.prorationAmount,
      nextChargeDate: result.nextChargeDate,
      calculationAccurate: result.prorationAmount > 0
    };
  }`
});

// 4. FAILED PAYMENT RECOVERY FLOW
await mcp__playwright__browser_navigate({url: '/billing/payment-failed'});
await mcp__playwright__browser_wait_for({text: 'Payment Failed - Update Your Card'});

await mcp__playwright__browser_type({
  element: 'New Card Number Input',
  ref: 'input[name="newCardNumber"]',
  text: '4000000000000002'  // Stripe test card that will succeed
});

await mcp__playwright__browser_click({element: 'Retry Payment', ref: 'button.retry-payment'});
await mcp__playwright__browser_wait_for({text: 'Payment successful - subscription reactivated'});

// 5. A/B TESTING EXPERIMENT VALIDATION
const abTestResults = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Check if user is in A/B test experiment
    const experiment = await fetch('/api/billing/pricing-experiment').then(r => r.json());
    return {
      experimentActive: experiment.active,
      variant: experiment.variant,
      priceModification: experiment.modifiedPrice
    };
  }`
});

// 6. REVENUE ANALYTICS DASHBOARD
await mcp__playwright__browser_navigate({url: '/admin/revenue-analytics'});
await mcp__playwright__browser_wait_for({text: 'Monthly Recurring Revenue'});
await mcp__playwright__browser_wait_for({text: 'Churn Rate'});
await mcp__playwright__browser_wait_for({text: 'Customer Lifetime Value'});

// Test export functionality
await mcp__playwright__browser_click({element: 'Export Revenue Report', ref: 'button.export-revenue'});
await mcp__playwright__browser_wait_for({text: 'Report downloaded successfully'});

// 7. RESPONSIVE DESIGN FOR COMPLEX BILLING FLOWS
for (const device of [
  { width: 375, height: 667, name: 'mobile' },
  { width: 768, height: 1024, name: 'tablet' }, 
  { width: 1920, height: 1080, name: 'desktop' }
]) {
  await mcp__playwright__browser_resize({width: device.width, height: device.height});
  
  // Test upgrade flow on each device
  await mcp__playwright__browser_navigate({url: '/billing/upgrade'});
  await mcp__playwright__browser_wait_for({text: 'Choose Your Plan'});
  
  await mcp__playwright__browser_take_screenshot({
    filename: `billing-upgrade-${device.name}-WS-131.png`
  });
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Complex subscription upgrade flows with proration
- [ ] Failed payment recovery and dunning management
- [ ] A/B testing experiment assignment and tracking
- [ ] Revenue analytics dashboard functionality
- [ ] Multi-device billing interface validation
- [ ] Performance under load (100+ concurrent billing operations)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Tests written FIRST and passing (>85% coverage)
- [ ] Complex Playwright tests for billing flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Advanced Features & Performance:
- [ ] Subscription upgrades with accurate proration working
- [ ] Revenue analytics under 1 second load time
- [ ] A/B testing framework operational
- [ ] Failed payment recovery system functional
- [ ] Security requirements exceeded

### Evidence Package Required:
- [ ] Screenshot proof of advanced billing features
- [ ] Revenue analytics dashboard screenshots
- [ ] Complex subscription flow test results
- [ ] Performance metrics for analytics queries
- [ ] A/B testing experiment validation
- [ ] Security audit completion certificate

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/billing/`
- Backend: `/wedsync/src/app/api/billing/`
- Analytics: `/wedsync/src/lib/analytics/billing/`
- Services: `/wedsync/src/lib/billing/`
- Tests: `/wedsync/tests/billing/advanced/`
- Types: `/wedsync/src/types/billing.ts`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch10/WS-131-round-2-complete.md`
- **Include:** Feature ID (WS-131) in all filenames
- **Save in:** Correct batch folder (batch10)
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch10/WS-131-round-2-complete.md`

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