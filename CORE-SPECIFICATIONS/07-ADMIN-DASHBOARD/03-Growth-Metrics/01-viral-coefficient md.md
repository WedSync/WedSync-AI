# 01-viral-coefficient.md

# Enhanced Viral Coefficient Tracking System for WedSync

## What to Build

Advanced viral coefficient tracking system with wedding-industry specific metrics, seasonal adjustments, and multi-dimensional network effect analysis for the supplier-couple-supplier growth loop.

## Key Technical Requirements

### Enhanced Viral Metrics Structure

```tsx
interface EnhancedViralCoefficient {
  // Core Metrics
  coefficient: number // K-factor (target > 1.0)
  adjustedCoefficient: number // Seasonally adjusted
  sustainableCoefficient: number // Excluding one-time events

  // Invitation Metrics
  invitationRate: number
  acceptanceRate: number
  activationRate: number // Signed up → Active user
  avgInvitesPerUser: number
  qualityScore: number // Quality of invited users

  // Time Metrics
  timeToInvite: number // Days from signup
  viralCycleTime: number // Full loop completion
  velocityTrend: 'accelerating' | 'stable' | 'decelerating'

  // Loop Analysis
  loops: ViralLoop[]
  dominantLoop: string
  loopEfficiency: number

  // Wedding Context
  weddingSeasonMultiplier: number
  vendorTypeBreakdown: VendorViralMetrics[]
  geographicSpread: GeoViralData[]
}

interface ViralLoop {
  type: 'supplier_to_couple' | 'couple_to_supplier' | 'supplier_to_supplier' | 'couple_to_couple'
  count: number
  conversionRate: number
  avgCycleTime: number
  revenue: number // Revenue generated from this loop
  quality: number // Retention rate of users from this loop
  amplification: number // Secondary invites from this loop
}

interface VendorViralMetrics {
  vendorType: 'photographer' | 'venue' | 'planner' | 'caterer' | 'dj' | 'florist'
  viralCoefficient: number
  avgNetworkSize: number
  crossReferralRate: number // Referrals to other vendor types
  seasonalPattern: number[]
}

interface WeddingNetworkEffect {
  weddingCohort: string // Couples getting married in same period
  vendorOverlap: number // Shared vendors between couples
  referralChains: number // Multi-hop referrals
  networkDensity: number // Connections per node
  clusterCoefficient: number // How tightly connected
}

```

### Advanced Viral Coefficient Calculator

```tsx
class AdvancedViralCalculator {
  private readonly WEDDING_SEASONS = {
    peak: [5, 6, 7, 8, 9], // May-September
    shoulder: [4, 10], // April, October
    off: [1, 2, 3, 11, 12] // Winter months
  }

  async calculateEnhanced(period: DateRange): Promise<EnhancedViralCoefficient> {
    const cohortUsers = await this.getCohortUsers(period)

    // Calculate base viral coefficient
    const baseCoefficient = await this.calculateBaseCoefficient(cohortUsers)

    // Apply wedding industry adjustments
    const seasonalAdjustment = this.getSeasonalAdjustment(period)
    const qualityAdjustment = await this.calculateQualityAdjustment(cohortUsers)

    // Calculate sustainable coefficient (removing one-time spikes)
    const sustainableCoefficient = await this.calculateSustainableCoefficient(
      cohortUsers,
      baseCoefficient
    )

    // Analyze viral loops with revenue attribution
    const loops = await this.analyzeEnhancedLoops(cohortUsers)

    // Wedding-specific network effects
    const networkEffects = await this.analyzeWeddingNetworkEffects(cohortUsers)

    // Vendor-specific viral metrics
    const vendorMetrics = await this.analyzeVendorViralMetrics(cohortUsers)

    return {
      coefficient: baseCoefficient,
      adjustedCoefficient: baseCoefficient * seasonalAdjustment,
      sustainableCoefficient,
      invitationRate: await this.getInvitationRate(cohortUsers),
      acceptanceRate: await this.getAcceptanceRate(cohortUsers),
      activationRate: await this.getActivationRate(cohortUsers),
      avgInvitesPerUser: await this.getAvgInvites(cohortUsers),
      qualityScore: qualityAdjustment,
      timeToInvite: await this.avgTimeToFirstInvite(cohortUsers),
      viralCycleTime: await this.avgCycleTime(loops),
      velocityTrend: await this.getVelocityTrend(),
      loops,
      dominantLoop: this.identifyDominantLoop(loops),
      loopEfficiency: this.calculateLoopEfficiency(loops),
      weddingSeasonMultiplier: seasonalAdjustment,
      vendorTypeBreakdown: vendorMetrics,
      geographicSpread: await this.analyzeGeographicVirality(cohortUsers)
    }
  }

  private async analyzeEnhancedLoops(users: string[]): Promise<ViralLoop[]> {
    // Track complex multi-hop referral chains
    const loops = await db.query(`
      WITH RECURSIVE referral_chain AS (
        -- Base case: direct invitations
        SELECT
          i.inviter_id,
          i.invitee_id,
          i.inviter_type,
          i.invitee_type,
          1 as depth,
          ARRAY[i.inviter_id] as path,
          i.created_at as start_time,
          i.created_at as end_time
        FROM invitations i
        WHERE i.status = 'activated'
          AND i.inviter_id = ANY($1)

        UNION ALL

        -- Recursive case: follow the chain
        SELECT
          rc.inviter_id as original_inviter,
          i.invitee_id,
          rc.inviter_type as original_type,
          i.invitee_type,
          rc.depth + 1,
          rc.path || i.inviter_id,
          rc.start_time,
          i.created_at as end_time
        FROM referral_chain rc
        JOIN invitations i ON rc.invitee_id = i.inviter_id
        WHERE i.status = 'activated'
          AND rc.depth < 5 -- Limit depth
          AND NOT (i.invitee_id = ANY(rc.path)) -- Prevent cycles
      ),
      loop_analysis AS (
        SELECT
          CASE
            WHEN original_type = 'supplier' AND invitee_type = 'couple' THEN 'supplier_to_couple'
            WHEN original_type = 'couple' AND invitee_type = 'supplier' THEN 'couple_to_supplier'
            WHEN original_type = 'supplier' AND invitee_type = 'supplier' THEN 'supplier_to_supplier'
            ELSE 'couple_to_couple'
          END as loop_type,
          COUNT(*) as loop_count,
          AVG(EXTRACT(EPOCH FROM (end_time - start_time))/86400) as avg_cycle_days,
          COUNT(DISTINCT invitee_id) as unique_converts,
          AVG(depth) as avg_depth
        FROM referral_chain
        GROUP BY loop_type
      ),
      revenue_attribution AS (
        SELECT
          rc.loop_type,
          SUM(s.mrr) as loop_revenue,
          AVG(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as retention_rate
        FROM referral_chain rc
        JOIN subscriptions s ON s.user_id = rc.invitee_id
        GROUP BY rc.loop_type
      )
      SELECT
        la.*,
        ra.loop_revenue,
        ra.retention_rate
      FROM loop_analysis la
      LEFT JOIN revenue_attribution ra ON la.loop_type = ra.loop_type
    `, [users])

    return loops.map(loop => ({
      type: loop.loop_type,
      count: loop.loop_count,
      conversionRate: loop.unique_converts / users.length,
      avgCycleTime: loop.avg_cycle_days,
      revenue: loop.loop_revenue || 0,
      quality: loop.retention_rate || 0,
      amplification: loop.avg_depth
    }))
  }

  private async calculateSustainableCoefficient(
    users: string[],
    baseCoefficient: number
  ): Promise<number> {
    // Remove outliers and one-time events
    const invitationStats = await db.query(`
      SELECT
        user_id,
        invites_sent,
        invites_accepted,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY invites_sent) as median_invites,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY invites_sent) as q3_invites
      FROM user_invitation_stats
      WHERE user_id = ANY($1)
      GROUP BY user_id, invites_sent, invites_accepted
    `, [users])

    // Filter out users with abnormally high invitation rates (likely bulk imports)
    const sustainableUsers = invitationStats.filter(
      stat => stat.invites_sent <= stat.q3_invites * 1.5
    )

    const sustainableRate = sustainableUsers.length / users.length
    return baseCoefficient * sustainableRate * 0.85 // Conservative estimate
  }
}

```

### Wedding-Specific Viral Tracking

```tsx
class WeddingViralAnalyzer {
  async analyzeWeddingCohortVirality(weddingDate: Date) {
    // Track how couples getting married around the same time influence each other
    const cohortWindow = 60 // days

    const weddingCohort = await db.query(`
      SELECT
        c1.id as couple_id,
        c1.wedding_date,
        COUNT(DISTINCT c2.id) as connected_couples,
        COUNT(DISTINCT v.id) as shared_vendors,
        AVG(CASE WHEN c2.referred_by = c1.id THEN 1 ELSE 0 END) as referral_rate
      FROM couples c1
      LEFT JOIN couples c2 ON
        ABS(EXTRACT(EPOCH FROM (c2.wedding_date - c1.wedding_date))/86400) < $1
        AND c2.id != c1.id
      LEFT JOIN vendor_connections vc1 ON vc1.couple_id = c1.id
      LEFT JOIN vendor_connections vc2 ON vc2.couple_id = c2.id
        AND vc1.vendor_id = vc2.vendor_id
      LEFT JOIN vendors v ON v.id = vc1.vendor_id
      WHERE c1.wedding_date BETWEEN $2 AND $3
      GROUP BY c1.id, c1.wedding_date
    `, [cohortWindow, weddingDate, new Date(weddingDate.getTime() + 86400000)])

    return this.analyzeNetworkDensity(weddingCohort)
  }

  async trackVendorReferralNetwork() {
    // Analyze how vendors refer each other within wedding parties
    return await db.query(`
      WITH vendor_referrals AS (
        SELECT
          v1.vendor_type as referrer_type,
          v2.vendor_type as referred_type,
          COUNT(*) as referral_count,
          AVG(CASE WHEN v2.status = 'active' THEN 1 ELSE 0 END) as success_rate
        FROM vendors v1
        JOIN invitations i ON i.inviter_id = v1.user_id
        JOIN vendors v2 ON v2.user_id = i.invitee_id
        WHERE i.status = 'activated'
        GROUP BY v1.vendor_type, v2.vendor_type
      )
      SELECT
        referrer_type,
        referred_type,
        referral_count,
        success_rate,
        referral_count * success_rate as effective_referrals
      FROM vendor_referrals
      ORDER BY effective_referrals DESC
    `)
  }
}

```

### Enhanced Viral Dashboard Component

```tsx
const EnhancedViralDashboard = () => {
  const [timeframe, setTimeframe] = useState('30d')
  const [view, setView] = useState<'overview' | 'loops' | 'geographic' | 'seasonal'>('overview')
  const viralData = useEnhancedViralMetrics(timeframe)

  return (
    <div className="enhanced-viral-dashboard">
      {/* Viral Health Score */}
      <ViralHealthScore
        coefficient={viralData.coefficient}
        sustainable={viralData.sustainableCoefficient}
        velocity={viralData.velocityTrend}
        quality={viralData.qualityScore}
      />

      {/* Multi-Dimensional Viral Coefficient */}
      <div className="viral-coefficient-matrix">
        <div className="coefficient-card">
          <h3>Raw K-Factor</h3>
          <div className="value">{viralData.coefficient.toFixed(2)}</div>
        </div>
        <div className="coefficient-card">
          <h3>Seasonal Adjusted</h3>
          <div className="value">{viralData.adjustedCoefficient.toFixed(2)}</div>
          <div className="season-indicator">
            {getCurrentWeddingSeason()} Season
          </div>
        </div>
        <div className="coefficient-card">
          <h3>Sustainable</h3>
          <div className="value">{viralData.sustainableCoefficient.toFixed(2)}</div>
          <div className="subtitle">Excluding outliers</div>
        </div>
      </div>

      {/* Viral Loop Sankey with Revenue */}
      <ViralLoopSankeyEnhanced
        loops={viralData.loops}
        showRevenue={true}
        showQuality={true}
      />

      {/* Vendor Type Performance */}
      <VendorViralHeatmap
        vendors={viralData.vendorTypeBreakdown}
        onVendorClick={(type) => drillIntoVendorType(type)}
      />

      {/* Geographic Viral Spread */}
      <GeographicViralMap
        data={viralData.geographicSpread}
        heatmapMode="viral_coefficient"
      />

      {/* Wedding Cohort Network Graph */}
      <WeddingCohortNetwork
        cohortSize={viralData.weddingCohortSize}
        networkDensity={viralData.networkDensity}
        avgSharedVendors={viralData.avgSharedVendors}
      />

      {/* Viral Prediction Model */}
      <ViralGrowthPredictor
        currentCoefficient={viralData.coefficient}
        trend={viralData.velocityTrend}
        seasonalFactors={viralData.seasonalPattern}
      />
    </div>
  )
}

```

### Viral Optimization Engine

```tsx
class ViralOptimizationEngine {
  async identifyViralBottlenecks(): Promise<ViralBottleneck[]> {
    const bottlenecks: ViralBottleneck[] = []

    // Analyze each stage of viral loop
    const funnelStages = await this.getViralFunnel()

    for (const stage of funnelStages) {
      if (stage.dropoffRate > 0.3) {
        bottlenecks.push({
          stage: stage.name,
          currentRate: stage.conversionRate,
          benchmarkRate: stage.industryBenchmark,
          impact: this.calculateImpact(stage),
          recommendations: await this.getRecommendations(stage)
        })
      }
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact)
  }

  async simulateViralIntervention(
    intervention: ViralIntervention
  ): Promise<SimulationResult> {
    const baseline = await this.getCurrentViralMetrics()

    // Simulate the intervention
    const projectedMetrics = {
      invitationRate: baseline.invitationRate * (1 + intervention.inviteRateChange),
      acceptanceRate: baseline.acceptanceRate * (1 + intervention.acceptRateChange),
      activationRate: baseline.activationRate * (1 + intervention.activationRateChange)
    }

    const newCoefficient =
      projectedMetrics.invitationRate *
      this.avgInvitesPerUser *
      projectedMetrics.acceptanceRate *
      projectedMetrics.activationRate

    const growthImpact = this.projectGrowth(
      baseline.coefficient,
      newCoefficient,
      90 // days
    )

    return {
      currentCoefficient: baseline.coefficient,
      projectedCoefficient: newCoefficient,
      userGrowthImpact: growthImpact,
      revenueImpact: growthImpact * baseline.avgUserValue,
      confidence: this.calculateConfidence(intervention),
      breakEvenDays: this.calculateBreakEven(intervention.cost, growthImpact)
    }
  }

  async getPersonalizedInviteStrategy(userId: string): Promise<InviteStrategy> {
    const userProfile = await this.getUserProfile(userId)
    const vendorType = userProfile.vendorType

    // Get optimal invitation strategy based on vendor type
    const strategies = {
      photographer: {
        optimalTiming: 'after_photoshoot',
        message: 'Share your beautiful photos and planning tools',
        incentive: 'photo_gallery_upgrade',
        channels: ['email', 'in_app']
      },
      venue: {
        optimalTiming: 'after_tour',
        message: 'Connect your couples with preferred vendors',
        incentive: 'featured_listing',
        channels: ['email', 'partner_portal']
      },
      planner: {
        optimalTiming: 'contract_signed',
        message: 'Streamline planning for all your couples',
        incentive: 'bulk_discount',
        channels: ['email', 'sms', 'in_app']
      }
    }

    return strategies[vendorType] || strategies.photographer
  }
}

```

### A/B Testing for Viral Optimization

```tsx
class ViralExperiments {
  async runInvitationExperiment() {
    const variants = [
      {
        id: 'control',
        timing: 'day_3',
        message: 'Invite your couples',
        incentive: 'none'
      },
      {
        id: 'immediate',
        timing: 'immediate',
        message: 'Get started by inviting your couples',
        incentive: '1_month_free'
      },
      {
        id: 'social_proof',
        timing: 'day_1',
        message: '73% of photographers invite 5+ couples in first week',
        incentive: 'premium_features'
      },
      {
        id: 'reciprocal',
        timing: 'day_2',
        message: 'Unlock features as your couples join',
        incentive: 'progressive_unlock'
      }
    ]

    // Track performance
    const results = await this.trackExperimentResults(variants)

    return {
      winner: results.sort((a, b) => b.viralCoefficient - a.viralCoefficient)[0],
      uplift: (results[0].viralCoefficient - control.viralCoefficient) / control.viralCoefficient
    }
  }
}

```

## Critical Implementation Notes

- **Seasonal Adjustments**: Wedding industry has strong seasonality - adjust targets accordingly
- **Quality vs Quantity**: Track revenue per viral loop, not just user count
- **Vendor Networks**: Photographers and planners have highest viral potential
- **Geographic Clustering**: Weddings cluster geographically - optimize for local network effects
- **Timing Optimization**: Best invitation time is right after positive interaction (photo delivery, venue tour)
- **Prevent Invite Fatigue**: Limit invitation prompts to maintain quality
- **Mobile Optimization**: 67% of invites opened on mobile - optimize flows
- **Referral Rewards**: Two-sided rewards (both inviter and invitee) work best

## Enhanced Database Structure

```sql
-- Enhanced invitation tracking with attribution
CREATE TABLE invitation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES users(id),
  inviter_type TEXT CHECK (inviter_type IN ('supplier', 'couple')),
  inviter_vendor_type TEXT,
  invitee_email TEXT NOT NULL,
  invitee_type TEXT CHECK (invitee_type IN ('supplier', 'couple')),
  invitation_code TEXT UNIQUE,

  -- Enhanced status tracking
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_channel TEXT, -- email, sms, in_app
  opened_at TIMESTAMPTZ,
  opened_device TEXT,
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,

  -- Attribution & quality
  invitee_id UUID REFERENCES users(id),
  attribution_value DECIMAL(10, 2), -- Revenue attributed to this invite
  quality_score DECIMAL(3, 2), -- 0-1 score based on invitee behavior

  -- Context
  invitation_context JSONB, -- Where/when/why invited
  experiment_variant TEXT,
  incentive_offered TEXT,

  -- Network effects
  network_distance INTEGER, -- Degrees of separation
  shared_connections INTEGER, -- Mutual connections

  CONSTRAINT unique_invitation UNIQUE(inviter_id, invitee_email)
);

-- Viral loop performance tracking
CREATE TABLE viral_loop_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Volume metrics
  loop_count INTEGER,
  unique_participants INTEGER,

  -- Performance metrics
  avg_cycle_time_days DECIMAL(5, 2),
  conversion_rate DECIMAL(4, 3),
  activation_rate DECIMAL(4, 3),

  -- Quality metrics
  revenue_generated DECIMAL(10, 2),
  ltv_cohort DECIMAL(10, 2),
  retention_30d DECIMAL(4, 3),
  retention_90d DECIMAL(4, 3),

  -- Network metrics
  avg_network_size DECIMAL(6, 2),
  network_density DECIMAL(4, 3),
  clustering_coefficient DECIMAL(4, 3),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(loop_type, start_date, end_date)
);

-- Wedding cohort network analysis
CREATE TABLE wedding_cohort_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_month DATE NOT NULL,

  -- Cohort metrics
  total_couples INTEGER,
  total_vendors INTEGER,

  -- Network metrics
  avg_vendors_per_couple DECIMAL(4, 2),
  avg_couples_per_vendor DECIMAL(5, 2),
  vendor_overlap_rate DECIMAL(4, 3), -- % sharing vendors

  -- Viral metrics
  intra_cohort_referrals INTEGER,
  cross_cohort_referrals INTEGER,
  viral_coefficient DECIMAL(4, 3),

  -- Geographic distribution
  geographic_clusters JSONB,
  primary_regions TEXT[],

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cohort_month)
);

-- Vendor referral network
CREATE TABLE vendor_referral_network (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id),
  referrer_type TEXT,
  referred_id UUID REFERENCES users(id),
  referred_type TEXT,

  -- Referral context
  referral_context TEXT, -- same_wedding, professional_network, etc
  wedding_id UUID,

  -- Performance
  referral_quality DECIMAL(3, 2),
  resulted_in_booking BOOLEAN,
  booking_value DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_performance ON invitation_tracking(status, quality_score);
CREATE INDEX idx_viral_loops_date ON viral_loop_metrics(start_date, loop_type);
CREATE INDEX idx_wedding_cohorts ON wedding_cohort_networks(cohort_month);
CREATE INDEX idx_vendor_network ON vendor_referral_network(referrer_id, referred_id);

```

## Success Metrics

- **Primary KPI**: Viral coefficient > 1.2 (accounting for seasonality)
- **Sustainable K**: > 0.8 (removing outliers and one-time events)
- **Viral Cycle Time**: < 14 days
- **Invitation → Activation**: > 25%
- **Network Density**: > 3.5 connections per user
- **Revenue per Viral Loop**: > £50
- **Geographic Spread**: New cities every month