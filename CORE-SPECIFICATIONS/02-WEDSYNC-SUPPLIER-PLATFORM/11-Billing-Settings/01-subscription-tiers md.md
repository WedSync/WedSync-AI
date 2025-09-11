# 01-subscription-tiers.md

# Subscription Tier Management

## What to Build

Flexible subscription system with tier-based feature gating and usage limits.

## Technical Requirements

- Stripe subscription integration
- Feature flag system
- Usage tracking/limits
- Upgrade/downgrade flows

## Implementation

typescript

`*// Subscription tiers*
const TIERS = {
  free: {
    price: 0,
    limits: {
      clients: 10,
      forms: 1,
      storage: 100 *// MB*
    },
    features: ['basic_dashboard']
  },
  starter: {
    price: 1900, *// cents*
    limits: {
      clients: 50,
      forms: 5,
      storage: 5000
    },
    features: ['email_automation', 'custom_domain']
  },
  professional: {
    price: 4900,
    limits: {
      clients: -1, *// unlimited*
      forms: -1,
      storage: 50000
    },
    features: ['ai_chatbot', 'journey_builder', 'analytics']
  }
}

*// Feature gating*
function hasFeature(supplierId, feature) {
  const tier = await getSupplierTier(supplierId);
  return TIERS[tier].features.includes(feature);
}

*// Usage enforcement*
async function checkLimit(supplierId, resource) {
  const usage = await getCurrentUsage(supplierId, resource);
  const limit = await getTierLimit(supplierId, resource);
  if (usage >= limit) throw new LimitExceededError();
}`

## Critical Notes

- Cache tier data in Redis (5 min TTL)
- Grandfather old pricing for existing users
- Prorate upgrades/downgrades
- 30-day trial for new Professional signups