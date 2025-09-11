# TEAM B - ROUND 1: WS-165/166 - Payment Calendar & Pricing Strategy System - Backend APIs & Database Implementation

**Date:** 2025-08-25  
**Feature IDs:** WS-165, WS-166 (Combined batch development)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive backend APIs and database architecture for payment calendar and pricing strategy systems
**Context:** You are Team B working in parallel with 4 other teams. Focus on robust backend infrastructure.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**WS-165 - Payment Calendar Backend:**
**As a:** Wedding couple managing payment deadlines
**I want to:** Reliable backend system tracking payment schedules with automatic reminder infrastructure
**So that:** My payment calendar frontend receives accurate data and notifications are sent reliably

**WS-166 - Pricing Strategy System Backend:**
**As a:** Wedding supplier (photographer/venue/florist)
**I want to:** Backend system that handles subscription management, feature access control, and usage tracking
**So that:** I can seamlessly upgrade/downgrade plans and access features based on my subscription tier

**Real Wedding Problems These Solve:**
1. **Payment Calendar Backend**: Couples need a reliable data layer for tracking payments across multiple vendors (venue: £8k, photography: £3k, catering: £6k) with automatic reminders before due dates.
2. **Pricing Strategy Backend**: Wedding suppliers need subscription management that handles 3 tiers (Starter £19/month, Professional £49/month, Enterprise £149/month) with feature gating and usage analytics.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specifications:**

**WS-165 Backend Requirements:**
- Database schema for payment_schedule and payment_reminders tables
- API endpoints for payment CRUD operations with full validation
- Payment status tracking logic (upcoming/due/overdue/paid)
- Integration with budget categories via foreign key relationships
- Automatic reminder system with cron job infrastructure
- Row Level Security policies for multi-tenant data isolation

**WS-166 Backend Requirements:**
- Database schema for subscription_tiers, user_subscriptions, feature_access tables
- API endpoints for subscription management (upgrade/downgrade/cancel)
- Feature access control middleware for API route protection
- Usage tracking and analytics data collection
- Integration with Stripe webhooks for payment processing
- Subscription lifecycle management (trials, renewals, downgrades)

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Database Migration System: Supabase migrations
- Payment Processing: Stripe integration
- Background Jobs: Supabase Edge Functions with cron triggers

**Integration Points:**
- Payment Calendar: Links to budget_categories table, integrates with user authentication
- Pricing System: Links to user_profiles, integrates with Stripe customer data
- Cross-system: Both systems share user authentication and tenant isolation patterns

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

#### Pattern 1: Database Schema Design Analysis
```typescript
// Before designing complex database schemas
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to design schemas for both payment calendar and subscription management. Payment calendar needs payment_schedule, payment_reminders, payment_history tables. Subscription system needs subscription_tiers, user_subscriptions, feature_access, usage_analytics tables. Need to consider foreign key relationships and how they interact.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Foreign key relationships: payment_schedule.couple_id -> couples.id, payment_schedule.budget_category_id -> budget_categories.id. For subscriptions: user_subscriptions.user_id -> user_profiles.id, user_subscriptions.tier_id -> subscription_tiers.id. Need to ensure data integrity and efficient queries.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});
```

#### Pattern 2: API Architecture Planning  
```typescript
// When designing comprehensive API systems
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to design API architecture for both payment management and subscription management. Payment APIs: GET /api/payments/[coupleId] (list), POST /api/payments (create), PATCH /api/payments/[id] (update status). Subscription APIs: GET /api/subscriptions/current, POST /api/subscriptions/upgrade, POST /api/subscriptions/cancel. Need consistent error handling and validation patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API security considerations: Both systems need authentication middleware, rate limiting, input validation with Zod schemas. Payment APIs need couple-level authorization. Subscription APIs need user-level authorization. All APIs need audit logging for compliance.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 3: Background Job Design
```typescript
// When implementing automated reminder and subscription systems
mcp__sequential-thinking__sequential_thinking({
  thought: "Background jobs needed: Payment reminder system (check due dates daily, send notifications), subscription renewal processing (handle Stripe webhooks, update database), usage analytics collection (daily aggregation of feature usage). Need to design job scheduling with Supabase Edge Functions and cron triggers.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Error handling for background jobs: Payment reminders need retry logic for failed email sends. Subscription webhooks need idempotency handling. Usage analytics need transaction safety. All jobs need logging and alerting for monitoring.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex backend systems require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "next api-routes server-actions validation latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions rls policies latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions cron jobs latest documentation"});
await mcp__Ref__ref_search_documentation({query: "stripe webhooks nextjs integration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "postgresql foreign-keys indexes optimization latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("POST", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Backend API architecture for payment calendar and subscription management"
2. **supabase-specialist** --think-ultra-hard --use-loaded-docs "Complex database schema design and RLS policies"
3. **postgresql-database-expert** --think-ultra-hard --database-optimization "Performance tuning for payment and subscription queries"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "API security and data protection"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Comprehensive API testing strategy"
6. **api-architect** --think-ultra-hard --design-rest-apis "RESTful API design for complex business logic"
7. **code-quality-guardian** --check-patterns --match-codebase-style "Code consistency and error handling patterns"

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns. Focus on robust, scalable backend architecture."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing API route patterns in /src/app/api/
- Understand existing authentication and authorization middleware
- Check database migration patterns and RLS policy examples
- Review existing Stripe integration patterns if any
- Study background job implementations in Edge Functions
- Continue until you FULLY understand the codebase patterns

### **PLAN PHASE (THINK ULTRA HARD!)**
- Create comprehensive database schema design for both systems
- Write detailed API specification with request/response schemas
- Plan error handling for payment operations and subscription changes
- Design background job architecture for reminders and webhooks
- Consider data validation, sanitization, and security at API level
- Don't rush - proper planning prevents critical backend issues

### **CODE PHASE (PARALLEL AGENTS!)**
- Write comprehensive API tests before implementation (TDD approach)
- Follow existing API route patterns consistently
- Use Ref MCP Supabase and Stripe examples as templates
- Implement with parallel agents for maximum efficiency
- Focus on reliability, security, and performance - not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Payment Calendar Backend (WS-165):
- [ ] Database migration creating payment_schedule table with proper indexes
- [ ] Database migration creating payment_reminders table with foreign keys
- [ ] Database migration creating payment_history table for audit trail
- [ ] API endpoint: GET /api/payments/[coupleId] (list payments with filtering)
- [ ] API endpoint: POST /api/payments (create payment with validation)
- [ ] API endpoint: PATCH /api/payments/[id] (mark as paid/update status)
- [ ] API endpoint: DELETE /api/payments/[id] (soft delete with authorization)
- [ ] Row Level Security policies for all payment tables
- [ ] Background job: Daily payment reminder checking (Edge Function)
- [ ] Integration tests for all payment API endpoints (>90% coverage)

### Pricing Strategy Backend (WS-166):
- [ ] Database migration creating subscription_tiers table with feature definitions
- [ ] Database migration creating user_subscriptions table with status tracking
- [ ] Database migration creating feature_access table for granular permissions
- [ ] Database migration creating usage_analytics table for metrics tracking
- [ ] API endpoint: GET /api/subscriptions/current (user's current subscription)
- [ ] API endpoint: POST /api/subscriptions/upgrade (handle tier changes)
- [ ] API endpoint: POST /api/subscriptions/cancel (subscription cancellation)
- [ ] API endpoint: GET /api/subscriptions/usage (usage analytics)
- [ ] Feature access middleware for API route protection
- [ ] Stripe webhook handler for subscription lifecycle events
- [ ] Background job: Daily usage analytics aggregation (Edge Function)
- [ ] Integration tests for all subscription API endpoints (>90% coverage)

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
Backend APIs must support frontend navigation requirements with proper data structure and performance optimization.

### Backend Navigation Support Requirements

**1. API Response Structure for Navigation**
```typescript
// Payment Calendar Navigation Data
interface PaymentNavigationData {
  upcoming_payments: PaymentSummary[];
  overdue_count: number;
  total_amount_due: number;
  next_payment_date: string;
  navigation_breadcrumbs: BreadcrumbItem[];
}

// Subscription Navigation Data  
interface SubscriptionNavigationData {
  current_tier: SubscriptionTier;
  feature_access: FeatureAccess[];
  usage_metrics: UsageMetrics;
  upgrade_options: UpgradeOption[];
}
```

**2. Performance Optimization for Navigation**
```typescript
// Implement caching for frequently accessed navigation data
// Use database indexes for fast navigation queries
// Optimize payment calendar queries with date range indexes
// Cache subscription feature access checks
```

**3. Real-time Navigation Updates**
```typescript
// Implement Supabase realtime subscriptions for:
// - Payment status changes
// - Subscription tier updates  
// - Feature access modifications
// - Usage limit notifications
```

**4. Mobile API Optimization**
```typescript
// Provide mobile-optimized API endpoints:
// GET /api/mobile/payments/summary (lightweight payment data)
// GET /api/mobile/subscriptions/features (minimal feature data)
// Support for offline-first navigation data caching
```

**5. Navigation Security**
```typescript
// Secure navigation data access:
// - Row Level Security for payment calendar data
// - Feature access validation middleware
// - Rate limiting for navigation API endpoints
// - Audit logging for subscription changes
```

**6. Navigation Analytics Backend**
```typescript
// Track navigation patterns:
// - Payment calendar usage analytics
// - Subscription feature access patterns
// - User journey tracking through API calls
// - Performance metrics for navigation endpoints
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Frontend component requirements and API contract expectations
- FROM Team C: Real-time notification requirements for payment reminders
- FROM Team D: Mobile API requirements and data structure preferences

### What other teams NEED from you:
- TO Team A: Payment calendar API endpoints and response schemas - Blocking their frontend implementation
- TO Team C: Subscription tier data for notification templates - Blocking their communication features
- TO Team D: Mobile-optimized API endpoints - Blocking their mobile interface development
- TO Team E: API test coverage and performance benchmarks - Blocking their testing automation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { paymentSchema, subscriptionSchema } from '@/lib/validation/schemas';

// Payment API Security
export const POST = withSecureValidation(
  paymentSchema.extend({
    couple_id: z.string().uuid(),
    amount: z.number().positive(),
    due_date: z.string().datetime(),
    category_id: z.string().uuid().optional()
  }),
  async (request: NextRequest, validatedData) => {
    // Multi-layer security validation
    const session = await getSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Couple-level authorization for payment data
    if (validatedData.couple_id !== session.user.couple_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Amount validation for realistic wedding payments
    if (validatedData.amount > 100000) {
      return NextResponse.json({ error: 'Amount exceeds maximum allowed' }, { status: 400 });
    }
    
    // Safe database operations with validated data
    const { data, error } = await supabase
      .from('payment_schedule')
      .insert({
        ...validatedData,
        created_by: session.user.id,
        status: 'upcoming'
      });
    
    if (error) {
      console.error('Payment creation failed:', error);
      return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  }
);

// Subscription API Security  
export const PATCH = withSecureValidation(
  subscriptionSchema.extend({
    new_tier_id: z.string().uuid(),
    upgrade_reason: z.string().max(500).optional()
  }),
  async (request: NextRequest, validatedData) => {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user can modify their own subscription
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .single();
    
    if (!currentSub) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }
    
    // Validate tier change is allowed
    const { data: newTier } = await supabase
      .from('subscription_tiers')
      .select('*')
      .eq('id', validatedData.new_tier_id)
      .single();
    
    if (!newTier || !newTier.active) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }
    
    // Process subscription change with transaction
    const { data, error } = await supabase.rpc('change_subscription_tier', {
      user_id: session.user.id,
      new_tier_id: validatedData.new_tier_id,
      change_reason: validatedData.upgrade_reason || 'User requested change'
    });
    
    if (error) {
      console.error('Subscription change failed:', error);
      return NextResponse.json({ error: 'Subscription change failed' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  }
);
```

### SECURITY CHECKLIST FOR EVERY API ROUTE:
- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas - see `/src/lib/validation/schemas.ts`
- [ ] **Authorization**: Verify user can access specific couple's or user's data
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY, never string concatenation
- [ ] **Rate Limiting**: Already implemented in middleware - DO NOT bypass
- [ ] **Error Handling**: NEVER expose stack traces or sensitive errors to users
- [ ] **Data Sanitization**: Sanitize all user inputs before database operations
- [ ] **Audit Logging**: Log all payment and subscription changes for compliance
- [ ] **Business Logic Validation**: Validate amounts, dates, and subscription changes are realistic

### STRIPE WEBHOOK SECURITY:
```typescript
// Verify Stripe webhook signatures
import { verifyStripeSignature } from '@/lib/stripe/webhook-verification';

export const POST = async (request: NextRequest) => {
  const signature = request.headers.get('stripe-signature');
  const body = await request.text();
  
  const isValid = verifyStripeSignature(body, signature);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process webhook safely
  const event = JSON.parse(body);
  // Handle subscription events...
};
```

---

## 🗄️ DATABASE MIGRATION PROTOCOL

**⚠️ DATABASE MIGRATION PROTOCOL:**
1. CREATE comprehensive migration files but DO NOT APPLY them
2. Migration files go to: /wedsync/supabase/migrations/[timestamp]_payment_calendar_pricing_system.sql
3. MUST send migration request to SQL Expert inbox
4. SQL Expert handles ALL migration application and conflict resolution

**Required Migrations:**
```sql
-- Payment Calendar System Tables
CREATE TABLE payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  payment_title VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  due_date TIMESTAMPTZ NOT NULL,
  status payment_status_enum NOT NULL DEFAULT 'upcoming',
  budget_category_id UUID REFERENCES budget_categories(id),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Management System Tables
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(50) NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  max_weddings INTEGER NOT NULL,
  features JSONB NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional tables: payment_reminders, user_subscriptions, feature_access, usage_analytics
```

**Add to migration request:**
```markdown
⚠️ DATABASE MIGRATIONS - COMPLEX SYSTEM:
- CREATE comprehensive migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-165-166.md
- SQL Expert will handle application, indexing, and conflict resolution
- Include both Payment Calendar and Subscription Management schemas
- Request performance optimization review for high-traffic tables
```

---

## 🎭 COMPREHENSIVE TESTING STRATEGY

### API Testing with Playwright MCP
```javascript
// 1. PAYMENT API ENDPOINT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

// Test payment creation API with comprehensive validation
const paymentTestCases = [
  {
    name: 'Valid Payment Creation',
    data: { couple_id: 'test-couple-id', payment_title: 'Venue Final Payment', amount: 5000.00, due_date: '2025-12-01' },
    expectedStatus: 201
  },
  {
    name: 'Invalid Amount - Negative',
    data: { couple_id: 'test-couple-id', payment_title: 'Invalid Payment', amount: -100.00, due_date: '2025-12-01' },
    expectedStatus: 400
  },
  {
    name: 'Invalid Date Format',
    data: { couple_id: 'test-couple-id', payment_title: 'Invalid Date', amount: 1000.00, due_date: 'invalid-date' },
    expectedStatus: 400
  },
  {
    name: 'Unauthorized Access - Wrong Couple ID',
    data: { couple_id: 'wrong-couple-id', payment_title: 'Unauthorized', amount: 1000.00, due_date: '2025-12-01' },
    expectedStatus: 403
  }
];

for (const testCase of paymentTestCases) {
  const result = await mcp__playwright__browser_evaluate({
    function: `async () => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
        body: JSON.stringify(${JSON.stringify(testCase.data)})
      });
      return { 
        status: response.status, 
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text()
      };
    }`
  });
  
  console.log(`${testCase.name}: Expected ${testCase.expectedStatus}, Got ${result.status}`);
}

// 2. SUBSCRIPTION API ENDPOINT TESTING  
const subscriptionTestCases = [
  {
    name: 'Get Current Subscription',
    method: 'GET',
    url: '/api/subscriptions/current',
    expectedStatus: 200
  },
  {
    name: 'Upgrade Subscription',
    method: 'POST',
    url: '/api/subscriptions/upgrade',
    data: { new_tier_id: 'professional-tier-id', upgrade_reason: 'Need more features' },
    expectedStatus: 200
  },
  {
    name: 'Invalid Tier Upgrade',
    method: 'POST', 
    url: '/api/subscriptions/upgrade',
    data: { new_tier_id: 'invalid-tier-id' },
    expectedStatus: 400
  }
];

for (const testCase of subscriptionTestCases) {
  const result = await mcp__playwright__browser_evaluate({
    function: `async () => {
      const options = {
        method: '${testCase.method}',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' }
      };
      if (${JSON.stringify(testCase.data)}) {
        options.body = JSON.stringify(${JSON.stringify(testCase.data)});
      }
      const response = await fetch('${testCase.url}', options);
      return { 
        status: response.status, 
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text()
      };
    }`
  });
  
  console.log(`${testCase.name}: Expected ${testCase.expectedStatus}, Got ${result.status}`);
}

// 3. BACKGROUND JOB TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test payment reminder job
    const reminderResponse = await fetch('/api/admin/jobs/payment-reminders', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    // Test usage analytics job
    const analyticsResponse = await fetch('/api/admin/jobs/usage-analytics', {
      method: 'POST', 
      headers: { 'Authorization': 'Bearer admin-token' }
    });
    
    return {
      reminderJob: { status: reminderResponse.status, ok: reminderResponse.ok },
      analyticsJob: { status: analyticsResponse.status, ok: analyticsResponse.ok }
    };
  }`
});
```

### Database Testing
```javascript
// 4. DATABASE INTEGRITY TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test RLS policies
    const unauthorizedQuery = await fetch('/api/payments/other-couple-id', {
      headers: { 'Authorization': 'Bearer test-token-couple-1' }
    });
    
    // Test foreign key constraints
    const invalidCategoryQuery = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
      body: JSON.stringify({
        couple_id: 'test-couple-id',
        payment_title: 'Test Payment',
        amount: 1000.00,
        due_date: '2025-12-01',
        budget_category_id: 'non-existent-category-id'
      })
    });
    
    return {
      rlsBlocked: unauthorizedQuery.status === 403,
      foreignKeyEnforced: invalidCategoryQuery.status === 400
    };
  }`
});
```

## 🌐 BROWSER MCP INTERACTIVE TESTING

```javascript
// BROWSER MCP - Backend API Testing through UI
// Use for end-to-end API validation through user interface

// 1. NAVIGATE TO PAYMENT MANAGEMENT
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/payments"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. TEST PAYMENT CREATION FLOW
await mcp__browsermcp__browser_click({
  element: "Add Payment button",
  ref: snapshot.querySelector('[data-testid="add-payment-btn"]')
});

await mcp__browsermcp__browser_fill_form({
  fields: [
    {
      name: "Payment Title",
      type: "textbox", 
      ref: snapshot.querySelector('input[name="payment_title"]'),
      value: "Venue Final Payment"
    },
    {
      name: "Amount",
      type: "textbox",
      ref: snapshot.querySelector('input[name="amount"]'),
      value: "5000.00"
    },
    {
      name: "Due Date",
      type: "textbox", 
      ref: snapshot.querySelector('input[name="due_date"]'),
      value: "2025-12-01"
    }
  ]
});

await mcp__browsermcp__browser_click({
  element: "Save Payment button",
  ref: snapshot.querySelector('[data-testid="save-payment-btn"]')
});

// 3. VERIFY API RESPONSE IN UI
await mcp__browsermcp__browser_wait_for({text: "Payment saved successfully"});
const paymentList = await mcp__browsermcp__browser_snapshot();
const paymentExists = paymentList.textContent.includes("Venue Final Payment");

// 4. TEST SUBSCRIPTION MANAGEMENT
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/billing"});
await mcp__browsermcp__browser_click({
  element: "Upgrade Plan button",
  ref: paymentList.querySelector('[data-testid="upgrade-btn"]')
});

// 5. MONITOR NETWORK REQUESTS
const networkRequests = await mcp__browsermcp__browser_network_requests();
const apiCalls = networkRequests.filter(req => req.url.includes('/api/'));

// 6. CHECK FOR JAVASCRIPT ERRORS
const consoleLogs = await mcp__browsermcp__browser_console_messages();
const hasErrors = consoleLogs.some(log => log.level === 'error');

console.log('API Integration Results:', {
  paymentCreated: paymentExists,
  apiCallsCount: apiCalls.length,
  hasJSErrors: hasErrors
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Payment Calendar Backend:
- [ ] All payment database tables created with proper relationships and indexes
- [ ] All payment API endpoints working with comprehensive validation (>95% test coverage)
- [ ] Row Level Security policies protecting payment data across couple boundaries
- [ ] Background payment reminder system implemented and tested
- [ ] Payment status tracking logic handles all edge cases (due dates, overdue, cancellations)
- [ ] Integration with budget categories working seamlessly
- [ ] API performance meets targets (<150ms average response time)

### Pricing Strategy Backend:
- [ ] All subscription database tables created with feature access management
- [ ] All subscription API endpoints working with tier validation (>95% test coverage)
- [ ] Feature access middleware protecting API routes based on subscription tiers
- [ ] Stripe webhook integration handling all subscription lifecycle events
- [ ] Usage analytics system collecting and aggregating feature usage data
- [ ] Subscription change workflows (upgrade/downgrade/cancel) fully tested
- [ ] Background jobs for subscription processing working reliably

### Integration & Performance:
- [ ] Both systems integrate seamlessly with existing user authentication
- [ ] Database queries optimized with proper indexes for high-traffic operations
- [ ] All API routes have comprehensive error handling with meaningful user feedback
- [ ] Security validation working on all endpoints (authentication, authorization, input validation)
- [ ] Background jobs have retry logic and error alerting
- [ ] Zero TypeScript errors across all new backend code
- [ ] Zero console errors in development and testing environments

### Testing & Documentation:
- [ ] API integration tests covering success and failure scenarios (>90% coverage)
- [ ] Database integrity tests validating RLS policies and foreign key constraints
- [ ] Performance tests confirming API response times under load
- [ ] Security tests validating authentication and authorization rules
- [ ] Background job tests confirming reliable operation
- [ ] API documentation generated and reviewed for accuracy

---

## 💾 WHERE TO SAVE YOUR WORK

### Payment Calendar Backend:
- API Routes: `/wedsync/src/app/api/payments/route.ts`
- API Routes: `/wedsync/src/app/api/payments/[id]/route.ts`
- API Routes: `/wedsync/src/app/api/payments/[coupleId]/route.ts`
- Background Jobs: `/wedsync/src/app/api/admin/jobs/payment-reminders/route.ts`
- Tests: `/wedsync/tests/api/payments.test.ts`
- Types: `/wedsync/src/types/payments.ts`

### Pricing Strategy Backend:
- API Routes: `/wedsync/src/app/api/subscriptions/current/route.ts`
- API Routes: `/wedsync/src/app/api/subscriptions/upgrade/route.ts`
- API Routes: `/wedsync/src/app/api/subscriptions/cancel/route.ts`
- API Routes: `/wedsync/src/app/api/webhooks/stripe/route.ts`
- Middleware: `/wedsync/src/middleware/feature-access.ts`
- Background Jobs: `/wedsync/src/app/api/admin/jobs/usage-analytics/route.ts`
- Tests: `/wedsync/tests/api/subscriptions.test.ts`
- Types: `/wedsync/src/types/subscriptions.ts`

### Database:
- Migrations: `/wedsync/supabase/migrations/[timestamp]_payment_calendar_pricing_system.sql`
- Functions: `/wedsync/supabase/functions/payment-reminders/index.ts`
- Functions: `/wedsync/supabase/functions/usage-analytics/index.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch19/WS-165-166-team-b-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip comprehensive testing - backend reliability is critical
- Do NOT ignore security requirements - payment and subscription data is sensitive  
- Do NOT claim completion without evidence of working API endpoints
- Do NOT apply database migrations yourself - use SQL Expert protocol
- REMEMBER: All 5 teams work in PARALLEL - your APIs are blocking other teams
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY