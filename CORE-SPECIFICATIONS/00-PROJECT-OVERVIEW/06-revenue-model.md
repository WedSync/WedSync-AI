# 06-revenue-model

## Core Pricing Philosophy

### Fundamental Principles

```
const pricingPrinciples = {
  couples: 'FREE forever - maximize viral adoption',
  suppliers: 'Value-based tiered pricing',
  focus: 'Land and expand strategy',
  philosophy: 'Price for value, not features',
  approach: 'Tools that pay for themselves'
}
```

## Subscription Tiers (Supplier-Side)

### Tier Structure

```
interface PricingTiers {
  free: {
    price: 0,
    positioning: 'Try before you buy',
    limits: {
      forms: 1,
      logins: 1,
      clients: 'unlimited',
      features: 'basic',
      support: 'community'
    },
    conversion_goal: '8% to paid within 30 days'
  },
  
  starter: {
    price: 19, // £/month
    positioning: 'Perfect for solo professionals',
    includes: {
      logins: 2,
      forms: 'unlimited',
      clients: 'unlimited',
      email_journeys: 5,
      custom_domain: true,
      branding_removal: true
    },
    target_segment: 'Part-time, new businesses',
    upgrade_trigger: 'Need automation'
  },
  
  professional: {
    price: 49, // £/month
    positioning: 'Everything to automate your business',
    includes: {
      logins: 3,
      all_starter_features: true,
      ai_chatbot: true,
      full_automation: true,
      sms_whatsapp: true,
      review_collection: true,
      meeting_scheduler: true,
      template_marketplace: 'buy_and_sell'
    },
    target_segment: 'Full-time professionals',
    sweet_spot: true, // 60% of paid users here
  },
  
  scale: {
    price: 79, // £/month
    positioning: 'For growing teams',
    includes: {
      logins: 5,
      all_professional_features: true,
      team_management: true,
      post_wedding_automation: true,
      referral_system: true,
      api_access: true,
      priority_support: true,
      multi_brand: true
    },
    target_segment: 'Established businesses, agencies'
  },
  
  enterprise: {
    price: 149, // £/month
    positioning: 'High-volume operations',
    includes: {
      logins: 'unlimited',
      all_scale_features: true,
      white_label: true,
      dedicated_support: true,
      custom_integrations: true,
      sla_guarantee: true,
      venue_specific_features: true
    },
    target_segment: 'Venues, large catering companies'
  }
}
```

### Annual Pricing Strategy

```
const annualPricing = {
  discount: 0.20, // 20% off
  structure: {
    starter: {
      monthly: 19,
      annual: 182, // £15.17/month
      savings: 46
    },
    professional: {
      monthly: 49,
      annual: 470, // £39.17/month
      savings: 118
    },
    scale: {
      monthly: 79,
      annual: 758, // £63.17/month
      savings: 190
    },
    enterprise: {
      monthly: 149,
      annual: 1430, // £119.17/month
      savings: 358
    }
  },
  
  benefits: [
    'Predictable cash flow',
    'Lower CAC payback period',
    'Increased LTV',
    'Reduced churn'
  ],
  
  target: '40% of paid users on annual plans'
}
```

## Revenue Projections

### Year 1 Targets

```
const year1_projections = {
  month_1: {
    total_users: 50,
    paid_users: 5,
    mrr: 145, // £
    distribution: {
      free: 45,
      starter: 3,
      professional: 2,
      scale: 0,
      enterprise: 0
    }
  },
  
  month_6: {
    total_users: 500,
    paid_users: 125,
    mrr: 4250,
    distribution: {
      free: 375,
      starter: 38, // 30% of paid
      professional: 75, // 60% of paid
      scale: 10, // 8% of paid
      enterprise: 2 // 2% of paid
    }
  },
  
  month_12: {
    total_users: 2000,
    paid_users: 600,
    mrr: 22450,
    arr: 269400,
    distribution: {
      free: 1400,
      starter: 150,
      professional: 360,
      scale: 72,
      enterprise: 18
    }
  }
}
```

### Unit Economics

```
const unitEconomics = {
  customer_acquisition_cost: {
    organic: 15, // £ (content, SEO)
    paid: 75, // £ (ads, affiliates)
    viral: 5, // £ (referral incentives)
    blended: 25 // £ average
  },
  
  lifetime_value: {
    starter: 228, // £ (12 month average)
    professional: 882, // £ (18 month average)
    scale: 1896, // £ (24 month average)
    enterprise: 5364, // £ (36 month average)
    blended: 735 // £ average
  },
  
  ltv_cac_ratio: 29.4, // Target: >3
  payback_period: 1.5, // months, Target: <12
  gross_margin: 0.85, // 85%, Target: >80%
  
  monthly_churn: {
    starter: 0.08, // 8%
    professional: 0.03, // 3%
    scale: 0.02, // 2%
    enterprise: 0.01, // 1%
    blended: 0.035 // 3.5%
  }
}
```

## Additional Revenue Streams

### 1. Template Marketplace

```
const marketplaceRevenue = {
  commission_structure: {
    platform_take: 0.30, // 30%
    creator_share: 0.70, // 70%
  },
  
  template_pricing: {
    simple_forms: '£19-49',
    journey_packages: '£79-149',
    complete_workflows: '£199-499'
  },
  
  projections: {
    year_1: {
      creators: 100,
      templates: 500,
      monthly_transactions: 200,
      avg_transaction: 75,
      monthly_gmv: 15000,
      platform_revenue: 4500
    }
  },
  
  strategic_value: [
    'Increases platform stickiness',
    'Creates creator evangelists',
    'Improves new user success',
    'Additional revenue with minimal cost'
  ]
}
```

### 2. Transaction Fees (Future)

```
const transactionFees = {
  status: 'Phase 2 consideration',
  potential_streams: [
    {
      type: 'Booking fees',
      rate: '2.5% of transaction',
      justification: 'If we add booking capabilities'
    },
    {
      type: 'Payment processing',
      rate: '2.9% + 30p',
      justification: 'If we integrate payments'
    },
    {
      type: 'Lead generation',
      rate: '£10-50 per qualified lead',
      justification: 'Directory monetization'
    }
  ],
  
  decision: 'Avoid initially to reduce complexity'
}
```

### 3. API & Integration Fees

```
const apiRevenue = {
  tier_limits: {
    free: 'No API access',
    starter: 'No API access',
    professional: '10,000 calls/month included',
    scale: '100,000 calls/month included',
    enterprise: 'Unlimited'
  },
  
  overage_pricing: {
    rate: '£0.001 per call',
    bulk_discounts: true
  },
  
  white_label_api: {
    price: '£500/month',
    target: 'Software companies, agencies'
  }
}
```

## Pricing Psychology & Strategy

### Value Positioning

```
const valueMessaging = {
  starter: {
    message: 'Less than a coffee per day',
    comparison: 'Cheaper than one hour of admin work',
    roi: 'Save 5 hours/month = £125 value'
  },
  
  professional: {
    message: 'Pays for itself with one booking',
    comparison: '1/10th the cost of an assistant',
    roi: 'Save 10 hours/month = £250 value'
  },
  
  scale: {
    message: 'Scale without hiring',
    comparison: 'Fraction of employee cost',
    roi: 'Handle 40% more weddings'
  }
}
```

### Upgrade Triggers

```
const upgradeTriggers = {
  free_to_starter: [
    'Hit 1 form limit',
    'Need second login',
    'Want custom branding',
    '30-day trial ends'
  ],
  
  starter_to_professional: [
    'Need SMS/WhatsApp',
    'Want AI chatbot',
    'Need automation',
    'Client base >20'
  ],
  
  professional_to_scale: [
    'Adding team members',
    'Multi-location business',
    'Need API access',
    'Post-wedding automation'
  ],
  
  scale_to_enterprise: [
    'Venue operations',
    'White-label needs',
    'Custom requirements',
    '100+ weddings/year'
  ]
}
```

## Discounting Strategy

### Approved Discounts

```
const discountStrategy = {
  launch_promotion: {
    discount: '50% off for 3 months',
    eligibility: 'First 100 customers',
    code: 'EARLY50'
  },
  
  seasonal: {
    black_friday: '30% off annual',
    january: '25% off first 3 months',
    quiet_season: '20% off Nov-Feb'
  },
  
  retention: {
    win_back: '50% off for 2 months',
    at_risk: '25% off for 3 months',
    loyalty: '10% permanent after 12 months'
  },
  
  partner: {
    venue_groups: '20% volume discount',
    associations: '15% member discount',
    referral_partners: '25% commission'
  },
  
  prohibited: [
    'Free professional tier',
    'Lifetime deals',
    '>50% discount except launch',
    'Stacking discounts'
  ]
}
```

## Churn Reduction Strategy

### Retention Tactics

```
const retentionStrategy = {
  onboarding: {
    tactic: 'High-touch first 30 days',
    impact: 'Reduce month-1 churn by 40%'
  },
  
  usage_monitoring: {
    tactic: 'Proactive outreach if usage drops',
    triggers: [
      'No login for 14 days',
      'No invites sent',
      'Forms not created'
    ]
  },
  
  value_realization: {
    tactic: 'Regular ROI reports',
    metrics: [
      'Hours saved',
      'Clients managed',
      'Automation runs'
    ]
  },
  
  pause_option: {
    tactic: 'Offer pause instead of cancel',
    duration: '90 days',
    impact: '30% take pause vs cancel'
  },
  
  downgrade_path: {
    tactic: 'Offer tier downgrade',
    impact: '25% downgrade vs cancel'
  }
}
```

## Financial Targets

### Key Metrics

```
const financialTargets = {
  year_1: {
    ending_mrr: 50000,
    total_revenue: 250000,
    gross_margin: 0.85,
    burn_rate: 15000, // monthly
    runway: '12 months'
  },
  
  year_2: {
    ending_mrr: 200000,
    total_revenue: 1500000,
    gross_margin: 0.87,
    ebitda_positive: true,
    growth_rate: '300%'
  },
  
  year_3: {
    ending_mrr: 500000,
    total_revenue: 4000000,
    gross_margin: 0.88,
    ebitda_margin: 0.25,
    growth_rate: '150%'
  },
  
  exit_metrics: {
    target_arr: 6000000,
    growth_rate: 0.8,
    gross_margin: 0.88,
    net_retention: 1.10,
    valuation_multiple: '8-12x ARR'
  }
}
```

## Implementation Timeline

### Rollout Phases

1. **Month 1-2**: Free tier + Professional (simplified)
2. **Month 3-4**: Add Starter tier, refine pricing
3. **Month 5-6**: Launch Scale tier, annual plans
4. **Month 7-12**: Enterprise tier, marketplace
5. **Year 2**: Additional revenue streams

This revenue model balances aggressive growth through free tier virality with sustainable unit economics through value-based pricing, setting the foundation for a high-growth SaaS business.