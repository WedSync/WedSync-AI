# 01-stripe-setup.md

# [01-stripe-setup.md](http://01-stripe-setup.md)

## What to Build

Implement Stripe integration for handling subscription payments and marketplace transactions. Set up customer management, product catalog, and webhook infrastructure.

## Key Technical Requirements

### Environment Setup

```
npm install stripe @stripe/stripe-js
```

### Environment Variables

```
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_MARKETPLACE_ACCOUNT_ID=acct_xxx  # For marketplace
```

### Stripe Instance Configuration

```
// lib/stripe/server.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// lib/stripe/client.ts
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  [process.env.NEXT](http://process.env.NEXT)_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

## Database Schema

```
-- Stripe customer mapping
CREATE TABLE stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription tracking
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT NOT NULL,
  status TEXT NOT NULL, -- active, canceled, past_due, etc.
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Product & Price Setup

```
// scripts/setup-stripe-products.ts
const setupProducts = async () => {
  // Create products for each tier
  const products = [
    {
      id: 'prod_starter',
      name: 'WedSync Starter',
      description: '2 logins, unlimited forms, basic features',
    },
    {
      id: 'prod_professional',
      name: 'WedSync Professional',
      description: 'AI chatbot, journey automation, advanced features',
    },
    {
      id: 'prod_scale',
      name: 'WedSync Scale',
      description: 'Team features, API access, priority support',
    },
  ];

  // Create prices
  const prices = [
    { product: 'prod_starter', amount: 1900, interval: 'month' },
    { product: 'prod_professional', amount: 4900, interval: 'month' },
    { product: 'prod_scale', amount: 7900, interval: 'month' },
  ];

  for (const price of prices) {
    await stripe.prices.create({
      product: price.product,
      currency: 'gbp',
      unit_amount: price.amount,
      recurring: { interval: price.interval },
    });
  }
};
```

## Critical Implementation Notes

### Customer Creation Flow

1. Create Stripe customer when supplier signs up (even on free tier)
2. Store mapping in `stripe_customers` table
3. Attach payment method during trial or upgrade
4. Use customer portal for self-service management

### Test Mode vs Production

- Use test keys during development
- Implement feature flag for Stripe test mode
- Create separate products/prices for test and production
- Never mix test and production data

### Security Considerations

- Never expose secret keys to client
- Validate all amounts on server side
- Use webhook signatures to verify events
- Implement idempotency keys for critical operations

### Marketplace Considerations

- Set up Connect account for marketplace payments
- Configure platform fees (30% commission)
- Handle tax calculations per region
- Implement payout schedules for creators