# 04-marketing-automation.md

## What to Build

An automated marketing system leveraging the viral loop where couples invite suppliers and suppliers invite more couples. Focus on trigger-based campaigns, referral tracking, and conversion optimization.

## Technical Requirements

### Database Schema

```
-- Campaign tracking
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT, -- 'email', 'in_app', 'referral'
  target_audience TEXT, -- 'suppliers', 'couples', 'prospects'
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attribution tracking
CREATE TABLE attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_type TEXT, -- 'supplier' or 'couple'
  source TEXT, -- 'couple_invite', 'supplier_invite', 'organic', 'paid'
  referrer_id UUID,
  campaign_id UUID REFERENCES marketing_campaigns(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Viral tracking
CREATE TABLE viral_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action_type TEXT, -- 'sent_invite', 'accepted_invite', 'activated'
  recipient_email TEXT,
  status TEXT, -- 'pending', 'accepted', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Viral Loop Automation

```
// Core viral mechanics
export class ViralEngine {
  // When couple connects a supplier
  async onCoupleInvitesSupplier(
    coupleId: string,
    supplierEmail: string,
    weddingDetails: WeddingContext
  ) {
    // Generate personalized invite
    const inviteCode = await generateInviteCode();
    
    const emailData = {
      from: 'couple_name',
      weddingDate: [weddingDetails.date](http://weddingDetails.date),
      venue: weddingDetails.venue,
      inviteLink: `${BASE_URL}/supplier/invite/${inviteCode}`,
      valueProps: [
        'Your client wants to collaborate',
        'Auto-fill forms with their wedding details',
        'Join 2,847 other suppliers saving 10+ hours/week'
      ]
    };
    
    await sendSupplierInvite(supplierEmail, emailData);
    await trackViralAction(coupleId, 'sent_supplier_invite');
  }
  
  // When supplier invites their clients
  async onSupplierInvitesClient(
    supplierId: string,
    clientEmail: string
  ) {
    const supplier = await getSupplierDetails(supplierId);
    
    const emailData = {
      supplierName: supplier.businessName,
      supplierType: supplier.vendorType, // 'Photography', 'DJ', etc
      benefitForCouple: 'Free wedding planning dashboard',
      inviteLink: `${BASE_URL}/couple/invite/${inviteCode}`
    };
    
    await sendCoupleInvite(clientEmail, emailData);
    await trackViralAction(supplierId, 'sent_couple_invite');
  }
}
```

### Automated Email Sequences

```
const SUPPLIER_NURTURE_SEQUENCE = [
  {
    trigger: 'supplier_signup',
    delay: 0,
    email: 'welcome_supplier',
    personalization: ['vendor_type', 'business_name']
  },
  {
    trigger: 'no_clients_imported',
    delay: '3_days',
    email: 'import_clients_guide',
    includeVideo: true
  },
  {
    trigger: 'first_client_connected',
    delay: 0,
    email: 'celebrate_first_connection',
    incentive: 'unlock_premium_template'
  },
  {
    trigger: 'client_completed_form',
    delay: 0,
    email: 'form_completion_notification',
    action: 'view_responses'
  },
  {
    trigger: '5_clients_connected',
    delay: 0,
    email: 'power_user_tips',
    upgrade_prompt: true
  }
];

const COUPLE_ACTIVATION_SEQUENCE = [
  {
    trigger: 'couple_signup',
    delay: 0,
    email: 'welcome_to_wedme'
  },
  {
    trigger: 'no_suppliers_connected',
    delay: '2_days',
    email: 'find_your_suppliers'
  },
  {
    trigger: 'wedding_6_months_away',
    delay: 0,
    email: 'planning_timeline'
  }
];
```

### Referral Incentive System

```
export class ReferralIncentives {
  // Track and reward successful referrals
  async processSuccessfulReferral(
    referrerId: string,
    referredId: string,
    type: 'supplier' | 'couple'
  ) {
    // Award points/credits
    const reward = this.calculateReward(type);
    
    if (type === 'supplier') {
      // Supplier referred another supplier
      await this.grantFeatureCredit(referrerId, 'extra_month_free');
    } else {
      // Supplier referred a couple who activated
      await this.incrementReferralCount(referrerId);
      
      // Milestone rewards
      const count = await this.getReferralCount(referrerId);
      if (count === 5) {
        await this.unlockPremiumFeature(referrerId, 'ai_chatbot');
      }
    }
    
    // Send celebration email
    await this.sendReferralSuccess(referrerId, reward);
  }
}
```

### In-App Marketing Messages

```
export function MarketingBanner({ user }: Props) {
  const [banner, setBanner] = useState<Banner | null>(null);
  
  useEffect(() => {
    // Determine which banner to show
    const banner = selectBanner({
      userType: user.type,
      tier: user.subscription_tier,
      daysActive: user.days_since_signup,
      behavior: user.recent_actions
    });
    
    setBanner(banner);
  }, [user]);
  
  const bannerTemplates = {
    invite_more_clients: {
      message: 'Invite 3 more clients and unlock AI features free for a month',
      cta: 'Invite Clients',
      action: () => openInviteModal()
    },
    upgrade_prompt: {
      message: 'You\'re using 80% of your plan. Upgrade for unlimited clients',
      cta: 'View Plans',
      action: () => router.push('/pricing')
    },
    feature_discovery: {
      message: 'Did you know? You can automate review requests',
      cta: 'Learn More',
      action: () => openFeatureGuide('reviews')
    }
  };
  
  if (!banner) return null;
  
  return (
    <div className="marketing-banner">
      {bannerTemplates[banner.type]}
      <button onClick={() => dismissBanner([banner.id](http://banner.id))}>×</button>
    </div>
  );
}
```

### Conversion Tracking

```
export async function trackConversion(
  userId: string,
  conversionType: string,
  metadata: any
) {
  // Get attribution data
  const attribution = await getAttribution(userId);
  
  const conversionData = {
    user_id: userId,
    type: conversionType, // 'trial_start', 'paid_conversion', 'referral'
    source: attribution.source,
    campaign_id: attribution.campaign_id,
    value: calculateConversionValue(conversionType),
    metadata
  };
  
  await supabase.from('conversions').insert(conversionData);
  
  // Update campaign metrics
  if (attribution.campaign_id) {
    await updateCampaignMetrics(attribution.campaign_id, conversionType);
  }
  
  // Track viral coefficient
  if (attribution.source === 'referral') {
    await updateViralCoefficient(attribution.referrer_id);
  }
}
```

### A/B Testing Framework

```
interface MarketingExperiment {
  id: string;
  variants: {
    control: any;
    treatment: any;
  };
  allocation: number; // % to treatment
  metrics: string[]; // What to measure
}

// Example: Testing invite email subject lines
const inviteEmailTest: MarketingExperiment = {
  id: 'supplier_invite_subject',
  variants: {
    control: 'Emma & James want to connect on WedSync',
    treatment: 'Your client invited you to save 10+ hours per wedding'
  },
  allocation: 50,
  metrics: ['open_rate', 'click_rate', 'signup_rate']
};
```

## Critical Implementation Notes

1. **Double-Sided Value**: Always emphasize value for both sides of marketplace
2. **Timing is Key**: Wedding planning has natural triggers (6 months out, 3 months out)
3. **Vendor-Specific**: Photographers care about different things than DJs
4. **Social Proof**: Include real numbers ("Join 2,847 suppliers")
5. **Mobile First**: Most couples check email on phones

## API Endpoints

```
// POST /api/marketing/track-invite
// Tracks viral invitation sent

// GET /api/marketing/attribution/:userId
// Returns attribution data for user

// POST /api/marketing/conversion
// Records conversion event

// GET /api/marketing/viral-coefficient
// Returns current viral metrics
```

## Monitoring Metrics

- Viral coefficient (target: >1.0)
- Invite acceptance rate (target: 30%)
- Time to first invite sent
- Email open/click rates by segment
- Conversion rate by source
- LTV by acquisition channel