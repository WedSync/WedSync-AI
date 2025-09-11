# 04-commission-structure.md

## What to Build

A tiered commission system that rewards successful creators with better rates while ensuring platform sustainability. Commission rates decrease as creators prove value.

## Key Technical Requirements

### Commission Calculation Logic

```
interface CommissionTiers {
  base: 0.30,           // 30% - New creators
  verified: 0.25,       // 25% - After 10 sales
  performer: 0.20,      // 20% - 50+ sales or £5k revenue
  elite: 0.15           // 15% - 100+ sales or £15k revenue
}

class CommissionCalculator {
  static getCreatorTier(creator: Creator): string {
    const { total_sales, total_revenue } = creator.marketplace_stats;
    
    if (total_sales >= 100 || total_revenue >= 1500000) { // cents
      return 'elite';
    } else if (total_sales >= 50 || total_revenue >= 500000) {
      return 'performer';
    } else if (total_sales >= 10) {
      return 'verified';
    }
    return 'base';
  }
  
  static calculateCommission(salePrice: number, creator: Creator): CommissionBreakdown {
    const tier = this.getCreatorTier(creator);
    const rate = COMMISSION_RATES[tier];
    
    return {
      sale_price: salePrice,
      commission_rate: rate,
      platform_fee: Math.round(salePrice * rate),
      creator_earnings: Math.round(salePrice * (1 - rate)),
      creator_tier: tier,
      next_tier_requirements: this.getNextTierRequirements(tier, creator)
    };
  }
}
```

### Database Commission Tracking

```
-- Track creator performance for tier calculation
CREATE TABLE creator_marketplace_stats (
  creator_id UUID PRIMARY KEY REFERENCES suppliers(id),
  total_sales INTEGER DEFAULT 0,
  total_revenue_cents BIGINT DEFAULT 0,
  current_tier VARCHAR(20) DEFAULT 'base',
  tier_achieved_at TIMESTAMPTZ,
  average_rating DECIMAL(3,2),
  last_sale_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission history for accounting
CREATE TABLE commission_ledger (
  id UUID PRIMARY KEY,
  transaction_id UUID REFERENCES revenue_transactions(id),
  creator_id UUID REFERENCES suppliers(id),
  sale_amount INTEGER,
  commission_tier VARCHAR(20),
  commission_rate DECIMAL(4,2),
  commission_amount INTEGER,
  creator_payout INTEGER,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update stats trigger
CREATE OR REPLACE FUNCTION update_creator_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE creator_marketplace_stats
  SET 
    total_sales = total_sales + 1,
    total_revenue_cents = total_revenue_cents + [NEW.sale](http://NEW.sale)_price,
    last_sale_at = NOW(),
    updated_at = NOW()
  WHERE creator_id = NEW.creator_id;
  
  -- Check for tier upgrade
  PERFORM check_tier_upgrade(NEW.creator_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Tier Progression System

```
const CreatorProgressWidget = ({ stats }) => {
  const currentTier = stats.current_tier;
  const nextTier = getNextTier(currentTier);
  const progress = calculateProgress(stats, nextTier);
  
  return (
    <Card>
      <CardHeader>
        <Badge variant={getTierVariant(currentTier)}>
          {currentTier} Creator - {getCommissionRate(currentTier)}% fee
        </Badge>
      </CardHeader>
      <CardBody>
        <ProgressBar value={progress.percentage} />
        <Text size="sm" className="mt-2">
          {progress.remaining} to reach {nextTier} tier
        </Text>
        <List className="mt-4">
          <ListItem>Current: {[stats.total](http://stats.total)_sales} sales</ListItem>
          <ListItem>Revenue: £{[stats.total](http://stats.total)_revenue / 100}</ListItem>
          <ListItem>You keep: {100 - getCommissionRate(currentTier)}%</ListItem>
        </List>
      </CardBody>
    </Card>
  );
};
```

### Special Commission Cases

```
// Promotional periods
const PROMOTIONAL_RATES = {
  launch_week: 0.10,        // 10% only for first week
  black_friday: 0.15,       // 15% for Black Friday
  milestone_celebration: 0.20 // 20% for platform milestones
};

// Bundle commission
const calculateBundleCommission = (bundle: Bundle) => {
  // Bundles get 5% better rate to encourage package deals
  const standardRate = getCreatorRate(bundle.creator);
  const bundleRate = Math.max(0.10, standardRate - 0.05);
  
  return bundle.price * bundleRate;
};

// Referral bonus
const REFERRAL_BONUS = {
  referee_discount: 0.10,    // 10% off first purchase
  referrer_commission: 0.05  // Extra 5% lower commission for 3 months
};
```

## Critical Implementation Notes

### Tier Benefits Beyond Commission

```
const TIER_PERKS = {
  verified: [
    'Verified badge on templates',
    'Priority support',
    'Monthly analytics report'
  ],
  performer: [
    'Featured creator spot monthly',
    'Early access to new features',
    'Custom storefront URL'
  ],
  elite: [
    'Dedicated account manager',
    'Co-marketing opportunities',
    'API access for automation',
    'Exclusive creator events'
  ]
};
```

### Commission Transparency

- Show exact commission before listing
- Real-time calculator in template builder
- Clear breakdown in earnings dashboard
- Monthly commission statements via email

### Edge Cases

- Refunds: Platform keeps commission
- Chargebacks: Creator liable for full amount
- Currency conversion: Use Stripe rates
- Disputes: 30-day resolution period

## Database/API Structure

### Commission API Endpoints

```
GET /api/marketplace/commission/calculate
  Query: { price: 4999, creator_id: 'uuid' }
  Response: { 
    commission: 1250, 
    creator_earning: 3749,
    tier: 'verified',
    rate: 0.25 
  }

GET /api/marketplace/creators/:id/tier
  Response: {
    current_tier: 'verified',
    next_tier: 'performer',
    requirements_met: {
      sales: '23/50',
      revenue: '£2,340/£5,000'
    },
    commission_rate: 0.25,
    tier_benefits: string[]
  }
```