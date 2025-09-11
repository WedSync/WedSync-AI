# TEAM C - ROUND 1: WS-291 - Revenue Model System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build Stripe payment integration, webhook processing system, and external service connections for subscription billing and revenue analytics
**FEATURE ID:** WS-291 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about payment processing reliability, webhook idempotency, and third-party service failure handling

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/stripe/
cat $WS_ROOT/wedsync/src/app/api/webhooks/stripe/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integration stripe
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

// Query existing integration patterns
await mcp__serena__search_for_pattern("stripe webhook integration third-party");
await mcp__serena__find_symbol("stripe webhook handler", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. ANALYZE EXISTING INTEGRATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing Stripe integration
await mcp__serena__read_file("$WS_ROOT/wedsync/src/app/api/stripe/webhook/route.ts");
await mcp__serena__find_referencing_symbols("stripe payment integration");
await mcp__serena__search_for_pattern("external service error handling");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Stripe webhooks Node.js event-handling"
# - "Stripe subscription management"
# - "Next.js API webhook-security"
# - "Error handling external-services"
```

### D. INTEGRATION HEALTH MONITORING (MINUTES 5-10)
```typescript
// Find existing monitoring patterns
await mcp__serena__find_symbol("healthCheck monitoring integration", "", true);
await mcp__serena__search_for_pattern("circuit breaker retry logic");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Integration Analysis
```typescript
// Before building payment integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Revenue model integrations need: Stripe subscription creation/management, webhook event processing for billing updates, email notifications for subscription changes, analytics service integration for MRR tracking, CRM integration for customer lifecycle, and external reporting systems. Each has different failure modes and recovery requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Stripe webhooks must be idempotent (duplicate events), subscription changes trigger multiple downstream effects, payment failures need graceful degradation, external analytics require data transformation, email notifications have rate limits, webhook delivery can fail requiring retry logic.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Stripe API goes down during subscription creation, webhook endpoint receives duplicate events, email service rate limits during high-volume periods, analytics service becomes unavailable during revenue calculations, database connection fails during webhook processing. Need circuit breakers, retry logic, and graceful degradation.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Use event-driven pattern with message queues for webhook processing, implement idempotency keys for all Stripe operations, create integration health monitoring dashboard, build fallback mechanisms for critical paths, maintain comprehensive audit logs for payment events.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Track integration dependencies and failure modes
2. **integration-specialist** - Use Serena to analyze existing payment integration patterns
3. **security-compliance-officer** - Ensure webhook security and payment data protection
4. **code-quality-guardian** - Ensure integration patterns match existing implementations
5. **test-automation-architect** - Build comprehensive integration tests for failure scenarios
6. **documentation-chronicler** - Document integration flows and troubleshooting guides

## 🎯 TECHNICAL SPECIFICATION: WS-291 INTEGRATION REQUIREMENTS

### **STRIPE INTEGRATION ARCHITECTURE:**

#### 1. **Subscription Management Integration**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/stripe/subscription-service.ts
export class StripeSubscriptionService {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  async createSubscription(params: CreateSubscriptionParams): Promise<Stripe.Subscription> {
    try {
      // 1. Get or create Stripe customer
      let customer = await this.getOrCreateCustomer(params.userId, params.email);
      
      // 2. Attach payment method to customer
      await this.stripe.paymentMethods.attach(params.paymentMethodId, {
        customer: customer.id,
      });
      
      // 3. Set as default payment method
      await this.stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: params.paymentMethodId },
      });
      
      // 4. Create subscription with idempotency key
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: params.priceId }],
        metadata: {
          user_id: params.userId,
          tier_name: params.tierName,
        },
        // CRITICAL: Idempotency prevents duplicate subscriptions
      }, {
        idempotencyKey: `sub_create_${params.userId}_${Date.now()}`
      });
      
      return subscription;
    } catch (error) {
      // Enhanced error handling with context
      throw new StripeIntegrationError('Subscription creation failed', {
        userId: params.userId,
        tierName: params.tierName,
        originalError: error
      });
    }
  }
  
  async upgradeSubscription(subscriptionId: string, newPriceId: string) {
    // Handle subscription modifications with proration
    // Use idempotency for upgrade operations
    // Validate user permissions before upgrade
  }
  
  async cancelSubscription(subscriptionId: string, reason?: string) {
    // Implement immediate vs end-of-period cancellation
    // Store cancellation reason for churn analysis
    // Trigger retention workflows
  }
}
```

#### 2. **Webhook Event Processing System**
```typescript
// Location: $WS_ROOT/wedsync/src/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  
  let event: Stripe.Event;
  
  try {
    // CRITICAL: Always verify webhook signatures
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // CRITICAL: Implement idempotency for webhook processing
  const existingEvent = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();
    
  if (existingEvent.data) {
    console.log(`Webhook event ${event.id} already processed`);
    return NextResponse.json({ received: true });
  }
  
  // Process event based on type
  try {
    await processWebhookEvent(event);
    
    // Log successful processing
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      status: 'processed'
    });
    
    return NextResponse.json({ received: true });
  } catch (error) {
    // Log failed processing for retry
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      status: 'failed',
      error_message: error.message
    });
    
    // Return 500 to trigger Stripe retry
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
      
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}
```

#### 3. **Subscription Lifecycle Handlers**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/stripe/webhook-handlers.ts
export async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  const tierName = subscription.metadata.tier_name;
  
  // Database transaction for subscription activation
  await supabase.rpc('activate_user_subscription', {
    p_user_id: userId,
    p_stripe_subscription_id: subscription.id,
    p_tier_name: tierName,
    p_current_period_start: new Date(subscription.current_period_start * 1000),
    p_current_period_end: new Date(subscription.current_period_end * 1000),
    p_status: subscription.status
  });
  
  // Trigger downstream integrations
  await Promise.allSettled([
    // Send welcome email
    emailService.sendSubscriptionWelcome(userId, tierName),
    
    // Update analytics
    analyticsService.trackSubscriptionCreated(userId, tierName),
    
    // Update user permissions
    updateUserTierPermissions(userId, tierName),
    
    // Notify team (for high-value subscriptions)
    notifyTeamIfHighValue(subscription)
  ]);
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  const customerId = invoice.customer as string;
  
  // Get user information
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('user_id, tier_name')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
    
  if (!subscription) return;
  
  // Implement dunning management
  const failureCount = await getPaymentFailureCount(customerId);
  
  if (failureCount === 1) {
    // First failure: Friendly reminder
    await emailService.sendPaymentReminder(subscription.user_id);
  } else if (failureCount === 2) {
    // Second failure: Update payment method request
    await emailService.sendPaymentUpdateRequest(subscription.user_id);
  } else if (failureCount >= 3) {
    // Third failure: Account suspension warning
    await emailService.sendAccountSuspensionWarning(subscription.user_id);
    
    // Optionally suspend non-critical features
    await suspendNonCriticalFeatures(subscription.user_id);
  }
}
```

### **EXTERNAL SERVICE INTEGRATIONS:**

#### 1. **Email Service Integration (Resend)**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/email/billing-notifications.ts
export class BillingEmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);
  
  async sendSubscriptionWelcome(userId: string, tierName: string) {
    try {
      const user = await this.getUserDetails(userId);
      
      await this.resend.emails.send({
        from: 'billing@wedsync.com',
        to: user.email,
        subject: `Welcome to WedSync ${tierName.charAt(0).toUpperCase() + tierName.slice(1)}!`,
        html: await this.renderWelcomeTemplate(user, tierName)
      });
      
      // Log successful email
      await this.logEmailEvent(userId, 'subscription_welcome', 'sent');
    } catch (error) {
      // Log failed email for retry
      await this.logEmailEvent(userId, 'subscription_welcome', 'failed', error.message);
      throw error;
    }
  }
  
  async sendUpgradeNotification(userId: string, fromTier: string, toTier: string) {
    // Implementation for tier upgrade notifications
  }
  
  async sendPaymentReminder(userId: string) {
    // Dunning management email sequence
  }
}
```

#### 2. **Analytics Integration**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/analytics/revenue-tracking.ts
export class RevenueAnalyticsIntegration {
  async trackSubscriptionEvent(eventType: string, data: any) {
    try {
      // Internal analytics
      await this.recordInternalEvent(eventType, data);
      
      // External analytics (if configured)
      if (process.env.MIXPANEL_TOKEN) {
        await this.sendToMixpanel(eventType, data);
      }
      
      if (process.env.AMPLITUDE_API_KEY) {
        await this.sendToAmplitude(eventType, data);
      }
    } catch (error) {
      // Don't fail subscription operations if analytics fail
      console.error('Analytics tracking failed:', error);
    }
  }
  
  async updateMRRMetrics() {
    // Calculate and store MRR snapshots
    // Integrate with business intelligence tools
  }
}
```

### **INTEGRATION HEALTH MONITORING:**

#### 1. **Circuit Breaker Pattern**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/circuit-breaker.ts
export class IntegrationCircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, Date>();
  
  async execute<T>(
    serviceName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.isCircuitOpen(serviceName)) {
      console.warn(`Circuit breaker open for ${serviceName}, using fallback`);
      
      if (fallback) {
        return await fallback();
      }
      
      throw new Error(`Service ${serviceName} is currently unavailable`);
    }
    
    try {
      const result = await operation();
      this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordFailure(serviceName);
      throw error;
    }
  }
  
  private isCircuitOpen(serviceName: string): boolean {
    const failures = this.failures.get(serviceName) || 0;
    const lastFailure = this.lastFailure.get(serviceName);
    
    if (failures >= 5 && lastFailure) {
      const timeSinceLastFailure = Date.now() - lastFailure.getTime();
      return timeSinceLastFailure < 60000; // 1 minute circuit breaker
    }
    
    return false;
  }
}
```

#### 2. **Integration Health Dashboard**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/health-monitor.ts
export class IntegrationHealthMonitor {
  async checkStripeHealth(): Promise<HealthStatus> {
    try {
      await stripe.customers.list({ limit: 1 });
      return { service: 'stripe', status: 'healthy', responseTime: Date.now() };
    } catch (error) {
      return { service: 'stripe', status: 'unhealthy', error: error.message };
    }
  }
  
  async checkEmailServiceHealth(): Promise<HealthStatus> {
    // Test email service connectivity
  }
  
  async generateHealthReport(): Promise<IntegrationHealthReport> {
    const checks = await Promise.allSettled([
      this.checkStripeHealth(),
      this.checkEmailServiceHealth(),
      this.checkAnalyticsHealth()
    ]);
    
    return {
      timestamp: new Date(),
      services: checks.map(result => 
        result.status === 'fulfilled' ? result.value : { status: 'error' }
      )
    };
  }
}
```

## 🎭 INTEGRATION TESTING REQUIREMENTS

### Stripe Integration Tests:
```typescript
describe('Stripe Subscription Integration', () => {
  test('creates subscription with idempotency', async () => {
    const params = { userId: 'test', email: 'test@example.com', priceId: 'price_123' };
    
    // First call should create subscription
    const sub1 = await stripeService.createSubscription(params);
    
    // Duplicate call should return existing subscription
    const sub2 = await stripeService.createSubscription(params);
    
    expect(sub1.id).toBe(sub2.id);
  });
  
  test('handles webhook events idempotently', async () => {
    const mockEvent = { id: 'evt_123', type: 'customer.subscription.created' };
    
    // Process event twice
    await webhookHandler.processEvent(mockEvent);
    await webhookHandler.processEvent(mockEvent);
    
    // Should only create one database record
    const records = await getWebhookEventRecords('evt_123');
    expect(records.length).toBe(1);
  });
});

describe('Integration Resilience', () => {
  test('circuit breaker opens after failures', async () => {
    const breaker = new IntegrationCircuitBreaker();
    
    // Simulate failures
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute('test-service', () => Promise.reject(new Error('Test')));
      } catch {}
    }
    
    // Circuit should now be open
    await expect(
      breaker.execute('test-service', () => Promise.resolve('success'))
    ).rejects.toThrow('currently unavailable');
  });
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Stripe Integration**: Subscription CRUD with idempotency
- [ ] **Webhook Processing**: Event handling with duplicate prevention
- [ ] **Email Notifications**: Billing lifecycle emails via Resend
- [ ] **Analytics Integration**: Revenue event tracking
- [ ] **Circuit Breakers**: Resilient external service calls
- [ ] **Health Monitoring**: Integration status dashboard
- [ ] **Error Handling**: Comprehensive failure recovery
- [ ] **Integration Tests**: End-to-end payment flow testing

## 💾 WHERE TO SAVE YOUR WORK

- **Integrations**: `$WS_ROOT/wedsync/src/lib/integrations/`
- **Webhooks**: `$WS_ROOT/wedsync/src/app/api/webhooks/`
- **Types**: `$WS_ROOT/wedsync/src/types/integrations.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/integrations/`
- **Config**: `$WS_ROOT/wedsync/src/config/integrations.ts`

## ⚠️ CRITICAL WARNINGS

- **NEVER skip webhook signature verification** - Security critical
- **ALL webhook processing must be idempotent** - Stripe retries events
- **Implement comprehensive error handling** - Payment failures must be graceful
- **Circuit breakers required** - Protect against cascade failures
- **Test failure scenarios extensively** - Integration points are fragile

## 🏁 COMPLETION CHECKLIST

### Integration Security Verification:
- [ ] Webhook signatures verified on all endpoints
- [ ] Idempotency implemented for all operations
- [ ] Circuit breakers protect critical paths
- [ ] Sensitive data never logged
- [ ] Error messages don't leak system details

### Resilience Testing:
- [ ] Integration works under network failures
- [ ] Duplicate webhook events handled correctly
- [ ] External service failures don't break core functionality
- [ ] Health monitoring detects issues accurately
- [ ] Recovery mechanisms tested and documented

---

**EXECUTE IMMEDIATELY - Build bulletproof payment integrations with comprehensive failure handling!**