# TEAM A - ROUND 1: WS-165/166 - Payment Calendar & Pricing Strategy System - Core Implementation

**Date:** 2025-08-25  
**Feature IDs:** WS-165, WS-166 (Combined batch development)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive payment calendar and pricing table components for wedding management and supplier subscriptions
**Context:** You are Team A working in parallel with 4 other teams. Combined features for efficient development.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**WS-165 - Payment Calendar:**
**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**WS-166 - Pricing Strategy System:**
**As a:** Wedding supplier (photographer/venue/florist)
**I want to:** Choose a subscription plan that matches my business size and needs
**So that:** I can access the right features at the right price point and scale as my business grows

**Real Wedding Problems These Solve:**
1. **Payment Calendar**: Couples currently track wedding payments in spreadsheets and phone notes, missing critical deadlines like venue final payments or photographer deposits. This creates a visual payment calendar with automatic reminders.
2. **Pricing Strategy**: A wedding photographer manages 30 weddings/year but uses spreadsheets. With the starter tier at £19/month, they can manage all clients digitally, saving 5+ hours per wedding. As they grow to 50+ weddings, they upgrade to Professional for automation features.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specifications:**

**WS-165 Requirements:**
- Visual calendar showing payment due dates
- Payment status tracking (upcoming/due/overdue/paid)
- Integration with budget categories for cash flow planning
- Mark payments as paid functionality
- Responsive calendar interface

**WS-166 Requirements:**
- Responsive pricing table displaying all subscription tiers
- Interactive upgrade/downgrade modal workflows
- Feature comparison matrix with clear benefit explanations
- Mobile-first pricing experience
- Integration with Stripe payment flows

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Payments: Stripe integration
- Testing: Playwright MCP, Browser MCP, Vitest
- Calendar Library: React Big Calendar or shadcn/ui Calendar

**Integration Points:**
- Budget Categories System: Calendar must show payments by budget category
- Payment Schedule API: Connect to backend payment tracking
- Subscription System: Pricing components must connect to Stripe subscriptions
- Database Tables: payment_schedule, payment_reminders, subscription_tiers

---

## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This combined payment calendar and pricing system needs to integrate with budget categories, subscription management, and payment processing. Need to analyze data flow for both wedding couples and suppliers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: Payment calendar displays couple payment schedules while pricing system manages supplier subscriptions. Both use different authentication contexts and database schemas.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A builds UI components, Team B provides payment/subscription APIs, Team C handles notifications. Need to define clear API contracts for both payment data and subscription management.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/payments and /api/subscriptions endpoints need different validation schemas. Payment calendar requires date-based queries, pricing system needs tier comparison data.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "next app-router components latest documentation"});
await mcp__Ref__ref_search_documentation({query: "stripe js payment-intents subscriptions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss calendar-styles pricing-tables responsive latest documentation"});
await mcp__Ref__ref_search_documentation({query: "ui calendar components pricing components latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Calendar", "", true);
await mcp__serena__find_symbol("Pricing", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Payment calendar and pricing system development"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Calendar and pricing component expertise"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "React 19 components" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns for both payment calendar and pricing components."

---

## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

```javascript
// BROWSER MCP - Interactive Visual Testing for both features

// 1. PAYMENT CALENDAR TESTING
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/payments/calendar"});
const calendarSnapshot = await mcp__browsermcp__browser_snapshot();

// Test calendar navigation
await mcp__browsermcp__browser_click({
  element: "Next month button",
  ref: "[data-testid='calendar-next-month']"
});

// Test payment marking
await mcp__browsermcp__browser_click({
  element: "Mark as paid button",
  ref: "[data-payment-id='test-payment-1']"
});

// 2. PRICING TABLE TESTING  
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/pricing"});
const pricingSnapshot = await mcp__browsermcp__browser_snapshot();

// Test upgrade flow
await mcp__browsermcp__browser_click({
  element: "Upgrade to Professional button",
  ref: "[data-tier='professional'] button"
});

// Test modal interactions
await mcp__browsermcp__browser_wait_for({text: "Upgrade Subscription"});

// 3. RESPONSIVE TESTING FOR BOTH
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/payments/calendar"});
  await mcp__browsermcp__browser_screenshot({filename: `payment-calendar-${width}px.png`});
  
  await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/pricing"});
  await mcp__browsermcp__browser_screenshot({filename: `pricing-table-${width}px.png`});
}

// 4. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');
```

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing calendar and pricing components in the codebase
- Understand existing payment/subscription patterns
- Check integration points with payment and subscription APIs
- Review similar date picker and pricing table implementations
- Continue until you FULLY understand the codebase patterns

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for both payment calendar and pricing system
- Write test cases FIRST (TDD) for both feature sets
- Plan error handling for payment data and subscription flows
- Consider responsive breakpoints for both components
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing component patterns
- Use Ref MCP calendar and pricing examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):

**WS-165 - Payment Calendar:**
- [ ] PaymentCalendar React component with calendar grid view
- [ ] PaymentList component showing upcoming payments
- [ ] PaymentItem component for individual payment display
- [ ] Integration with payment_schedule database table
- [ ] Basic mark-as-paid functionality
- [ ] Unit tests for payment calendar with >80% coverage
- [ ] Basic Playwright tests for calendar interaction

**WS-166 - Pricing Strategy System:**
- [ ] PricingTable component with all tiers (Free, Starter, Professional, Scale, Enterprise)
- [ ] PricingCard components with feature lists and CTAs
- [ ] UpgradeModal component for tier selection workflow
- [ ] FeatureComparisonMatrix for detailed feature breakdown
- [ ] Mobile-responsive pricing layout (375px+)
- [ ] Integration with Team B's subscription API endpoints
- [ ] Unit tests for pricing components with >80% coverage

**Combined Integration:**
- [ ] Shared TypeScript interfaces for both feature sets
- [ ] Common error handling patterns
- [ ] Unified testing approach
- [ ] Consistent UI/UX patterns between components

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
Both features must integrate seamlessly with WedSync's navigation system to provide intuitive user flows for both wedding couples (payment calendar) and suppliers (pricing system).

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Payment Calendar breadcrumbs
const paymentBreadcrumbs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Budget', href: '/budget' },
  { label: 'Payment Calendar', href: '/payments/calendar' }
]

// Pricing System breadcrumbs  
const pricingBreadcrumbs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Account', href: '/account' },
  { label: 'Subscription', href: '/account/subscription' },
  { label: 'Pricing', href: '/pricing' }
]
```

**2. Menu Integration Points**
- **Payment Calendar**: Add to main budget/finance menu section
- **Pricing System**: Add to account/billing menu section
- **Contextual Menus**: Implement context-sensitive navigation for both features
- **Quick Actions**: Payment shortcuts and subscription management links

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation for both features
// Payment calendar: Swipe gestures for month navigation
// Pricing table: Horizontal scroll with sticky headers
// Progressive disclosure for complex feature matrices
```

**4. User Flow Integration**
- **Payment Calendar Entry Points**: From budget dashboard, due date notifications
- **Pricing System Entry Points**: From billing pages, feature limit notifications
- **Exit Points**: Clear paths back to main dashboards
- **Cross-Feature Navigation**: Link between payment features and subscription management

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Payment schedule API endpoints - Required for fetching payment data
- FROM Team B: Subscription API endpoints - Required for pricing data and upgrade flows
- FROM Team C: Budget category integration - Dependency for payment categorization
- FROM Team C: Stripe integration patterns - Needed for payment workflow

### What other teams NEED from you:
- TO Team D: PaymentCalendar component export - They need this for WedMe mobile view
- TO Team D: PricingTable component export - For WedMe pricing integration
- TO Team E: Component interface definitions - Blocking their testing framework

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API CALLS

```typescript
// ✅ PAYMENT CALENDAR SECURITY PATTERN:
import { withSecureValidation } from '@/lib/validation/middleware';
import { paymentSchema } from '@/lib/validation/schemas';

const fetchPayments = async (coupleId: string) => {
  const response = await fetch(`/api/payments/${coupleId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': await getCsrfToken(),
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch payments');
  }
  
  return await response.json();
};

// ✅ PRICING SYSTEM SECURITY PATTERN:
import { subscriptionSchema } from '@/lib/validation/schemas';

const upgradeSubscription = async (tierId: string, stripeData: any) => {
  const validatedData = subscriptionSchema.parse({
    tierId,
    stripeData,
    userId: session.user.id
  });
  
  const response = await fetch(`/api/subscriptions/upgrade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': await getCsrfToken(),
    },
    body: JSON.stringify(validatedData)
  });
  
  return await response.json();
};
```

### SECURITY CHECKLIST FOR BOTH FEATURES:
- [ ] **Authentication Check**: Verify user session for both couples and suppliers
- [ ] **Input Validation**: Validate payment IDs, amounts, subscription tiers
- [ ] **CSRF Protection**: Include CSRF tokens in all state-changing operations
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **XSS Prevention**: Sanitize payment descriptions and pricing content
- [ ] **PCI Compliance**: Secure handling of payment card data
- [ ] **Subscription Security**: Validate tier changes and billing information

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. PAYMENT CALENDAR ACCESSIBILITY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments/calendar"});
const paymentAccessibility = await mcp__playwright__browser_snapshot();

// Test calendar keyboard navigation
await mcp__playwright__browser_press_key({key: "Tab"});
await mcp__playwright__browser_press_key({key: "ArrowRight"});
await mcp__playwright__browser_press_key({key: "Enter"});

// 2. PRICING TABLE INTERACTION TESTING  
await mcp__playwright__browser_navigate({url: "http://localhost:3000/pricing"});
const pricingAccessibility = await mcp__playwright__browser_snapshot();

// Test upgrade flow
await mcp__playwright__browser_click({
  element: "Professional tier upgrade button",
  ref: "[data-testid='tier-professional'] button"
});

await mcp__playwright__browser_wait_for({text: "Confirm Subscription Upgrade"});

// Test modal accessibility
await mcp__playwright__browser_press_key({key: "Escape"});
await mcp__playwright__browser_wait_for({textGone: "Confirm Subscription Upgrade"});

// 3. COMBINED RESPONSIVE VALIDATION
for (const width of [375, 768, 1024, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  
  // Test payment calendar responsiveness
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments/calendar"});
  const calendarSnapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `payment-calendar-${width}px.png`});
  
  // Test pricing table responsiveness  
  await mcp__playwright__browser_navigate({url: "http://localhost:3000/pricing"});
  const pricingSnapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `pricing-table-${width}px.png`});
}
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Payment calendar displays correctly with all upcoming payments
- [ ] Calendar navigation works (month/year switching) with keyboard support
- [ ] Mark-as-paid functionality updates UI immediately
- [ ] Pricing table displays all subscription tiers with correct features
- [ ] Upgrade/downgrade modals function correctly
- [ ] Stripe integration works for subscription changes
- [ ] Tests written FIRST and passing (>80% coverage for both features)
- [ ] Playwright tests validating both calendar and pricing interactions
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Calendar loads payment data from API successfully (<1s load time)
- [ ] Pricing table loads subscription data efficiently
- [ ] Performance targets met (<200ms interactions)
- [ ] Accessibility validation passed (keyboard navigation, screen readers)
- [ ] Works on all breakpoints (375px, 768px, 1920px)
- [ ] Both features integrate seamlessly with existing navigation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:

**Payment Calendar (WS-165):**
- Frontend: `/wedsync/src/components/payments/PaymentCalendar.tsx`
- Frontend: `/wedsync/src/components/payments/PaymentList.tsx`
- Frontend: `/wedsync/src/components/payments/PaymentItem.tsx`
- Tests: `/wedsync/tests/components/payment-calendar.test.ts`

**Pricing Strategy System (WS-166):**
- Frontend: `/wedsync/src/components/pricing/PricingTable.tsx`
- Frontend: `/wedsync/src/components/pricing/PricingCard.tsx`
- Frontend: `/wedsync/src/components/pricing/UpgradeModal.tsx`
- Frontend: `/wedsync/src/components/pricing/FeatureComparisonMatrix.tsx`
- Tests: `/wedsync/tests/pricing/pricing-components.test.ts`

**Shared:**
- Types: `/wedsync/src/types/payments.ts`
- Types: `/wedsync/src/types/subscriptions.ts`
- Utils: `/wedsync/src/lib/payments/paymentUtils.ts`
- Utils: `/wedsync/src/lib/pricing/subscriptionUtils.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch19/WS-165-166-team-a-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST for both features
- Do NOT ignore security requirements for either payment or subscription data
- Do NOT claim completion without evidence for both feature sets
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round
- FOCUS: Both payment calendar and pricing system must be production-ready

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY