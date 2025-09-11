# Referral-Tracking-System

## Multi-Sided Referral Engine for Wedding Industry Growth

## Executive Overview

As a wedding photographer building WedSync/WedMe, you understand that word-of-mouth is the lifeblood of the wedding industry. This referral tracking system transforms organic recommendations into measurable, optimizable growth channels. It tracks both supplier-to-couple and couple-to-supplier referrals, creating a compound viral effect that drives sustainable growth.

## System Architecture

### Core Referral Flow Structure

```tsx
interface ReferralSystem {
  // Referral Types
  flows: {
    supplierToCouple: SupplierCoupleReferral      // Primary flow
    coupleToSupplier: CoupleSupplierReferral      // Viral amplification
    supplierToSupplier: SupplierNetworkReferral   // Professional network
    coupleToCouple: CoupleViralReferral           // Social sharing
  }

  // Tracking Components
  tracking: {
    attribution: MultiTouchAttribution
    analytics: ReferralAnalytics
    rewards: ReferralRewards
    fraud: FraudDetection
  }

  // Growth Mechanics
  mechanics: {
    incentives: IncentiveStructure
    gamification: ReferralGamification
    automation: ReferralAutomation
    optimization: GrowthOptimization
  }
}

```

## 1. Referral Attribution System

### Multi-Touch Attribution Model

```tsx
class ReferralAttribution {
  private readonly ATTRIBUTION_WINDOW = 30 // days
  private readonly COOKIE_LIFETIME = 90 // days

  async trackReferral(params: ReferralParams): Promise<ReferralRecord> {
    // Generate unique referral code
    const referralCode = this.generateReferralCode(params)

    // Create tracking record
    const referral = await db.transaction(async (trx) => {
      // Store referral intent
      const referralRecord = await trx('referrals').insert({
        id: generateId(),
        referrer_type: params.referrerType, // 'supplier' | 'couple'
        referrer_id: params.referrerId,
        referee_type: params.refereeType,
        referral_code: referralCode,
        referral_method: params.method, // 'email' | 'link' | 'qr' | 'social'
        campaign_id: params.campaignId,

        // Tracking metadata
        source_url: params.sourceUrl,
        utm_source: params.utmSource,
        utm_medium: params.utmMedium,
        utm_campaign: params.utmCampaign,

        // Context
        vendor_type: params.vendorType,
        event_date: params.eventDate,
        location: params.location,

        // Incentive tracking
        incentive_offered: params.incentive,
        incentive_amount: params.incentiveAmount,

        created_at: new Date(),
        expires_at: addDays(new Date(), this.ATTRIBUTION_WINDOW)
      }).returning('*')

      // Create shareable link
      const shareableLink = await this.createShareableLink(referralRecord)

      // Store in cache for fast lookup
      await redis.setex(
        `ref:${referralCode}`,
        this.COOKIE_LIFETIME * 86400,
        JSON.stringify(referralRecord)
      )

      return { ...referralRecord, shareableLink }
    })

    // Track referral creation event
    await this.trackEvent('referral_created', referral)

    return referral
  }

  private generateReferralCode(params: ReferralParams): string {
    // Generate memorable, wedding-themed codes
    const prefixes = {
      supplier: ['LOVE', 'WED', 'DREAM', 'BLISS', 'CHARM'],
      couple: ['COUPLE', 'UNITY', 'FOREVER', 'HEARTS', 'VOWS']
    }

    const prefix = prefixes[params.referrerType][
      Math.floor(Math.random() * prefixes[params.referrerType].length)
    ]

    // Add unique identifier
    const unique = nanoid(6).toUpperCase()

    return `${prefix}-${unique}`
  }

  async attributeConversion(
    userId: string,
    userType: 'supplier' | 'couple'
  ): Promise<Attribution> {
    // Check all attribution sources
    const attributionSources = await Promise.all([
      this.checkDirectAttribution(userId),
      this.checkCookieAttribution(userId),
      this.checkEmailAttribution(userId),
      this.checkSocialAttribution(userId),
      this.checkQRAttribution(userId)
    ])

    // Apply attribution model
    const attribution = this.applyAttributionModel(attributionSources)

    if (attribution) {
      // Record conversion
      await this.recordConversion(attribution, userId, userType)

      // Trigger rewards
      await this.triggerRewards(attribution)

      // Update viral metrics
      await this.updateViralMetrics(attribution)
    }

    return attribution
  }

  private async recordConversion(
    attribution: Attribution,
    userId: string,
    userType: string
  ) {
    await db.transaction(async (trx) => {
      // Update referral record
      await trx('referrals')
        .where('id', attribution.referralId)
        .update({
          converted: true,
          converted_at: new Date(),
          referee_id: userId,
          conversion_value: await this.calculateConversionValue(userId, userType)
        })

      // Create conversion record
      await trx('referral_conversions').insert({
        referral_id: attribution.referralId,
        referee_id: userId,
        referee_type: userType,
        attribution_model: attribution.model,
        attribution_weight: attribution.weight,
        converted_at: new Date(),

        // Journey tracking
        time_to_convert: attribution.timeToConvert,
        touchpoints: attribution.touchpoints,

        // Value tracking
        initial_plan: attribution.initialPlan,
        initial_mrr: attribution.initialMRR
      })

      // Update referrer stats
      await trx('referral_stats')
        .where('user_id', attribution.referrerId)
        .increment('successful_referrals', 1)
        .increment('total_value_generated', attribution.conversionValue)
    })
  }
}

```

## 2. Supplier → Couple Referral Flow

### Primary Growth Engine

```tsx
class SupplierToCoupleReferral {
  async createCoupleInvitation(
    supplierId: string,
    coupleData: CoupleInviteData
  ): Promise<ReferralInvite> {
    const supplier = await this.getSupplier(supplierId)

    // Create personalized invitation
    const invitation = await db.transaction(async (trx) => {
      // Generate referral
      const referral = await this.createReferral({
        referrerId: supplierId,
        referrerType: 'supplier',
        refereeType: 'couple',
        method: coupleData.method
      })

      // Create invitation record
      const invite = await trx('couple_invitations').insert({
        id: generateId(),
        referral_id: referral.id,
        supplier_id: supplierId,

        // Couple details
        couple_names: coupleData.names,
        couple_email: coupleData.email,
        couple_phone: coupleData.phone,
        wedding_date: coupleData.weddingDate,

        // Personalization
        personal_message: coupleData.message,
        supplier_name: supplier.businessName,
        supplier_type: supplier.vendorType,

        // Pre-fill benefits
        forms_shared: coupleData.sharedForms,
        prefilled_data: coupleData.prefilledData,

        // Incentives
        discount_offered: coupleData.discount,
        exclusive_content: coupleData.exclusiveContent,

        // Status
        status: 'pending',
        sent_at: new Date(),
        expires_at: addDays(new Date(), 30)
      }).returning('*')

      // Queue invitation delivery
      await this.queueInvitation(invite, referral.shareableLink)

      return invite
    })

    // Track in analytics
    await this.analytics.track('supplier_invited_couple', {
      supplierId,
      vendorType: supplier.vendorType,
      invitationId: invitation.id
    })

    return invitation
  }

  async sendBulkInvitations(
    supplierId: string,
    couples: CoupleData[]
  ): Promise<BulkInviteResult> {
    // Smart batching to avoid spam
    const batches = this.createSmartBatches(couples)

    const results = []
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(couple => this.createCoupleInvitation(supplierId, couple))
      )

      results.push(...batchResults)

      // Delay between batches
      if (batches.indexOf(batch) < batches.length - 1) {
        await sleep(1000)
      }
    }

    // Update supplier metrics
    await this.updateSupplierMetrics(supplierId, results)

    return {
      sent: results.length,
      batches: batches.length,
      estimatedConversions: this.predictConversions(results),
      nextBestTime: this.calculateNextInviteTime(supplierId)
    }
  }

  private createSmartBatches(couples: CoupleData[]): CoupleData[][] {
    // Group by wedding date proximity
    const grouped = couples.reduce((acc, couple) => {
      const monthsUntil = differenceInMonths(couple.weddingDate, new Date())
      const key = monthsUntil < 3 ? 'urgent' : monthsUntil < 6 ? 'soon' : 'future'

      if (!acc[key]) acc[key] = []
      acc[key].push(couple)

      return acc
    }, {})

    // Prioritize by urgency
    const prioritized = [
      ...(grouped.urgent || []),
      ...(grouped.soon || []),
      ...(grouped.future || [])
    ]

    // Create batches of 10
    const batches = []
    for (let i = 0; i < prioritized.length; i += 10) {
      batches.push(prioritized.slice(i, i + 10))
    }

    return batches
  }
}

```

## 3. Couple → Supplier Referral Flow

### Viral Amplification Engine

```tsx
class CoupleToSupplierReferral {
  async createSupplierReferral(
    coupleId: string,
    supplierSearch: SupplierSearch
  ): Promise<SupplierReferral> {
    const couple = await this.getCouple(coupleId)

    // Generate smart recommendations
    const recommendations = await this.generateRecommendations(
      couple,
      supplierSearch
    )

    // Create referral campaign
    const campaign = await db.transaction(async (trx) => {
      // Create campaign
      const campaign = await trx('supplier_referral_campaigns').insert({
        id: generateId(),
        couple_id: coupleId,
        vendor_type: supplierSearch.vendorType,

        // Search context
        location: supplierSearch.location,
        budget_range: supplierSearch.budget,
        style_preferences: supplierSearch.style,
        availability_needed: supplierSearch.date,

        // Recommendations
        recommended_suppliers: recommendations.map(s => s.id),
        recommendation_reasons: recommendations.map(s => s.reason),

        // Incentives for couple
        referral_bonus: this.calculateReferralBonus(couple),
        success_threshold: 1, // suppliers needed to join

        created_at: new Date()
      }).returning('*')

      // Create individual referrals
      const referrals = await Promise.all(
        recommendations.map(supplier =>
          this.createIndividualReferral(campaign, supplier, couple)
        )
      )

      return { campaign, referrals }
    })

    // Send notifications
    await this.notifySuppliers(campaign.referrals)

    return campaign
  }

  private async generateRecommendations(
    couple: Couple,
    search: SupplierSearch
  ): Promise<SupplierRecommendation[]> {
    // Get potential suppliers
    const suppliers = await db('suppliers')
      .where('vendor_type', search.vendorType)
      .where('status', 'active')
      .whereRaw('location @> ?', [search.location])
      .whereRaw('budget_range && ?', [search.budget])
      .limit(20)

    // Score and rank
    const scored = await Promise.all(
      suppliers.map(async (supplier) => {
        const score = await this.scoreSupplier(supplier, couple, search)
        return { ...supplier, score }
      })
    )

    // Sort by score and take top 5
    return scored
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 5)
      .map(supplier => ({
        id: supplier.id,
        name: supplier.business_name,
        score: supplier.score.total,
        reason: this.generateReason(supplier.score),
        incentive: this.calculateSupplierIncentive(supplier)
      }))
  }

  private async scoreSupplier(
    supplier: Supplier,
    couple: Couple,
    search: SupplierSearch
  ): Promise<SupplierScore> {
    const scores = {
      // Platform engagement (40%)
      platformActivity: await this.scorePlatformActivity(supplier),
      responseRate: supplier.response_rate * 0.1,
      completionRate: supplier.profile_completion * 0.1,

      // Match quality (30%)
      styleMatch: this.scoreStyleMatch(supplier.style, search.style),
      budgetMatch: this.scoreBudgetMatch(supplier.budget_range, search.budget),
      availabilityMatch: await this.scoreAvailability(supplier.id, search.date),

      // Social proof (20%)
      reviewScore: (supplier.avg_rating / 5) * 0.1,
      reviewCount: Math.min(supplier.review_count / 50, 1) * 0.05,
      couplesServed: Math.min(supplier.couples_served / 100, 1) * 0.05,

      // Viral potential (10%)
      previousReferrals: supplier.successful_referrals * 0.02,
      networkSize: Math.min(supplier.couple_connections / 50, 1) * 0.08
    }

    return {
      ...scores,
      total: Object.values(scores).reduce((a, b) => a + b, 0)
    }
  }
}

```

## 4. Referral Rewards System

### Incentive Management Engine

```tsx
class ReferralRewards {
  private readonly REWARD_TIERS = {
    supplier: {
      bronze: { referrals: 1, reward: 'month_free' },
      silver: { referrals: 3, reward: 'upgrade_discount' },
      gold: { referrals: 5, reward: 'annual_discount' },
      platinum: { referrals: 10, reward: 'lifetime_perks' }
    },
    couple: {
      first: { referrals: 1, reward: 'vendor_discount' },
      active: { referrals: 3, reward: 'premium_planning' },
      champion: { referrals: 5, reward: 'exclusive_vendors' }
    }
  }

  async processReferralReward(
    referralId: string,
    conversionData: ConversionData
  ): Promise<RewardResult> {
    const referral = await this.getReferral(referralId)

    // Calculate reward based on conversion value
    const reward = await this.calculateReward(referral, conversionData)

    // Process reward transaction
    const result = await db.transaction(async (trx) => {
      // Create reward record
      const rewardRecord = await trx('referral_rewards').insert({
        id: generateId(),
        referral_id: referralId,
        referrer_id: referral.referrer_id,
        referee_id: conversionData.userId,

        // Reward details
        reward_type: reward.type,
        reward_value: reward.value,
        reward_currency: reward.currency,

        // Conditions
        conversion_type: conversionData.type,
        conversion_value: conversionData.value,
        conversion_plan: conversionData.plan,

        // Status
        status: 'pending',
        created_at: new Date(),
        eligible_at: this.calculateEligibilityDate(reward),
        expires_at: addDays(new Date(), 365)
      }).returning('*')

      // Update referrer balance
      if (reward.immediate) {
        await this.creditReferrer(trx, referral.referrer_id, reward)
      }

      // Check for tier upgrades
      const tierUpgrade = await this.checkTierUpgrade(
        trx,
        referral.referrer_id,
        referral.referrer_type
      )

      if (tierUpgrade) {
        await this.processTierUpgrade(trx, tierUpgrade)
      }

      return { rewardRecord, tierUpgrade }
    })

    // Send notifications
    await this.sendRewardNotifications(result)

    // Update analytics
    await this.updateRewardAnalytics(result)

    return result
  }

  private async calculateReward(
    referral: Referral,
    conversion: ConversionData
  ): Promise<Reward> {
    // Base reward calculation
    let baseReward = 0

    if (referral.referrer_type === 'supplier') {
      // Supplier rewards based on referee plan
      const planRewards = {
        starter: 10,
        professional: 25,
        scale: 50,
        enterprise: 100
      }

      baseReward = planRewards[conversion.plan] || 10

      // Multipliers
      if (conversion.annual) baseReward *= 2
      if (referral.successful_referrals < 3) baseReward *= 1.5 // New referrer bonus

    } else if (referral.referrer_type === 'couple') {
      // Couple rewards based on supplier value
      baseReward = conversion.value * 0.05 // 5% of first month

      // Cap at reasonable amount
      baseReward = Math.min(baseReward, 50)
    }

    // Special campaigns
    const campaignBonus = await this.getCampaignBonus(referral)

    return {
      type: this.determineRewardType(referral.referrer_type, baseReward),
      value: baseReward + campaignBonus,
      currency: 'credits', // Can be credits, discount_percent, or feature_unlock
      immediate: conversion.plan !== 'free',
      description: this.generateRewardDescription(baseReward, campaignBonus)
    }
  }

  async getLeaderboard(
    type: 'supplier' | 'couple',
    period: 'week' | 'month' | 'all'
  ): Promise<Leaderboard> {
    const dateFilter = this.getDateFilter(period)

    const leaderboard = await db('referral_stats')
      .select(
        'user_id',
        'user_name',
        'user_avatar',
        'vendor_type',
        db.raw('COUNT(DISTINCT successful_referrals) as referral_count'),
        db.raw('SUM(total_value_generated) as total_value'),
        db.raw('AVG(conversion_rate) as avg_conversion_rate')
      )
      .where('user_type', type)
      .where('created_at', '>=', dateFilter)
      .groupBy('user_id', 'user_name', 'user_avatar', 'vendor_type')
      .orderBy('referral_count', 'desc')
      .limit(100)

    // Add ranks and badges
    return leaderboard.map((user, index) => ({
      ...user,
      rank: index + 1,
      badge: this.getBadge(user.referral_count),
      tier: this.getTier(user.referral_count),
      rewards_earned: this.calculateTotalRewards(user),
      next_milestone: this.getNextMilestone(user.referral_count)
    }))
  }
}

```

## 5. Referral Analytics Dashboard

### Performance Tracking System

```tsx
class ReferralAnalytics {
  async getReferralMetrics(
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<ReferralMetrics> {
    const metrics = await db.raw(`
      WITH referral_metrics AS (
        SELECT
          DATE_TRUNC(?, created_at) as period,
          referrer_type,
          referee_type,
          referral_method,

          -- Volume metrics
          COUNT(*) as total_referrals,
          COUNT(DISTINCT referrer_id) as unique_referrers,
          COUNT(CASE WHEN converted = true THEN 1 END) as conversions,

          -- Performance metrics
          AVG(CASE WHEN converted THEN
            EXTRACT(EPOCH FROM (converted_at - created_at))/3600
          END) as avg_hours_to_convert,

          -- Value metrics
          SUM(conversion_value) as total_value,
          AVG(conversion_value) as avg_value_per_conversion,

          -- Efficiency metrics
          COUNT(CASE WHEN converted THEN 1 END)::FLOAT /
            NULLIF(COUNT(*), 0) as conversion_rate

        FROM referrals
        WHERE created_at BETWEEN ? AND ?
        GROUP BY 1, 2, 3, 4
      ),

      viral_metrics AS (
        SELECT
          period,
          SUM(CASE
            WHEN referrer_type = 'supplier' AND referee_type = 'couple'
            THEN conversions
          END) as s2c_conversions,

          SUM(CASE
            WHEN referrer_type = 'couple' AND referee_type = 'supplier'
            THEN conversions
          END) as c2s_conversions,

          -- Calculate viral coefficient
          (s2c_conversions * c2s_conversions)::FLOAT /
            NULLIF(unique_referrers, 0) as viral_coefficient

        FROM referral_metrics
        GROUP BY period
      )

      SELECT * FROM referral_metrics
      JOIN viral_metrics USING (period)
      ORDER BY period DESC
    `, [groupBy, dateRange.start, dateRange.end])

    return this.formatMetrics(metrics)
  }

  async getReferralFunnel(
    referrerId: string,
    dateRange?: DateRange
  ): Promise<ReferralFunnel> {
    const funnel = await db.raw(`
      WITH funnel_data AS (
        SELECT
          COUNT(*) as invitations_sent,
          COUNT(DISTINCT CASE
            WHEN clicked_at IS NOT NULL THEN id
          END) as clicks,
          COUNT(DISTINCT CASE
            WHEN signed_up_at IS NOT NULL THEN id
          END) as signups,
          COUNT(DISTINCT CASE
            WHEN activated_at IS NOT NULL THEN id
          END) as activations,
          COUNT(DISTINCT CASE
            WHEN converted = true THEN id
          END) as conversions,
          COUNT(DISTINCT CASE
            WHEN referee_churned = false AND converted = true THEN id
          END) as retained

        FROM referrals
        WHERE referrer_id = ?
        ${dateRange ? 'AND created_at BETWEEN ? AND ?' : ''}
      )

      SELECT
        *,
        clicks::FLOAT / NULLIF(invitations_sent, 0) as click_rate,
        signups::FLOAT / NULLIF(clicks, 0) as signup_rate,
        activations::FLOAT / NULLIF(signups, 0) as activation_rate,
        conversions::FLOAT / NULLIF(activations, 0) as conversion_rate,
        retained::FLOAT / NULLIF(conversions, 0) as retention_rate
      FROM funnel_data
    `, dateRange ?
      [referrerId, dateRange.start, dateRange.end] :
      [referrerId]
    )

    return {
      ...funnel,
      bottlenecks: this.identifyBottlenecks(funnel),
      recommendations: this.generateFunnelRecommendations(funnel)
    }
  }

  async getViralLoopAnalysis(): Promise<ViralLoopAnalysis> {
    const analysis = await db.raw(`
      WITH loop_metrics AS (
        SELECT
          -- Supplier to Couple metrics
          AVG(s2c.invites_per_supplier) as avg_s2c_invites,
          AVG(s2c.conversion_rate) as s2c_conversion,
          AVG(s2c.time_to_convert) as s2c_time,

          -- Couple to Supplier metrics
          AVG(c2s.invites_per_couple) as avg_c2s_invites,
          AVG(c2s.conversion_rate) as c2s_conversion,
          AVG(c2s.time_to_convert) as c2s_time,

          -- Compound metrics
          (avg_s2c_invites * s2c_conversion) *
          (avg_c2s_invites * c2s_conversion) as viral_coefficient,

          s2c_time + c2s_time as full_cycle_time

        FROM supplier_couple_metrics s2c
        CROSS JOIN couple_supplier_metrics c2s
        WHERE period = DATE_TRUNC('month', CURRENT_DATE)
      )

      SELECT
        *,
        CASE
          WHEN viral_coefficient > 1 THEN 'Viral Growth'
          WHEN viral_coefficient > 0.7 THEN 'Near Viral'
          ELSE 'Sub-Viral'
        END as growth_status,

        -- Doubling time calculation
        CASE
          WHEN viral_coefficient > 1 THEN
            full_cycle_time * LN(2) / LN(viral_coefficient)
          ELSE NULL
        END as doubling_time_days

      FROM loop_metrics
    `)

    return {
      ...analysis,
      optimizations: this.identifyViralOptimizations(analysis),
      projections: this.projectViralGrowth(analysis)
    }
  }
}

```

## 6. Referral Campaign Management

### Automated Campaign System

```tsx
class ReferralCampaignManager {
  async createCampaign(
    campaign: CampaignConfig
  ): Promise<ReferralCampaign> {
    const created = await db.transaction(async (trx) => {
      // Create campaign
      const campaign = await trx('referral_campaigns').insert({
        id: generateId(),
        name: campaign.name,
        type: campaign.type, // 'seasonal', 'milestone', 'targeted'

        // Targeting
        target_audience: campaign.audience,
        segment_filters: campaign.filters,

        // Timing
        start_date: campaign.startDate,
        end_date: campaign.endDate,

        // Incentives
        referrer_incentive: campaign.referrerIncentive,
        referee_incentive: campaign.refereeIncentive,
        bonus_multiplier: campaign.bonusMultiplier,

        // Goals
        target_referrals: campaign.targetReferrals,
        target_conversions: campaign.targetConversions,
        budget_cap: campaign.budgetCap,

        // Content
        email_template: campaign.emailTemplate,
        landing_page: campaign.landingPage,
        social_assets: campaign.socialAssets,

        status: 'scheduled',
        created_at: new Date()
      }).returning('*')

      // Schedule campaign automation
      await this.scheduleCampaign(campaign)

      return campaign
    })

    return created
  }

  async getSeasonalCampaigns(): Promise<SeasonalCampaign[]> {
    // Wedding industry seasonal campaigns
    const campaigns = [
      {
        name: 'New Year Planning Rush',
        period: { start: 'January 1', end: 'January 31' },
        multiplier: 2.0,
        message: 'Start your wedding planning right!',
        targetAudience: 'newly_engaged'
      },
      {
        name: 'Valentines Engagement Surge',
        period: { start: 'February 10', end: 'February 20' },
        multiplier: 1.5,
        message: 'Just got engaged? We have everything you need!',
        targetAudience: 'newly_engaged'
      },
      {
        name: 'Spring Booking Season',
        period: { start: 'March 1', end: 'May 31' },
        multiplier: 1.3,
        message: 'Book your dream vendors for fall weddings',
        targetAudience: 'fall_weddings'
      },
      {
        name: 'Last Minute Summer',
        period: { start: 'April 1', end: 'June 30' },
        multiplier: 1.5,
        message: 'Still need vendors for summer? We can help!',
        targetAudience: 'urgent_bookings'
      },
      {
        name: 'Fall Planning Push',
        period: { start: 'September 1', end: 'October 31' },
        multiplier: 1.4,
        message: 'Plan your spring wedding now',
        targetAudience: 'spring_weddings'
      },
      {
        name: 'Black Friday Wedding Deals',
        period: { start: 'November 20', end: 'November 30' },
        multiplier: 2.5,
        message: 'Biggest referral bonuses of the year!',
        targetAudience: 'all'
      }
    ]

    // Check which campaigns are active
    const now = new Date()
    return campaigns.filter(c =>
      this.isDateInPeriod(now, c.period)
    )
  }

  async optimizeCampaign(
    campaignId: string
  ): Promise<OptimizationResult> {
    const campaign = await this.getCampaign(campaignId)
    const performance = await this.getCampaignPerformance(campaignId)

    // A/B test different elements
    const tests = await Promise.all([
      this.testIncentiveAmounts(campaign),
      this.testMessaging(campaign),
      this.testTiming(campaign),
      this.testAudience(campaign)
    ])

    // Apply winning variations
    const optimizations = tests
      .filter(t => t.improvement > 0.1) // 10% improvement threshold
      .map(t => ({
        element: t.element,
        original: t.control,
        optimized: t.variant,
        improvement: t.improvement,
        confidence: t.confidence
      }))

    // Update campaign with optimizations
    if (optimizations.length > 0) {
      await this.applyCampaignOptimizations(campaignId, optimizations)
    }

    return {
      campaign,
      performance,
      optimizations,
      projectedImprovement: this.calculateProjectedImprovement(optimizations)
    }
  }
}

```

## 7. Fraud Detection System

### Referral Fraud Prevention

```tsx
class ReferralFraudDetection {
  private readonly FRAUD_SIGNALS = {
    velocity: { weight: 0.3, threshold: 10 }, // referrals per day
    similarity: { weight: 0.25, threshold: 0.8 }, // email/name similarity
    ipClustering: { weight: 0.2, threshold: 5 }, // same IP
    timingPattern: { weight: 0.15, threshold: 0.9 }, // regular intervals
    conversionSpeed: { weight: 0.1, threshold: 5 } // minutes to convert
  }

  async detectFraud(referralId: string): Promise<FraudAssessment> {
    const referral = await this.getReferral(referralId)
    const referrer = await this.getReferrer(referral.referrer_id)

    // Calculate fraud signals
    const signals = await Promise.all([
      this.checkVelocity(referrer),
      this.checkSimilarity(referral),
      this.checkIPClustering(referral),
      this.checkTimingPatterns(referrer),
      this.checkConversionSpeed(referral)
    ])

    // Calculate fraud score
    const fraudScore = signals.reduce((score, signal) =>
      score + (signal.triggered ? signal.weight : 0), 0
    )

    // Determine action
    const action = this.determineAction(fraudScore)

    // Log assessment
    await this.logFraudAssessment({
      referralId,
      fraudScore,
      signals,
      action
    })

    // Take action if needed
    if (action !== 'approve') {
      await this.takeFraudAction(referralId, action)
    }

    return {
      referralId,
      fraudScore,
      risk: fraudScore > 0.7 ? 'high' : fraudScore > 0.4 ? 'medium' : 'low',
      signals,
      action,
      recommendation: this.getRecommendation(fraudScore, signals)
    }
  }

  private async checkVelocity(referrer: Referrer): Promise<FraudSignal> {
    const recentReferrals = await db('referrals')
      .where('referrer_id', referrer.id)
      .where('created_at', '>', subDays(new Date(), 1))
      .count()

    return {
      type: 'velocity',
      triggered: recentReferrals > this.FRAUD_SIGNALS.velocity.threshold,
      value: recentReferrals,
      weight: this.FRAUD_SIGNALS.velocity.weight,
      description: `${recentReferrals} referrals in last 24 hours`
    }
  }

  private async checkSimilarity(referral: Referral): Promise<FraudSignal> {
    // Check email pattern similarity
    const similarEmails = await db.raw(`
      SELECT
        referee_email,
        similarity(referee_email, ?) as email_similarity,
        similarity(referee_name, ?) as name_similarity
      FROM referrals
      WHERE referrer_id = ?
        AND id != ?
        AND created_at > NOW() - INTERVAL '7 days'
      HAVING email_similarity > 0.8 OR name_similarity > 0.8
    `, [
      referral.referee_email,
      referral.referee_name,
      referral.referrer_id,
      referral.id
    ])

    return {
      type: 'similarity',
      triggered: similarEmails.length > 0,
      value: similarEmails.length,
      weight: this.FRAUD_SIGNALS.similarity.weight,
      description: `${similarEmails.length} similar emails/names detected`
    }
  }
}

```

## 8. Dashboard Visualization

### Referral Performance Dashboard

```tsx
const ReferralDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>(last30Days)
  const metrics = useReferralMetrics(dateRange)

  return (
    <div className="referral-dashboard">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Viral Coefficient"
          value={metrics.viralCoefficient}
          target={1.0}
          format="decimal"
          status={metrics.viralCoefficient > 1 ? 'success' : 'warning'}
        />
        <MetricCard
          title="Referral Revenue"
          value={metrics.referralRevenue}
          change={metrics.revenueChange}
          format="currency"
        />
        <MetricCard
          title="Active Referrers"
          value={metrics.activeReferrers}
          change={metrics.referrerChange}
          format="number"
        />
        <MetricCard
          title="Conversion Rate"
          value={metrics.conversionRate}
          benchmark={0.25}
          format="percentage"
        />
      </div>

      {/* Viral Loop Visualization */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-8">
          <ViralLoopFlow
            s2cMetrics={metrics.supplierToCouple}
            c2sMetrics={metrics.coupleToSupplier}
            cycleTime={metrics.cycleTime}
          />
        </div>
        <div className="col-span-4">
          <ViralHealthIndicator
            coefficient={metrics.viralCoefficient}
            trend={metrics.trend}
            projectedGrowth={metrics.projectedGrowth}
          />
        </div>
      </div>

      {/* Referral Funnel */}
      <div className="mb-8">
        <ReferralFunnel
          stages={[
            { name: 'Invitations Sent', value: metrics.funnel.sent },
            { name: 'Clicked', value: metrics.funnel.clicked },
            { name: 'Signed Up', value: metrics.funnel.signedUp },
            { name: 'Activated', value: metrics.funnel.activated },
            { name: 'Converted', value: metrics.funnel.converted },
            { name: 'Retained', value: metrics.funnel.retained }
          ]}
          bottlenecks={metrics.funnel.bottlenecks}
        />
      </div>

      {/* Leaderboard */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <ReferralLeaderboard
          title="Top Supplier Referrers"
          users={metrics.topSuppliers}
          type="supplier"
        />
        <ReferralLeaderboard
          title="Top Couple Advocates"
          users={metrics.topCouples}
          type="couple"
        />
      </div>

      {/* Campaign Performance */}
      <CampaignPerformance
        campaigns={metrics.activeCampaigns}
        upcomingCampaigns={metrics.upcomingCampaigns}
      />
    </div>
  )
}

```

## 9. Database Schema

### Complete Referral Tracking Schema

```sql
-- Main referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code TEXT UNIQUE NOT NULL,

  -- Participants
  referrer_id UUID NOT NULL,
  referrer_type TEXT NOT NULL CHECK (referrer_type IN ('supplier', 'couple')),
  referee_id UUID,
  referee_type TEXT NOT NULL CHECK (referee_type IN ('supplier', 'couple')),

  -- Attribution
  referral_method TEXT NOT NULL, -- 'email', 'link', 'qr', 'social'
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  campaign_id UUID REFERENCES referral_campaigns(id),

  -- Context
  vendor_type TEXT,
  wedding_date DATE,
  location JSONB,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  clicked_at TIMESTAMPTZ,
  signed_up_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Conversion
  converted BOOLEAN DEFAULT FALSE,
  conversion_value DECIMAL(10,2),
  conversion_plan TEXT,
  time_to_convert INTERVAL,

  -- Fraud detection
  fraud_score DECIMAL(3,2),
  fraud_status TEXT DEFAULT 'pending',

  -- Expiry
  expires_at TIMESTAMPTZ,

  FOREIGN KEY (referrer_id) REFERENCES users(id),
  INDEX idx_referral_code (referral_code),
  INDEX idx_referrer (referrer_id, created_at DESC),
  INDEX idx_conversion (converted, converted_at DESC)
);

-- Referral stats aggregation
CREATE TABLE referral_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  user_type TEXT NOT NULL,

  -- Counts
  total_referrals INTEGER DEFAULT 0,
  successful_referrals INTEGER DEFAULT 0,
  pending_referrals INTEGER DEFAULT 0,

  -- Performance
  conversion_rate DECIMAL(3,2),
  avg_time_to_convert INTERVAL,
  avg_conversion_value DECIMAL(10,2),
  total_value_generated DECIMAL(12,2),

  -- Tiers and rewards
  current_tier TEXT DEFAULT 'bronze',
  total_rewards_earned DECIMAL(10,2),
  rewards_pending DECIMAL(10,2),

  -- Time-based metrics
  referrals_this_month INTEGER DEFAULT 0,
  referrals_this_week INTEGER DEFAULT 0,
  last_referral_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral rewards
CREATE TABLE referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES referrals(id),
  referrer_id UUID REFERENCES users(id),
  referee_id UUID REFERENCES users(id),

  -- Reward details
  reward_type TEXT NOT NULL, -- 'credits', 'discount', 'feature'
  reward_value DECIMAL(10,2),
  reward_currency TEXT,
  reward_description TEXT,

  -- Conditions
  conversion_type TEXT,
  conversion_value DECIMAL(10,2),
  conversion_plan TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'eligible', 'claimed', 'expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  eligible_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Referral campaigns
CREATE TABLE referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'seasonal', 'targeted', 'milestone'

  -- Targeting
  target_audience JSONB,
  segment_filters JSONB,

  -- Timing
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Incentives
  referrer_incentive JSONB,
  referee_incentive JSONB,
  bonus_multiplier DECIMAL(3,2) DEFAULT 1.0,

  -- Goals
  target_referrals INTEGER,
  target_conversions INTEGER,
  budget_cap DECIMAL(10,2),

  -- Performance
  actual_referrals INTEGER DEFAULT 0,
  actual_conversions INTEGER DEFAULT 0,
  actual_spend DECIMAL(10,2) DEFAULT 0,

  -- Content
  email_template TEXT,
  landing_page TEXT,
  social_assets JSONB,

  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud detection log
CREATE TABLE referral_fraud_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES referrals(id),

  -- Assessment
  fraud_score DECIMAL(3,2),
  risk_level TEXT,
  signals JSONB,

  -- Action taken
  action TEXT, -- 'approve', 'review', 'hold', 'reject'
  action_reason TEXT,

  -- Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT,
  review_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_log_pending ON referral_fraud_log(created_at DESC)
  WHERE reviewed_at IS NULL;

```

## 10. Implementation Roadmap

### Phase 1: Core Tracking (Week 1)

- Basic referral code generation
- Attribution tracking
- Simple reward calculation
- Database schema setup

### Phase 2: Viral Loops (Week 2)

- Supplier → Couple flow
- Couple → Supplier flow
- Viral coefficient calculation
- Basic analytics

### Phase 3: Rewards System (Week 3)

- Reward tiers implementation
- Credit system
- Automated reward processing
- Notification system

### Phase 4: Advanced Features (Week 4+)

- Campaign management
- A/B testing framework
- Fraud detection
- Advanced analytics
- Leaderboards and gamification

## Success Metrics

### Key Performance Indicators

- **Viral Coefficient**: Target >1.5 within 6 months
- **Referral Conversion Rate**: Target >25%
- **Referral Revenue**: Target 40% of total revenue
- **Fraud Rate**: Keep below 2%
- **Reward ROI**: 3:1 minimum return
- **Cycle Time**: <14 days for full viral loop

This comprehensive referral tracking system will transform WedSync/WedMe into a self-sustaining growth machine, leveraging the natural word-of-mouth dynamics of the wedding industry to drive exponential expansion.