# 05-viral-optimization.md

## What to Build

A comprehensive system to maximize viral growth through invitation flows, network effects measurement, and continuous optimization of viral loops. Target: achieve viral coefficient >1.0.

## Technical Requirements

### Database Schema

```
-- Viral metrics tracking
CREATE TABLE viral_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE,
  invites_sent INT DEFAULT 0,
  invites_accepted INT DEFAULT 0,
  users_who_invited INT DEFAULT 0,
  total_active_users INT,
  viral_coefficient DECIMAL(3,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation funnel tracking
CREATE TABLE invitation_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id UUID,
  sender_id UUID,
  recipient_email TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

-- Network effects mapping
CREATE TABLE network_connections (
  supplier_id UUID REFERENCES suppliers(id),
  couple_id UUID REFERENCES couples(id),
  connection_type TEXT, -- 'direct', 'referred', 'discovered'
  connection_strength INT, -- 1-10 based on interaction
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Viral Coefficient Calculation

```
export class ViralMetrics {
  // K-factor = (invites sent per user) × (conversion rate)
  async calculateViralCoefficient(
    period: DateRange
  ): Promise<number> {
    const metrics = await this.getMetricsForPeriod(period);
    
    const invitesPerUser = metrics.invites_sent / metrics.users_who_invited;
    const conversionRate = metrics.invites_accepted / metrics.invites_sent;
    const viralCoefficient = invitesPerUser * conversionRate;
    
    // Track additional metrics
    const cycleTime = await this.calculateCycleTime(period);
    const amplificationRate = await this.calculateAmplification(period);
    
    return {
      coefficient: viralCoefficient,
      invitesPerUser,
      conversionRate,
      cycleTime, // Days from signup to first invite
      amplificationRate // Secondary invites generated
    };
  }
}
```

### Optimized Invitation Flow

```
export class OptimizedInviteFlow {
  // Multi-channel invitation strategy
  async sendOptimizedInvite(
    sender: User,
    recipient: string,
    context: InviteContext
  ) {
    // Determine best channel based on data
    const channel = await this.selectBestChannel(recipient);
    
    // Personalize based on relationship
    const template = await this.selectTemplate({
      senderType: sender.type,
      relationship: context.relationship,
      weddingStage: context.weddingStage
    });
    
    // Time optimization
    const sendTime = await this.optimizeSendTime(recipient);
    
    // A/B test elements
    const variant = await this.selectVariant([
      'social_proof_focus',
      'value_prop_focus',
      'urgency_focus'
    ]);
    
    const invite = {
      channel,
      template,
      sendTime,
      variant,
      tracking: generateTrackingId()
    };
    
    await this.scheduleInvite(invite);
    return invite;
  }
}
```

### Invitation Templates by Context

```
const CONTEXT_BASED_TEMPLATES = {
  // Couple inviting photographer
  couple_to_photographer: {
    subject: 'We\'d love to collaborate for our wedding!',
    preview: 'Sarah\'s Photography recommended you...',
    hooks: [
      'mutual_connection', // If referred by another vendor
      'venue_specific', // If venue is known
      'timeline_urgency' // If wedding is soon
    ]
  },
  
  // Photographer inviting couple
  photographer_to_couple: {
    subject: 'Your wedding photography portal is ready',
    hooks: [
      'exclusive_access',
      'time_saving',
      'vendor_coordination'
    ],
    social_proof: '847 couples planning with WedMe this month'
  },
  
  // Supplier to supplier (referral)
  supplier_to_supplier: {
    subject: 'Thought you\'d love this (I\'m saving 10hrs/week)',
    hooks: [
      'peer_recommendation',
      'specific_pain_point',
      'success_metrics'
    ]
  }
};
```

### Network Effects Amplification

```
export class NetworkAmplifier {
  // Identify and activate super-connectors
  async identifySuperConnectors(): Promise<User[]> {
    // Find users with high connection potential
    const query = `
      SELECT u.*, 
             COUNT(DISTINCT nc.couple_id) as couple_connections,
             COUNT(DISTINCT inv.recipient_email) as invites_sent,
             AVG(nc.connection_strength) as avg_strength
      FROM users u
      LEFT JOIN network_connections nc ON [u.id](http://u.id) = nc.supplier_id
      LEFT JOIN viral_actions inv ON [u.id](http://u.id) = [inv.actor](http://inv.actor)_id
      GROUP BY [u.id](http://u.id)
      HAVING couple_connections > 20
      ORDER BY (couple_connections * avg_strength) DESC
    `;
    
    return await db.query(query);
  }
  
  // Activate dormant network connections
  async reactivateDormantNetworks() {
    const dormantConnections = await this.findDormantConnections();
    
    for (const connection of dormantConnections) {
      const reactivationStrategy = this.selectStrategy({
        lastActivity: connection.last_activity,
        connectionStrength: connection.strength,
        supplierType: connection.supplier_type
      });
      
      await this.executeReactivation(connection, reactivationStrategy);
    }
  }
}
```

### Viral Loop Optimization

```
export class ViralLoopOptimizer {
  // Reduce friction in invitation process
  async optimizeInvitationFriction() {
    return {
      // Bulk invite optimization
      bulkInvite: {
        csvImport: true,
        googleContactsSync: true,
        smartSuggestions: true // AI-powered recipient suggestions
      },
      
      // One-click invitations
      quickInvite: {
        preFilledTemplates: true,
        autoPersonalization: true,
        batchSending: true
      },
      
      // Social sharing
      socialAmplification: {
        whatsappIntegration: true,
        instagramStories: true,
        facebookGroups: true // Wedding planning groups
      }
    };
  }
  
  // Incentive optimization
  async testIncentiveStructures() {
    const experiments = [
      {
        name: 'mutual_benefit',
        sender_reward: 'extra_month_free',
        recipient_reward: '20%_discount'
      },
      {
        name: 'milestone_based',
        rewards: {
          invite_3: 'unlock_feature',
          invite_5: 'premium_template',
          invite_10: 'free_quarter'
        }
      },
      {
        name: 'time_limited',
        offer: 'double_credits_this_week'
      }
    ];
    
    return await this.runExperiments(experiments);
  }
}
```

### Real-time Viral Dashboard

```
export function ViralDashboard() {
  const metrics = useViralMetrics();
  
  return (
    <div className="viral-dashboard">
      <div className="key-metric">
        <h3>Viral Coefficient</h3>
        <div className="coefficient">
          {metrics.coefficient}
          {metrics.coefficient > 1 ? '🚀' : '⚠️'}
        </div>
      </div>
      
      <div className="funnel">
        <FunnelChart
          data={[
            { stage: 'Invites Sent', value: metrics.invitesSent },
            { stage: 'Opened', value: metrics.invitesOpened },
            { stage: 'Clicked', value: metrics.invitesClicked },
            { stage: 'Signed Up', value: metrics.signups },
            { stage: 'Activated', value: metrics.activated }
          ]}
        />
      </div>
      
      <div className="optimization-suggestions">
        {[metrics.suggestions.map](http://metrics.suggestions.map)(suggestion => (
          <OptimizationCard
            key={[suggestion.id](http://suggestion.id)}
            title={suggestion.title}
            impact={suggestion.estimatedImpact}
            effort={suggestion.implementation_effort}
            action={() => implementOptimization([suggestion.id](http://suggestion.id))}
          />
        ))}
      </div>
    </div>
  );
}
```

### Growth Loops Identification

```
const GROWTH_LOOPS = {
  // Core viral loop
  couple_supplier_loop: {
    steps: [
      'couple_signs_up',
      'couple_invites_suppliers',
      'supplier_joins',
      'supplier_invites_more_couples',
      'loop_repeats'
    ],
    optimizations: [
      'reduce_time_to_first_invite',
      'increase_supplier_activation_rate',
      'boost_supplier_to_couple_invites'
    ]
  },
  
  // Content loop
  template_marketplace_loop: {
    steps: [
      'supplier_creates_template',
      'other_suppliers_purchase',
      'buyers_succeed_with_template',
      'buyers_create_own_templates',
      'marketplace_grows'
    ]
  },
  
  // Network density loop
  venue_cluster_loop: {
    steps: [
      'venue_joins_platform',
      'venue_recommends_preferred_suppliers',
      'suppliers_join',
      'suppliers_bring_couples',
      'couples_book_venue_suppliers'
    ]
  }
};
```

## Critical Implementation Notes

1. **Measure Everything**: Track every step of invitation funnel
2. **Context Matters**: Wedding timeline affects invitation success
3. **Quality > Quantity**: One activated user > ten dormant signups
4. **Seasonal Patterns**: Wedding industry has natural peaks/valleys
5. **Two-Sided**: Optimize for both supplier and couple virality

## API Endpoints

```
// GET /api/viral/metrics
// Returns current viral coefficient and trends

// POST /api/viral/invite
// Sends optimized invitation

// GET /api/viral/suggestions
// Returns optimization suggestions

// POST /api/viral/experiment
// Starts A/B test for viral mechanism
```

## Monitoring Metrics

- Viral coefficient (K-factor) - Target: >1.0
- Invitation acceptance rate - Target: 30%
- Time to first invite - Target: <3 days
- Activation rate post-signup - Target: 60%
- Network density - Connections per user
- Amplification rate - Secondary invites