# TEAM B - ROUND 1: WS-291 - Revenue Model System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build secure subscription management API endpoints, revenue analytics engine, and usage tracking system with comprehensive Stripe integration
**FEATURE ID:** WS-291 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about subscription billing security, idempotency, and revenue calculation accuracy

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/billing/
cat $WS_ROOT/wedsync/src/lib/revenue/pricing-engine.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test revenue billing
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing billing and subscription patterns
await mcp__serena__search_for_pattern("subscription stripe billing API");
await mcp__serena__find_symbol("SubscriptionManager billingService", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/billing/");
```

### B. ANALYZE EXISTING BILLING PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing Stripe integration
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/billing/subscription-manager.ts");
await mcp__serena__find_referencing_symbols("stripe webhook");
await mcp__serena__search_for_pattern("payment webhook handler");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Stripe subscriptions Node.js webhooks"
# - "Supabase row-level-security billing"
# - "Next.js API route validation middleware"
# - "Zod schema validation patterns"
```

### D. SECURITY PATTERN ANALYSIS (MINUTES 5-10)
```typescript
// CRITICAL: Find existing security patterns
await mcp__serena__find_symbol("withSecureValidation secureStringSchema", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: API Security & Revenue Architecture Analysis
```typescript
// Before implementing subscription APIs
mcp__sequential-thinking__sequential_thinking({
  thought: "Revenue model APIs need: POST /api/billing/subscribe (create subscription), PUT /api/billing/subscription/:id/upgrade (tier changes), GET /api/billing/usage/:userId (usage tracking), GET /api/revenue/metrics (MRR analytics), POST /api/billing/webhook (Stripe events). Each handles different security requirements and data sensitivities.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security complexity analysis: Subscription creation involves payment processing (PCI concerns), usage tracking contains business metrics (privacy), revenue analytics expose financial data (admin-only), webhook handling requires signature validation (security critical). All need authentication, validation, rate limiting, and audit logging.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Revenue calculation requirements: MRR calculated from active subscriptions, churn rate from canceled vs total, LTV from subscription length x monthly value, unit economics from marketing spend. Must handle prorations, discounts, failed payments, and multiple billing periods accurately.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use withSecureValidation for all endpoints, implement Stripe webhook idempotency, create revenue calculation cron jobs, add comprehensive error handling for payment failures, build usage tracking middleware, ensure database transactions for billing operations.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Break down API endpoints, track database dependencies
2. **supabase-specialist** - Use Serena to ensure billing table security and RLS policies
3. **security-compliance-officer** - Ensure all billing APIs have proper validation and authentication
4. **code-quality-guardian** - Ensure API patterns match existing Stripe integration
5. **test-automation-architect** - Write comprehensive tests for billing edge cases
6. **documentation-chronicler** - Document revenue calculation logic and API security

## 🔒 CRITICAL: SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### EVERY API ROUTE MUST HAVE:

1. **INPUT VALIDATION WITH ZOD:**
```typescript
// ❌ NEVER DO THIS (BILLING IS CRITICAL!):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  // Direct billing operations with unvalidated data = DISASTER
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { billingSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const subscriptionSchema = z.object({
  tier_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'annual']),
  payment_method_id: z.string().min(1),
  user_id: z.string().uuid()
});

export const POST = withSecureValidation(
  subscriptionSchema,
  async (request, validatedData) => {
    // All billing data is now validated and type-safe
  }
);
```

2. **STRIPE WEBHOOK SECURITY:**
```typescript
// CRITICAL: Verify Stripe webhook signatures
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Handle verified webhook event
}
```

3. **AUTHENTICATION ON ALL BILLING ROUTES:**
```typescript
// MANDATORY for all billing operations:
const session = await getServerSession(authOptions);
if (!session) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

// Admin-only for revenue analytics
if (request.url.includes('/revenue/metrics')) {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();
    
  if (user?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
}
```

## 🎯 TECHNICAL SPECIFICATION: WS-291 REVENUE MODEL

### **API ENDPOINTS TO BUILD:**

#### 1. **Subscription Management APIs**
```typescript
// POST /api/billing/subscribe - Create new subscription
// Security: Authentication + validation + rate limiting
const subscribeSchema = z.object({
  tier_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'annual']),
  payment_method_id: z.string().min(1)
});

// PUT /api/billing/subscription/:id/upgrade - Upgrade/downgrade
const upgradeSchema = z.object({
  new_tier_id: z.string().uuid(),
  prorate: z.boolean().default(true)
});

// GET /api/billing/subscription/:userId - Get user subscription
// Returns: current tier, billing period, next billing date, status

// POST /api/billing/subscription/:id/cancel - Cancel subscription
const cancelSchema = z.object({
  reason: z.enum(['too_expensive', 'missing_features', 'switching_providers', 'other']),
  feedback: z.string().max(500).optional()
});
```

#### 2. **Usage Tracking APIs**
```typescript
// GET /api/billing/usage/:userId - Current usage vs limits
// Returns: forms_created, logins_this_month, clients_managed, limits

// POST /api/billing/usage/track - Track feature usage (internal)
const usageTrackSchema = z.object({
  user_id: z.string().uuid(),
  feature: z.enum(['form_created', 'login', 'client_added', 'invitation_sent']),
  count: z.number().min(1).default(1)
});

// GET /api/billing/usage/triggers/:userId - Check upgrade triggers
// Returns: array of upgrade recommendations based on usage patterns
```

#### 3. **Revenue Analytics APIs (Admin Only)**
```typescript
// GET /api/revenue/metrics - MRR, ARR, user growth, churn
// Query params: period (7d, 30d, 90d, 1y), tier (optional filter)

// GET /api/revenue/unit-economics - LTV, CAC, payback period
// Returns: blended metrics + per-tier breakdown

// GET /api/revenue/churn-analysis - Churn prevention insights
// Returns: at-risk users, churn reasons, retention opportunities
```

#### 4. **Stripe Webhook Handler**
```typescript
// POST /api/webhooks/stripe - Handle subscription events
// Events: customer.subscription.created, updated, deleted
//         invoice.payment_succeeded, payment_failed
//         customer.subscription.trial_will_end

// CRITICAL: Implement idempotency for webhook processing
```

### **SERVICE LAYER IMPLEMENTATION:**

#### 1. **RevenueEngine Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/revenue/pricing-engine.ts
export class RevenueEngine {
  async calculateMRR(date: Date = new Date()): Promise<number> {
    // Query active subscriptions, sum monthly recurring revenue
    // Handle annual subscriptions (divide by 12)
    // Account for prorations and discounts
  }
  
  async calculateChurnRate(period: 'monthly' | 'quarterly'): Promise<number> {
    // Calculate cancellations / total active users
    // Exclude trial cancellations
    // Weight by subscription value
  }
  
  async calculateUnitEconomics(): Promise<UnitEconomics> {
    // LTV = Average monthly revenue / churn rate
    // CAC from marketing spend data
    // Payback period = CAC / average monthly revenue
  }
}
```

#### 2. **SubscriptionManager Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/revenue/subscription-manager.ts
export class SubscriptionManager {
  async createSubscription(userId: string, tierData: CreateSubscriptionRequest) {
    // 1. Validate user doesn't have active subscription
    // 2. Get/create Stripe customer
    // 3. Create Stripe subscription
    // 4. Store in database with transaction
    // 5. Update user tier and permissions
    // 6. Send confirmation email
  }
  
  async upgradeSubscription(subscriptionId: string, newTierId: string) {
    // 1. Validate subscription belongs to user
    // 2. Calculate proration
    // 3. Update Stripe subscription
    // 4. Update database
    // 5. Log upgrade event for analytics
  }
  
  async checkUpgradeTriggers(userId: string): Promise<UpgradeTrigger[]> {
    // Analyze usage patterns and recommend upgrades
    // Free tier: forms_created >= 1 → recommend Starter
    // Starter tier: clients_managed > 20 → recommend Professional
  }
}
```

#### 3. **ChurnPreventionEngine Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/revenue/churn-prevention.ts
export class ChurnPreventionEngine {
  async assessChurnRisk(userId: string): Promise<number> {
    // Analyze user activity patterns
    // Low login frequency = higher risk
    // Low feature usage = higher risk
    // Support tickets = moderate risk
    // Return risk score 0-1
  }
  
  async triggerRetentionAction(userId: string, riskScore: number) {
    // High risk (>0.7): Personal outreach + discount offer
    // Medium risk (>0.4): Re-engagement email campaign
    // Low risk (>0.2): Usage tips and best practices
  }
}
```

### **DATABASE OPERATIONS:**

```typescript
// CRITICAL: All billing operations must use database transactions
await supabase.rpc('create_subscription_transaction', {
  p_user_id: userId,
  p_tier_id: tierId,
  p_stripe_subscription_id: stripeSubscriptionId,
  p_billing_period: billingPeriod
});

// Usage tracking with conflict resolution
await supabase.rpc('increment_usage', {
  p_user_id: userId,
  p_feature: 'form_created',
  p_period_start: startOfMonth
});

// Revenue metrics calculation (scheduled job)
await supabase.rpc('calculate_mrr_snapshot', {
  p_date: new Date().toISOString().split('T')[0]
});
```

## 🎭 TESTING REQUIREMENTS

### Unit Tests Required:
```typescript
describe('RevenueEngine', () => {
  test('calculates MRR correctly with mixed billing periods', () => {
    // Test monthly + annual subscriptions
    // Test prorations and discounts
  });
  
  test('handles failed payment scenarios', () => {
    // Test subscription status updates
    // Test retry logic for failed charges
  });
  
  test('churn calculation excludes trial users', () => {
    // Test churn rate accuracy
  });
});

describe('SubscriptionManager', () => {
  test('prevents duplicate subscriptions', () => {
    // Test concurrent subscription creation
  });
  
  test('handles Stripe webhook failures gracefully', () => {
    // Test webhook retry logic
    // Test idempotency
  });
});
```

### Integration Tests Required:
```typescript
// Test complete subscription flow
test('subscription creation flow', async () => {
  // Create user → subscribe → verify Stripe → check database
});

// Test webhook processing
test('Stripe webhook handling', async () => {
  // Send webhook → verify processing → check side effects
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Subscription APIs**: Create, upgrade, cancel, retrieve
- [ ] **Usage Tracking**: Real-time feature usage monitoring
- [ ] **Revenue Analytics**: MRR calculation and reporting
- [ ] **Stripe Integration**: Webhook handling with idempotency
- [ ] **Security Implementation**: All routes properly validated
- [ ] **Database Schema**: Subscription tables with proper indexes
- [ ] **Service Layer**: RevenueEngine and SubscriptionManager
- [ ] **Unit Tests**: >90% coverage for billing logic

## 💾 WHERE TO SAVE YOUR WORK

- **API Routes**: `$WS_ROOT/wedsync/src/app/api/billing/`
- **Services**: `$WS_ROOT/wedsync/src/lib/revenue/`
- **Types**: `$WS_ROOT/wedsync/src/types/billing.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/api/billing/`
- **Database**: `$WS_ROOT/wedsync/supabase/migrations/`

## ⚠️ CRITICAL WARNINGS

- **NEVER store payment data** - Use Stripe customer IDs only
- **ALL webhook events must be idempotent** - Use Stripe event IDs
- **Database transactions required** - Billing operations are critical
- **Comprehensive error handling** - Payment failures cannot crash app
- **Audit logging mandatory** - All billing changes must be logged

## 🏁 COMPLETION CHECKLIST

### Security Verification:
```bash
# Verify ALL API routes have validation
grep -r "withSecureValidation" $WS_ROOT/wedsync/src/app/api/billing/
# Should show validation on EVERY route.ts file

# Check for unvalidated request.json() (FORBIDDEN!)
grep -r "request\.json()" $WS_ROOT/wedsync/src/app/api/billing/
# Should return NOTHING (all should be validated)

# Verify Stripe webhook security
grep -r "webhooks.constructEvent" $WS_ROOT/wedsync/src/app/api/webhooks/
# Should show signature verification
```

### Final Technical Checklist:
- [ ] All API routes use withSecureValidation
- [ ] Stripe webhooks verify signatures
- [ ] Database operations use transactions
- [ ] Revenue calculations are accurate
- [ ] Error handling doesn't leak sensitive data
- [ ] Authentication verified on protected routes
- [ ] Rate limiting applied to public endpoints
- [ ] TypeScript compiles with NO errors
- [ ] Tests pass including edge cases

---

**EXECUTE IMMEDIATELY - Build bulletproof subscription billing system with comprehensive security!**