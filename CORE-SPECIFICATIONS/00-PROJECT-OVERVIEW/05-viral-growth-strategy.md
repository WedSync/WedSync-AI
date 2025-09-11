# 05-viral-growth-strategy

## Core Viral Mechanism

### The Two-Sided Viral Loop

```
Supplier joins WedSync
    ↓
Invites existing clients to WedMe
    ↓
Couples experience value
    ↓
Invite their other suppliers
    ↓
Suppliers see value through real client
    ↓
Suppliers join WedSync
    ↓
[LOOP CONTINUES]
```

## Viral Coefficient Formula

### Target Metrics

```
interface ViralMetrics {
  K_factor: number           // Target: >1.5 (viral growth)
  
  // K = i × c
  // i = invitations sent per user
  // c = conversion rate of invitations
  
  supplier_side: {
    avg_invites_per_supplier: 12,    // Target: 20+ couples/month
    couple_conversion_rate: 0.3,     // Target: 30% activate
    time_to_first_invite: 3,         // Target: <3 days
  }
  
  couple_side: {
    avg_suppliers_per_couple: 14,    // Industry average
    supplier_invitation_rate: 0.6,   // Target: 60% invite
    supplier_conversion_rate: 0.15,  // Target: 15% join
  }
  
  compound_coefficient: 1.73         // Combined viral factor
}
```

## Growth Triggers

### 1. Supplier Onboarding Triggers

**Immediate Value Hook**:

```
// First 10 minutes experience
const onboardingFlow = {
  '0-2min': 'Import existing clients from CSV',
  '2-5min': 'See AI generate first form from PDF',
  '5-7min': 'Send first invitations to clients',
  '7-10min': 'First client activates dashboard',
}

// Trigger: Import success
if (importedClients > 10) {
  showPrompt('Invite your upcoming weddings to collaborate')
  offerIncentive('First 5 invites get priority support')
}
```

### 2. Natural Invitation Points

**Supplier Journey Milestones**:

```
const invitationTriggers = [
  {
    event: 'contract_signed',
    message: 'Set up {couple} dashboard for seamless planning',
    urgency: 'high'
  },
  {
    event: 'form_created',
    message: 'Send form to {couple} with auto-filled details',
    urgency: 'medium'
  },
  {
    event: 'timeline_discussion',
    message: 'Share collaborative timeline with {couple}',
    urgency: 'high'
  },
  {
    event: 'two_weeks_inactive',
    message: 'Re-engage {couple} with planning dashboard',
    urgency: 'low'
  }
]
```

### 3. Couple-Side Viral Triggers

**Organic Sharing Moments**:

```
const coupleInviteTriggers = [
  {
    event: 'venue_added',
    prompt: 'Invite {venue} to coordinate with your team',
    value_prop: 'They'll see your date and requirements instantly'
  },
  {
    event: 'vendor_mentioned',
    prompt: 'Add {vendor} to your wedding team',
    value_prop: 'No more repeating information'
  },
  {
    event: 'timeline_created',
    prompt: 'Share timeline with all vendors',
    value_prop: 'Everyone stays synchronized'
  },
  {
    event: 'guest_list_complete',
    prompt: 'Caterer needs final numbers?',
    value_prop: 'Auto-share guest count and dietary needs'
  }
]
```

## Incentive Structure

### Supplier Incentives

**Referral Rewards**:

```
const supplierIncentives = {
  tier1: {
    threshold: 5,
    reward: 'One month free',
    message: 'Invite 5 couples, get a month free'
  },
  tier2: {
    threshold: 10,
    reward: 'Upgrade to Professional',
    message: '10 active couples = Professional features unlocked'
  },
  tier3: {
    threshold: 25,
    reward: 'Lifetime discount 25%',
    message: 'Power user status achieved'
  },
  
  // Gamification
  badges: [
    'Early Adopter',
    'Collaboration Champion',
    'WedSync Ambassador'
  ],
  
  leaderboard: {
    display: 'Top referrers by category',
    prize: 'Monthly feature in directory',
    social_proof: 'Join 847 photographers already using WedSync'
  }
}
```

### Couple Incentives

**Value-Based Rewards**:

```
const coupleIncentives = {
  immediate: {
    value: 'Never fill the same form twice',
    proof: 'Emma & James saved 4 hours using WedMe'
  },
  
  vendor_discounts: {
    message: 'Vendors offering WedMe user discounts',
    examples: [
      '10% off photography packages',
      'Free tasting with caterers',
      'Venue coordination included'
    ]
  },
  
  completion_rewards: {
    '3_vendors': 'Unlock timeline templates',
    '5_vendors': 'Get seating chart tool',
    '10_vendors': 'Premium features free forever'
  }
}
```

## Network Effect Amplification

### Critical Mass Strategy

**Geographic Concentration**:

```
const launchStrategy = {
  phase1: {
    location: 'Yorkshire', // Start local
    target: 50,           // suppliers
    focus: 'Photographers + Venues', // High connector value
    timeline: '3 months'
  },
  
  phase2: {
    expansion: 'Adjacent counties',
    leverage: 'Venue partnerships',
    target: 500,
    timeline: '6 months'
  },
  
  phase3: {
    coverage: 'UK-wide',
    focus: 'Category leaders',
    target: 5000,
    timeline: '12 months'
  }
}
```

### Vendor Category Strategy

**High-Value Categories First**:

```
const categoryPriority = [
  {
    category: 'Venues',
    reason: 'Every wedding needs one',
    connections: 14, // Touch all other vendors
    strategy: 'Partner with venue groups'
  },
  {
    category: 'Photographers',
    reason: 'Tech-savvy, frustrated with admin',
    connections: 10, // Work with most vendors
    strategy: 'Target through photography forums'
  },
  {
    category: 'Planners',
    reason: 'Natural coordinators',
    connections: 14, // Manage all vendors
    strategy: 'Solve their biggest pain'
  },
  {
    category: 'Caterers',
    reason: 'Complex coordination needs',
    connections: 8,
    strategy: 'Dietary/guest management hook'
  }
]
```

## Viral Optimization Tactics

### 1. Reduce Friction

**One-Click Actions**:

```
const frictionReduction = {
  invitation: {
    old_way: 'Copy email, paste, customize, send',
    new_way: 'Click "Invite", done',
    improvement: '90% reduction in steps'
  },
  
  signup: {
    old_way: 'Long forms, verification, tutorial',
    new_way: 'Google auth, auto-setup, immediate value',
    improvement: '3 minutes to first value'
  },
  
  activation: {
    old_way: 'Empty dashboard, figure it out',
    new_way: 'Pre-populated with supplier data',
    improvement: 'Instant "aha" moment'
  }
}
```

### 2. Social Proof Integration

**Trust Signals**:

```
const socialProof = {
  invitation_email: {
    subject: '{Supplier} uses WedSync for better coordination',
    body: 'Join 3,421 couples planning stress-free weddings',
    cta: 'See why Emma loved it' // Link to testimonial
  },
  
  landing_page: {
    hero: '847 suppliers in Yorkshire already connected',
    testimonials: [
      'Saved 10 hours per wedding - Sarah, Photographer',
      'Couples love the organization - Mike, DJ',
      'Game-changer for coordination - Emma, Planner'
    ],
    live_activity: 'James just connected 5 vendors (2 min ago)'
  },
  
  dashboard: {
    notifications: [
      'Your venue just joined WedSync!',
      '3 of your vendors are already here',
      '92% of couples rate this 5 stars'
    ]
  }
}
```

### 3. Urgency Creation

**Time-Sensitive Triggers**:

```
const urgencyTriggers = {
  supplier_side: {
    trial_ending: 'Invite 3 more couples to extend trial',
    feature_unlock: '2 more invites to unlock automation',
    seasonal: 'Wedding season starting - get organized now'
  },
  
  couple_side: {
    timeline: 'Wedding in {days} - connect vendors now',
    vendor_joined: '{Vendor} just joined - connect today',
    completion: 'Finish setup to save 4 hours this week'
  }
}
```

## Viral Analytics & Optimization

### Key Metrics to Track

```
interface ViralAnalytics {
  // Invitation Metrics
  invitations_sent: number
  invitation_open_rate: number      // Target: >60%
  invitation_click_rate: number     // Target: >25%
  invitation_conversion: number     // Target: >15%
  
  // Activation Metrics
  time_to_first_invite: number      // Target: <3 days
  time_to_activation: number        // Target: <10 minutes
  activation_rate: number           // Target: >40%
  
  // Retention Impact
  retained_via_referral: number     // vs. organic
  ltv_referred_users: number        // vs. organic
  
  // Viral Coefficient
  k_factor_daily: number
  k_factor_weekly: number
  k_factor_monthly: number
  
  // Growth Velocity
  doubling_time: number             // Days to 2x users
  compound_monthly_growth: number   // %
}
```

### A/B Testing Framework

```
const viralExperiments = [
  {
    test: 'Invitation Copy',
    variants: [
      'Never fill forms twice',
      'Save 4 hours planning',
      'Join your wedding team'
    ],
    metric: 'conversion_rate'
  },
  {
    test: 'Incentive Timing',
    variants: [
      'Immediate reward',
      'After first activation',
      'Milestone-based'
    ],
    metric: 'invitation_rate'
  },
  {
    test: 'Social Proof Type',
    variants: [
      'Number of users',
      'Time saved',
      'Peer testimonials'
    ],
    metric: 'signup_rate'
  }
]
```

## Viral Defense Strategy

### Preventing Viral Breakdown

```
const viralDefense = {
  quality_maintenance: {
    issue: 'Bad experience kills viral growth',
    solution: 'Onboarding success team for first 100 users',
    metric: 'NPS must stay >50'
  },
  
  incentive_gaming: {
    issue: 'Fake accounts for rewards',
    solution: 'Activation requirements before rewards',
    metric: 'Real activation rate >80%'
  },
  
  network_saturation: {
    issue: 'Running out of new users',
    solution: 'Geographic expansion strategy',
    metric: 'New market penetration rate'
  }
}
```

## Implementation Timeline

### Month 1-2: Foundation

- Basic invitation system
- Email templates
- Tracking infrastructure
- Initial incentive structure

### Month 3-4: Optimization

- A/B testing framework
- Refined triggers
- Social proof integration
- Referral rewards

### Month 5-6: Amplification

- Advanced gamification
- Category-specific strategies
- Geographic expansion
- Partner integrations

## Success Indicators

```
const successMetrics = {
  month_1: {
    k_factor: 0.5,
    active_inviters: 20,
    conversion_rate: 0.05
  },
  month_3: {
    k_factor: 1.0,
    active_inviters: 100,
    conversion_rate: 0.10
  },
  month_6: {
    k_factor: 1.5,
    active_inviters: 500,
    conversion_rate: 0.15
  },
  month_12: {
    k_factor: 2.0,
    active_inviters: 5000,
    conversion_rate: 0.20
  }
}
```

This viral growth strategy ensures that every user naturally becomes an advocate, creating sustainable, exponential growth without heavy marketing spend.