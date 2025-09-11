# 02-tier-access.md

## What to Build

Implement tier-based access control for marketplace features, ensuring only qualified suppliers can purchase/sell templates based on their subscription level.

## Key Technical Requirements

### Access Matrix Implementation

```
// Define tier capabilities
const MARKETPLACE_ACCESS = {
  free: {
    browse: true,
    purchase: false,
    sell: false,
    preview_limit: 3, // templates per day
    commission: null
  },
  starter: {
    browse: true,
    purchase: true,
    sell: false,
    purchase_limit: 5, // per month
    categories: ['basic_forms', 'email_templates'],
    commission: null
  },
  professional: {
    browse: true,
    purchase: true,
    sell: true,
    purchase_limit: null, // unlimited
    categories: 'all',
    commission: 0.30 // 30% to platform
  },
  scale: {
    browse: true,
    purchase: true,
    sell: true,
    purchase_limit: null,
    categories: 'all',
    commission: 0.25, // 25% reduced commission
    featured_creator: true
  }
};
```

### Database Enforcement

```
-- Row Level Security policies
CREATE POLICY marketplace_browse ON marketplace_templates
  FOR SELECT USING (true); -- Everyone can browse

CREATE POLICY marketplace_purchase ON template_purchases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers 
      WHERE id = auth.uid() 
      AND subscription_tier IN ('starter', 'professional', 'scale', 'enterprise')
    )
  );

CREATE POLICY marketplace_sell ON marketplace_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM suppliers
      WHERE id = auth.uid()
      AND subscription_tier IN ('professional', 'scale', 'enterprise')
      AND is_verified = true
    )
  );
```

### Frontend Tier Gates

```
// Tier gate component
const TierGate = ({ requiredTier, children, fallback }) => {
  const { tier } = useSupplier();
  const hasAccess = TIER_HIERARCHY[tier] >= TIER_HIERARCHY[requiredTier];
  
  if (!hasAccess) {
    return fallback || <UpgradePrompt requiredTier={requiredTier} />;
  }
  
  return children;
};

// Usage in marketplace
const PurchaseButton = ({ template }) => {
  return (
    <TierGate 
      requiredTier="starter"
      fallback={<LockedFeature message="Upgrade to purchase templates" />}
    >
      <Button onClick={handlePurchase}>
        Buy for £{template.price / 100}
      </Button>
    </TierGate>
  );
};
```

### API Middleware

```
// Tier validation middleware
export const validateMarketplaceTier = async (req, res, next) => {
  const { userId } = req.auth;
  const action = req.path.includes('purchase') ? 'purchase' : 'browse';
  
  const supplier = await getSupplier(userId);
  const access = MARKETPLACE_ACCESS[supplier.tier];
  
  if (!access[action]) {
    return res.status(403).json({
      error: 'tier_insufficient',
      required_tier: getMinimumTier(action),
      upgrade_url: '/billing/upgrade'
    });
  }
  
  // Check monthly limits for starter tier
  if (supplier.tier === 'starter' && action === 'purchase') {
    const monthlyPurchases = await countMonthlyPurchases(userId);
    if (monthlyPurchases >= access.purchase_limit) {
      return res.status(429).json({
        error: 'monthly_limit_reached',
        reset_date: getMonthlyReset()
      });
    }
  }
  
  req.marketplaceAccess = access;
  next();
};
```

## Critical Implementation Notes

### Seller Verification

- Professional+ tier required to list templates
- Must have 50+ completed client journeys
- Account must be 30+ days old
- Manual review for first template submission

### Purchase Restrictions

- Starter tier limited to 5 purchases/month
- Basic category templates only (no advanced automations)
- Cannot resell or share purchased templates
- All purchases final after 24-hour review period

### Creator Benefits by Tier

```
const CREATOR_BENEFITS = {
  professional: {
    commission_rate: 0.70, // Keep 70%
    listing_limit: 10,
    analytics: 'basic',
    promotion: 'standard'
  },
  scale: {
    commission_rate: 0.75, // Keep 75%
    listing_limit: 50,
    analytics: 'advanced',
    promotion: 'featured',
    badge: 'verified_creator'
  },
  enterprise: {
    commission_rate: 0.80, // Keep 80%
    listing_limit: null, // unlimited
    analytics: 'premium',
    promotion: 'spotlight',
    badge: 'elite_creator',
    custom_storefront: true
  }
};
```

## Database/API Structure

### Tier Upgrade Triggers

- Monitor failed purchase attempts due to tier
- Track browse-to-purchase conversion by tier
- Send targeted upgrade emails after 3 failed attempts
- Show "what you're missing" dashboard widget

### Usage Tracking

```
CREATE TABLE marketplace_usage (
  supplier_id UUID,
  action VARCHAR(20), -- browse, preview, purchase, install
  template_id UUID,
  blocked_by_tier BOOLEAN,
  timestamp TIMESTAMPTZ
);
```