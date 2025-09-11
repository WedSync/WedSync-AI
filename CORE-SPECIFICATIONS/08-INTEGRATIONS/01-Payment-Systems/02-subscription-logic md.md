# 02-subscription-logic.md

# [02-subscription-logic.md](http://02-subscription-logic.md)

## What to Build

Implement subscription lifecycle management including trial periods, upgrades, downgrades, and cancellations. Handle tier-specific feature gates and usage limits.

## Key Technical Requirements

### Subscription Creation

```
// app/api/subscriptions/create/route.ts
export async function POST(request: Request) {
  const { priceId, supplierId } = await request.json();
  
  // Get or create Stripe customer
  const customer = await getOrCreateStripeCustomer(supplierId);
  
  // Create subscription with 30-day trial
  const subscription = await stripe.subscriptions.create({
    customer: customer.stripe_customer_id,
    items: [{ price: priceId }],
    trial_period_days: 30,
    metadata: {
      supplier_id: supplierId,
    },
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  });
  
  // Store in database
  await supabase.from('subscriptions').insert({
    supplier_id: supplierId,
    stripe_subscription_id: [subscription.id](http://subscription.id),
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000),
  });
  
  return NextResponse.json({ 
    clientSecret: subscription.latest_invoice.payment_intent.client_secret 
  });
}
```

### Tier Management

```
// lib/subscription/tiers.ts
export const TIERS = {
  FREE: {
    name: 'Free',
    features: {
      forms: 1,
      logins: 1,
      clients: 10,
      ai_form_generation: false,
      customer_journeys: false,
    },
  },
  STARTER: {
    name: 'Starter',
    price_id: 'price_starter_monthly',
    features: {
      forms: -1, // unlimited
      logins: 2,
      clients: -1,
      ai_form_generation: true,
      customer_journeys: true,
      journey_limit: 5,
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    price_id: 'price_professional_monthly',
    features: {
      forms: -1,
      logins: 3,
      clients: -1,
      ai_form_generation: true,
      customer_journeys: true,
      journey_limit: -1,
      ai_chatbot: true,
      calendar_integration: true,
    },
  },
};
```

### Feature Gating

```
// hooks/useSubscription.ts
export function useSubscription() {
  const { data: subscription } = useSWR('/api/subscriptions/current');
  
  const canAccess = (feature: string) => {
    if (!subscription) return false;
    const tier = getTierFromPriceId(subscription.stripe_price_id);
    return TIERS[tier].features[feature] !== false;
  };
  
  const withinLimit = (feature: string, current: number) => {
    const tier = getTierFromPriceId(subscription.stripe_price_id);
    const limit = TIERS[tier].features[feature];
    return limit === -1 || current < limit;
  };
  
  return { subscription, canAccess, withinLimit };
}
```

## Upgrade/Downgrade Logic

```
// app/api/subscriptions/update/route.ts
export async function PATCH(request: Request) {
  const { newPriceId, subscriptionId } = await request.json();
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Determine proration behavior
  const isUpgrade = getPriceTier(newPriceId) > getPriceTier([subscription.items.data](http://subscription.items.data)[0].[price.id](http://price.id));
  
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: [subscription.items.data](http://subscription.items.data)[0].id,
      price: newPriceId,
    }],
    proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
    billing_cycle_anchor: isUpgrade ? 'now' : 'unchanged',
  });
  
  // Update database
  await supabase
    .from('subscriptions')
    .update({ stripe_price_id: newPriceId })
    .eq('stripe_subscription_id', subscriptionId);
}
```

## Cancellation Flow

```
// app/api/subscriptions/cancel/route.ts
export async function DELETE(request: Request) {
  const { subscriptionId, immediately = false } = await request.json();
  
  if (immediately) {
    // Cancel immediately and trigger data export
    await stripe.subscriptions.cancel(subscriptionId);
    await triggerDataExport(subscriptionId);
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  
  // Update database
  await supabase
    .from('subscriptions')
    .update({ 
      cancel_at_period_end: !immediately,
      status: immediately ? 'canceled' : 'active',
    })
    .eq('stripe_subscription_id', subscriptionId);
}
```

## Critical Implementation Notes

### Trial Period Management

- 30-day trial for all new subscriptions
- Track trial end date for UI warnings
- Allow one-time 15-day extension if qualified
- Auto-downgrade to free if no payment method added

### Grace Period for Failed Payments

- 7-day grace period before suspension
- Maintain read-only access during grace period
- Send escalating email reminders
- Preserve data for 30 days after cancellation

### Downgrade Restrictions

- Check current usage before allowing downgrade
- Block if exceeds new tier limits
- Provide data export before downgrading
- Queue background job to adjust features

### Usage Tracking

- Track form count, login count, client count in real-time
- Cache counts in Redis for performance
- Enforce limits at API level, not just UI
- Send warning emails at 80% of limits