# TEAM B - ROUND 1: WS-316 - Billing Settings Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build secure billing backend with subscription management, usage tracking, and Stripe payment processing
**FEATURE ID:** WS-316 (Track all work with this ID)

## 🚨 EVIDENCE REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/app/api/billing/
npx supabase migration up --linked  # Migration successful
npm run typecheck  # No errors
npm test api/billing  # All API tests passing
```

## 🎯 BILLING BACKEND FOCUS
- **Subscription Management API:** Handle plan changes, trials, and billing cycles
- **Usage Tracking System:** Real-time monitoring of client, form, email, storage quotas
- **Stripe Integration Layer:** Secure payment processing and webhook handling
- **Billing History Management:** Invoice generation, payment records, and receipt handling
- **Usage Alert Engine:** Automated notifications for approaching limits
- **Billing Analytics:** Revenue tracking, churn prevention, and usage insights

## 📊 DATABASE SCHEMA
```sql
-- WS-316 Billing System Schema
CREATE TABLE billing_settings (
  supplier_id UUID PRIMARY KEY REFERENCES user_profiles(id),
  subscription_tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  trial_ends_at TIMESTAMPTZ,
  subscription_status VARCHAR(50) DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  auto_billing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  resource_type VARCHAR(50) NOT NULL, -- 'clients', 'forms', 'emails', 'storage'
  current_usage INTEGER DEFAULT 0,
  usage_limit INTEGER,
  unlimited BOOLEAN DEFAULT FALSE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  stripe_invoice_id VARCHAR(255) UNIQUE,
  amount_total INTEGER NOT NULL, -- Amount in pence/cents
  currency VARCHAR(3) DEFAULT 'GBP',
  status VARCHAR(50) NOT NULL,
  invoice_pdf_url VARCHAR(500),
  billing_reason VARCHAR(100),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  alert_type VARCHAR(50) NOT NULL, -- 'usage_warning', 'limit_exceeded', 'upgrade_recommended'
  resource_type VARCHAR(50) NOT NULL,
  threshold_percentage INTEGER NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES user_profiles(id),
  stripe_payment_method_id VARCHAR(255) NOT NULL,
  card_brand VARCHAR(20),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_billing_settings_stripe ON billing_settings(stripe_customer_id);
CREATE INDEX idx_usage_tracking_supplier ON usage_tracking(supplier_id, resource_type);
CREATE INDEX idx_billing_history_supplier ON billing_history(supplier_id, created_at DESC);
CREATE INDEX idx_usage_alerts_supplier ON usage_alerts(supplier_id, resolved_at) WHERE resolved_at IS NULL;
```

## 🎯 API ENDPOINTS STRUCTURE
- `GET/PUT /api/billing/subscription` - Subscription management
- `GET /api/billing/usage` - Current usage metrics
- `GET /api/billing/history` - Billing and payment history
- `POST /api/billing/upgrade` - Plan upgrade processing
- `POST /api/billing/downgrade` - Plan downgrade scheduling
- `GET/POST/DELETE /api/billing/payment-methods` - Payment method management
- `POST /api/billing/webhooks/stripe` - Stripe webhook handler
- `GET /api/billing/invoices/[id]` - Invoice download
- `POST /api/billing/usage/track` - Usage increment tracking

## 🛡️ CRITICAL SECURITY REQUIREMENTS

### Payment Security (PCI DSS Compliance)
- [ ] All payment data processed via Stripe (no card storage)
- [ ] Secure webhook signature verification
- [ ] API key encryption and rotation
- [ ] TLS 1.2+ for all payment communications
- [ ] Idempotency keys for payment operations

### Authentication & Authorization
- [ ] withSecureValidation on all billing endpoints
- [ ] Supplier-scoped data access enforcement
- [ ] Multi-factor authentication for billing changes
- [ ] Session validation for payment method updates
- [ ] Admin override capabilities with audit logging

### Data Protection
- [ ] Billing data encryption at rest
- [ ] Secure handling of Stripe customer IDs
- [ ] GDPR-compliant data retention policies
- [ ] Automatic PII anonymization
- [ ] Audit trails for all billing operations

## 💾 REQUIRED FILES TO CREATE
```
$WS_ROOT/wedsync/src/app/api/billing/
├── subscription/
│   └── route.ts                     # Subscription CRUD operations
├── usage/
│   ├── route.ts                     # Usage metrics API
│   └── track/route.ts               # Usage increment tracking
├── history/
│   └── route.ts                     # Billing history API
├── upgrade/
│   └── route.ts                     # Plan upgrade handling
├── downgrade/
│   └── route.ts                     # Plan downgrade processing
├── payment-methods/
│   └── route.ts                     # Payment method management
├── webhooks/
│   └── stripe/route.ts              # Stripe webhook handler
├── invoices/
│   └── [id]/route.ts                # Invoice download
└── alerts/
    └── route.ts                     # Usage alert management

$WS_ROOT/wedsync/src/lib/billing/
├── stripeService.ts                 # Stripe API integration
├── subscriptionManager.ts           # Subscription logic
├── usageTracker.ts                  # Usage monitoring
├── billingCalculator.ts             # Pricing and prorations
├── webhookHandler.ts                # Stripe webhook processing
├── alertEngine.ts                   # Usage alert generation
├── invoiceGenerator.ts              # PDF invoice creation
└── __tests__/
    ├── stripeService.test.ts
    ├── subscriptionManager.test.ts
    ├── usageTracker.test.ts
    └── webhookHandler.test.ts

$WS_ROOT/wedsync/supabase/migrations/
└── 61_billing_system.sql            # Database migration
```

## 🔧 IMPLEMENTATION DETAILS

### Subscription Management Service
```typescript
export class SubscriptionManager {
  async upgradeSubscription(
    supplierId: string,
    newTier: SubscriptionTier,
    paymentMethodId?: string
  ): Promise<SubscriptionResult> {
    // Validate upgrade eligibility
    // Calculate prorated amounts
    // Update Stripe subscription
    // Update database billing_settings
    // Trigger usage limit updates
    // Send confirmation notifications
  }

  async handleDowngrade(
    supplierId: string,
    newTier: SubscriptionTier,
    effectiveDate: Date
  ): Promise<void> {
    // Schedule downgrade at period end
    // Update billing settings with pending changes
    // Notify user of downgrade schedule
    // Set up data retention warnings if needed
  }
}
```

### Usage Tracking System
```typescript
export class UsageTracker {
  async incrementUsage(
    supplierId: string,
    resourceType: ResourceType,
    amount: number = 1
  ): Promise<UsageStatus> {
    // Validate current usage against limits
    // Increment usage counter atomically
    // Check if alert thresholds reached
    // Trigger usage alerts if needed
    // Return current usage status
  }

  async checkUsageLimits(supplierId: string): Promise<UsageOverview> {
    // Get current billing tier and limits
    // Calculate usage percentages
    // Identify approaching limits
    // Generate usage recommendations
    // Return comprehensive usage overview
  }
}
```

### Stripe Webhook Handler
```typescript
export async function handleStripeWebhook(
  signature: string,
  payload: string
): Promise<void> {
  // Verify webhook signature
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    case 'subscription.updated':
      await syncSubscriptionStatus(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(event.data.object);
      break;
    // Handle other relevant webhook events
  }
}
```

### Usage Alert Engine
```typescript
export class UsageAlertEngine {
  private alertThresholds = [50, 80, 95, 100]; // Percentage thresholds

  async checkUsageAlerts(supplierId: string): Promise<void> {
    const usage = await this.getUsageMetrics(supplierId);
    
    for (const [resource, metrics] of Object.entries(usage)) {
      const usagePercentage = (metrics.used / metrics.limit) * 100;
      
      for (const threshold of this.alertThresholds) {
        if (usagePercentage >= threshold && !metrics.alertTriggered[threshold]) {
          await this.triggerUsageAlert(supplierId, resource, threshold, usagePercentage);
        }
      }
    }
  }

  private async triggerUsageAlert(
    supplierId: string,
    resource: string,
    threshold: number,
    currentUsage: number
  ): Promise<void> {
    // Create alert record
    // Send email notification
    // Create in-app notification
    // Generate upgrade recommendation if needed
  }
}
```

## 🚀 STRIPE INTEGRATION DETAILS

### Customer and Subscription Management
```typescript
interface StripeSubscriptionConfig {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  paymentMethodId?: string;
  prorationBehavior: 'create_prorations' | 'none';
}

export class StripeSubscriptionService {
  async createSubscription(config: StripeSubscriptionConfig) {
    const subscription = await stripe.subscriptions.create({
      customer: config.customerId,
      items: [{ price: config.priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      trial_period_days: config.trialPeriodDays,
      proration_behavior: config.prorationBehavior
    });
    
    return subscription;
  }
}
```

### Payment Method Management
```typescript
export class PaymentMethodService {
  async attachPaymentMethod(customerId: string, paymentMethodId: string) {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId
    });
    
    // Update default payment method if first card
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.invoice_settings?.default_payment_method) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }
  }
}
```

## 🎯 ACCEPTANCE CRITERIA

### API Functionality
- [ ] All billing endpoints respond within 500ms (95th percentile)
- [ ] Subscription upgrades process without service interruption
- [ ] Usage tracking increments atomically to prevent race conditions
- [ ] Webhook processing handles high volume during billing cycles
- [ ] Payment failures trigger appropriate retry and notification logic
- [ ] Billing history accurately reflects all Stripe transactions

### Data Integrity
- [ ] Usage counters maintain accuracy under concurrent access
- [ ] Billing calculations match Stripe invoice amounts
- [ ] Subscription status synchronizes correctly with Stripe
- [ ] Usage limits enforce correctly at tier boundaries
- [ ] Historical billing data maintains referential integrity

### Security & Compliance
- [ ] All Stripe communications use secure authentication
- [ ] Webhook signatures verify correctly
- [ ] Payment method data never stored locally
- [ ] Billing API endpoints require proper authorization
- [ ] Sensitive billing operations generate audit trails
- [ ] GDPR compliance for billing data retention and deletion

## 📊 WEDDING INDUSTRY SPECIFIC FEATURES

### Seasonal Billing Patterns
- Automatic usage scaling during wedding season (May-October)
- Flexible billing for photographers with seasonal income
- Payment deferrals during off-season periods
- Wedding season upgrade recommendations

### Client Lifecycle Billing
- Usage tracking aligned with wedding planning phases
- Billing optimization for client onboarding peaks
- Revenue recognition for milestone-based services
- Client retention correlation with billing satisfaction

### Multi-Vendor Billing Support
- Coordinated billing for vendor partnerships
- Shared resource allocation for collaborative accounts
- Cross-vendor usage analytics and insights
- Bulk billing discounts for wedding vendor networks

**EXECUTE IMMEDIATELY - Build bulletproof billing backend that handles subscription management at wedding industry scale!**