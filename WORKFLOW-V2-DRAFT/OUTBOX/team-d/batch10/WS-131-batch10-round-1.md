# TEAM D - ROUND 1: WS-131 - Pricing Strategy System - Core Implementation

**Date:** 2025-01-24  
**Feature ID:** WS-131 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Implement subscription tier management and feature gating system for WedSync SaaS platform  
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
- Subscription tier management system (Starter, Professional, Premium, Enterprise)
- Feature gating and usage tracking infrastructure
- Stripe integration for subscription billing
- Usage limit enforcement and alerts
- A/B testing framework for pricing experiments
- Revenue analytics and MRR calculations

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Payments: Stripe Subscriptions API with webhooks
- Testing: Playwright MCP, Vitest

**Integration Points:**
- User Management: Subscription status and permissions
- Feature Gates: AI tools, advanced analytics, custom branding
- Usage Tracking: Client limits, form limits, API call limits
- Billing System: Stripe webhooks and payment processing

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("stripe");  // Get correct library ID first
await mcp__context7__get-library-docs("/stripe/stripe-node", "subscriptions billing webhooks", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes middleware", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database transactions rls", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "pricing-tables responsive", 2000);

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
- Context7 prevents using deprecated Stripe APIs (frequent updates!)
- Serena shows existing billing patterns to follow
- Agents work with current knowledge for subscription systems

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Subscription tier and billing system implementation"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Stripe integration and subscription management"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Pricing tiers and billing dashboard UI" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for billing systems."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant billing and subscription files first
- Understand existing user management patterns
- Check integration points with authentication system
- Review similar SaaS billing implementations
- Continue until you FULLY understand subscription architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed subscription system architecture
- Write test cases FIRST (TDD)
- Plan error handling for payment failures
- Consider edge cases in subscription management
- Don't rush - billing systems require precision

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns for API routes
- Use Context7 examples for Stripe integration
- Implement with parallel agents
- Focus on reliability and security

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests including payment scenarios
- Verify with Playwright payment flows
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Subscription tiers database schema and management
- [ ] Feature gating system with access control
- [ ] Basic Stripe integration for subscription creation
- [ ] Usage tracking infrastructure
- [ ] Pricing tiers UI component
- [ ] Core API endpoints for subscription management
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for subscription flows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Music AI usage metrics for billing limits
- FROM Team B: Florist AI usage metrics for billing limits
- FROM Team C: Photography AI usage metrics for billing limits

### What other teams NEED from you:
- TO Team E: Subscription tier data for trial conversion tracking
- TO All Teams: Feature gating system for premium features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All billing endpoints require authentication
- [ ] Stripe webhook signature verification  
- [ ] No credit card data stored locally
- [ ] PCI compliance for payment processing
- [ ] Rate limiting on subscription endpoints
- [ ] Audit logging for all billing events
- [ ] CSRF protection on payment forms

---

## ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-131.md
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/billing/pricing"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB SUBSCRIPTION WORKFLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/billing/pricing"});        // Tab 1: Pricing
await mcp__playwright__browser_tab_new({url: "/billing/dashboard"});      // Tab 2: Billing Dashboard
await mcp__playwright__browser_tab_select({index: 0});                    // Switch to pricing
await mcp__playwright__browser_click({                                    // Select Professional tier
  element: "Professional Tier Button", ref: "button[data-tier='professional']"
});
await mcp__playwright__browser_tab_select({index: 1});                    // Check dashboard updates
await mcp__playwright__browser_wait_for({text: "Professional subscription active"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory?.usedJSHeapSize || 0,
    stripeElementsLoaded: !!document.querySelector('[data-testid="stripe-element"]')
  })`
});

// 4. SUBSCRIPTION FLOW VALIDATION
await mcp__playwright__browser_type({
  element: 'Card Number Input',
  ref: 'input[name="cardNumber"]',
  text: '4242424242424242'  // Stripe test card
});
await mcp__playwright__browser_type({
  element: 'Card Expiry Input',
  ref: 'input[name="expiry"]',
  text: '12/25'
});
await mcp__playwright__browser_type({
  element: 'Card CVC Input',
  ref: 'input[name="cvc"]',
  text: '123'
});
await mcp__playwright__browser_click({element: 'Subscribe Button', ref: 'button[type="submit"]'});
await mcp__playwright__browser_wait_for({text: 'Subscription successful'});

// 5. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 6. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-pricing.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab subscription workflows (pricing to billing dashboard)
- [ ] Scientific performance (Core Web Vitals + Stripe loading)
- [ ] Zero console errors (verified)
- [ ] Network success (no 4xx/5xx, especially for Stripe API)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating subscription flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Basic Stripe integration working
- [ ] Subscription creation under 2 seconds
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working subscription system
- [ ] Playwright test results showing payment flows
- [ ] Performance metrics for subscription creation
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/billing/`
- Backend: `/wedsync/src/app/api/billing/`
- Services: `/wedsync/src/lib/billing/`
- Tests: `/wedsync/tests/billing/`
- Types: `/wedsync/src/types/billing.ts`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch10/WS-131-round-1-complete.md`
- **Include:** Feature ID (WS-131) in all filenames
- **Save in:** Correct batch folder (batch10)
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch10/WS-131-round-1-complete.md`

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