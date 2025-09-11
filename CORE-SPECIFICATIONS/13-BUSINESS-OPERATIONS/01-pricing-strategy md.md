# 01-pricing-strategy.md

## What to Build

A tiered subscription system with freemium model for couples (WedMe) and paid tiers for suppliers (WedSync). System must handle trial periods, tier upgrades/downgrades, and feature gating.

## Technical Requirements

### Database Schema

```
-- Subscription tiers table
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'free', 'starter', 'professional', 'scale', 'enterprise'
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  display_order INT,
  is_active BOOLEAN DEFAULT true
);

-- Supplier subscriptions
CREATE TABLE supplier_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  tier_id UUID REFERENCES subscription_tiers(id),
  status TEXT, -- 'trialing', 'active', 'past_due', 'canceled', 'paused'
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT
);
```

### Tier Configuration

```
const PRICING_TIERS = {
  free: {
    price: 0,
    limits: {
      forms: 1,
      clients: 10,
      logins: 1,
      storage: 100 // MB
    },
    features: {
      basic_dashboard: true,
      powered_by_branding: true,
      ai_form_generation: false,
      customer_journeys: 'view_only'
    }
  },
  starter: {
    price: 19,
    limits: {
      forms: 'unlimited',
      clients: 100,
      logins: 2,
      storage: 5000
    },
    features: {
      custom_branding: true,
      email_journeys: true,
      basic_analytics: true,
      sms_integration_ready: true
    }
  },
  professional: {
    price: 49,
    limits: {
      forms: 'unlimited',
      clients: 'unlimited',
      logins: 3,
      storage: 50000
    },
    features: {
      ai_chatbot: true,
      full_automation: true,
      calendar_meetings: true,
      review_collection: true,
      marketplace_access: true
    }
  }
};
```

### Feature Gating Middleware

```
// Middleware to check feature access
export async function checkFeatureAccess(
  supplierId: string,
  feature: string
): Promise<boolean> {
  const subscription = await getSupplierSubscription(supplierId);
  const tier = PRICING_TIERS[subscription.tier_name];
  
  // Check if feature exists in tier
  return tier.features[feature] === true;
}

// API route protection
export async function POST(req: Request) {
  const { supplierId } = await getSession(req);
  
  if (!await checkFeatureAccess(supplierId, 'ai_chatbot')) {
    return NextResponse.json(
      { error: 'Upgrade to Professional to access AI Chatbot' },
      { status: 403 }
    );
  }
  
  // Continue with feature logic
}
```

### Trial Extension Logic

```
// 30-day trial with one-time 15-day extension
interface TrialExtension {
  checkEligibility: (supplierId: string) => Promise<boolean>;
  conditions: {
    minLogins: 5,
    minClientsImported: 10,
    minFormCreated: 1,
    hasNotExtendedBefore: true
  };
  extensionDays: 15;
}

// Automated trial extension offer
export async function checkTrialExtensionEligibility(
  subscription: SupplierSubscription
): Promise<void> {
  const daysUntilExpiry = differenceInDays(
    subscription.trial_ends_at,
    new Date()
  );
  
  if (daysUntilExpiry === 5) {
    const activity = await getSupplierActivity(subscription.supplier_id);
    
    if (activity.logins >= 5 && activity.clientsImported >= 10) {
      await sendTrialExtensionOffer(subscription.supplier_id);
    }
  }
}
```

## Critical Implementation Notes

1. **Grandfather Pricing**: Store price at subscription time to honor original pricing for existing customers
2. **Downgrade Protection**: Preserve data when downgrading but make it read-only
3. **Usage Tracking**: Track feature usage to inform pricing optimization
4. **Pause Option**: Allow 90-day account pause for seasonal businesses
5. **Currency Support**: Start with GBP, prepare structure for USD/EUR

## API Endpoints

```
// GET /api/pricing/tiers
// Returns available tiers with features

// POST /api/subscription/upgrade
// Body: { tierId, billingPeriod: 'monthly' | 'annual' }

// POST /api/subscription/downgrade
// Body: { tierId, reason }

// POST /api/subscription/pause
// Body: { reason, resumeDate? }

// POST /api/trial/extend
// Checks eligibility and extends trial
```

## Monitoring Metrics

- Trial-to-paid conversion rate (target: 25%)
- Tier distribution (aim for 60% Professional)
- Downgrade reasons and patterns
- Feature usage by tier
- Price sensitivity analysis