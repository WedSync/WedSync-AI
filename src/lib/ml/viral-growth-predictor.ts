/**
 * WS-232 Viral Growth Prediction Model
 * Predicts viral coefficient and growth optimization for wedding platform
 */

import { createServerClient } from '@supabase/ssr';

// Types and interfaces
export interface ViralPrediction {
  entityId: string;
  entityType: 'supplier' | 'couple' | 'platform';
  viralCoefficient: number;
  expectedInvites: number;
  conversionProbability: number;
  networkEffect: number;
  confidence: number;
  growthPotential: 'low' | 'medium' | 'high' | 'explosive';
  optimizations: ViralOptimization[];
  viralLoop: ViralLoop;
  modelVersion: string;
  predictedAt: Date;
}

export interface ViralOptimization {
  strategy:
    | 'incentive_program'
    | 'social_proof'
    | 'referral_bonus'
    | 'network_expansion'
    | 'content_sharing';
  action: string;
  expectedImpact: number;
  implementationCost: number;
  timeframe: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ViralLoop {
  trigger: string;
  touchpoints: string[];
  conversionStages: ViralStage[];
  cycleTime: number; // days
  compoundingEffect: number;
  seasonalBoost: number;
}

export interface ViralStage {
  stage: string;
  conversionRate: number;
  dropoffReasons: string[];
  optimizationOpportunities: string[];
}

export interface ViralFeatures {
  entityId: string;
  entityType: string;
  totalInvitessent: number;
  invitesAccepted: number;
  inviteConversionRate: number;
  networkSize: number;
  networkGrowthRate: number;
  referralsSent: number;
  referralsConverted: number;
  socialShares: number;
  contentEngagement: number;
  vendorConnections: number;
  coupleConnections: number;
  crossVendorReferrals: number;
  seasonalActivity: number;
  engagementQuality: number;
  trustScore: number;
}

/**
 * Wedding Industry Viral Growth Prediction System
 * Models the unique viral mechanics of wedding vendor networks and couple invitations
 */
export class ViralGrowthPredictor {
  private readonly MODEL_VERSION = '1.1.0';

  // Wedding industry viral mechanics
  private readonly VIRAL_MULTIPLIERS = {
    // Couples naturally invite 8-15 vendors per wedding
    coupleToSupplier: 0.12, // 12% of invited suppliers actually join

    // Suppliers recommend other suppliers (vendor network effect)
    supplierToSupplier: 0.08, // 8% cross-vendor referral conversion

    // Suppliers bring existing client couples
    supplierToCouple: 0.35, // 35% of suppliers bring their couples

    // Couples invite other engaged couples
    coupleToCouple: 0.06, // 6% friend referral rate

    // Wedding guests become couples (future viral potential)
    guestToCouple: 0.02, // 2% of wedding guests get engaged within year

    // Seasonal boost during engagement/wedding seasons
    seasonalBoost: {
      january: 1.4, // New Year engagement surge
      february: 1.6, // Valentine's Day peak
      march: 1.2, // Spring engagement season
      april: 1.0, // Normal
      may: 0.9, // Pre-wedding season focus
      june: 0.7, // Wedding execution focus
      july: 0.8, // Post-wedding season
      august: 0.9, // Late summer weddings
      september: 1.1, // Fall engagement season
      october: 1.3, // Holiday engagement prep
      november: 1.5, // Thanksgiving/proposal season
      december: 1.8, // Holiday proposal peak
    },
  };

  // Viral loop quality factors
  private readonly VIRAL_QUALITY_FACTORS = {
    trustScore: 0.3, // How trusted is the referrer
    networkRelevance: 0.25, // How relevant is the network
    timingAlignment: 0.2, // Is it wedding planning season for receiver
    incentiveStrength: 0.15, // Strength of referral incentive
    socialProof: 0.1, // Social validation from mutual connections
  };

  private supabase: any;

  constructor() {
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return undefined;
          },
          set(name: string, value: string, options: any) {},
          remove(name: string, options: any) {},
        },
      },
    );
  }

  /**
   * Predict viral growth potential for an entity
   * @param entityId - Supplier, couple, or platform ID
   * @param entityType - Type of entity to analyze
   * @returns Promise<ViralPrediction>
   */
  async predictViralGrowth(
    entityId: string,
    entityType: 'supplier' | 'couple' | 'platform',
  ): Promise<ViralPrediction> {
    try {
      // Extract viral features
      const features = await this.extractViralFeatures(entityId, entityType);

      // Calculate viral coefficient
      const viralCoefficient = this.calculateViralCoefficient(features);

      // Predict invitation behavior
      const expectedInvites = this.predictInvitations(
        features,
        viralCoefficient,
      );

      // Calculate conversion probability
      const conversionProbability =
        this.calculateConversionProbability(features);

      // Calculate network effect
      const networkEffect = this.calculateNetworkEffect(features);

      // Determine growth potential
      const growthPotential = this.classifyGrowthPotential(
        viralCoefficient,
        networkEffect,
      );

      // Generate optimization recommendations
      const optimizations = await this.generateOptimizations(
        features,
        viralCoefficient,
      );

      // Map viral loop
      const viralLoop = this.mapViralLoop(features, entityType);

      // Calculate prediction confidence
      const confidence = this.calculateViralConfidence(features);

      const prediction: ViralPrediction = {
        entityId,
        entityType,
        viralCoefficient,
        expectedInvites,
        conversionProbability,
        networkEffect,
        confidence,
        growthPotential,
        optimizations,
        viralLoop,
        modelVersion: this.MODEL_VERSION,
        predictedAt: new Date(),
      };

      // Log prediction
      await this.logViralPrediction(prediction, features);

      return prediction;
    } catch (error) {
      console.error('Viral growth prediction failed:', error);
      throw new Error(
        `Viral growth prediction failed for ${entityType} ${entityId}: ${error}`,
      );
    }
  }

  /**
   * Extract viral features from database
   */
  private async extractViralFeatures(
    entityId: string,
    entityType: string,
  ): Promise<ViralFeatures> {
    if (entityType === 'supplier') {
      return this.extractSupplierViralFeatures(entityId);
    } else if (entityType === 'couple') {
      return this.extractCoupleViralFeatures(entityId);
    } else {
      return this.extractPlatformViralFeatures();
    }
  }

  /**
   * Extract viral features for suppliers
   */
  private async extractSupplierViralFeatures(
    supplierId: string,
  ): Promise<ViralFeatures> {
    // Get supplier invitation data
    const { data: inviteData } = await this.supabase.rpc(
      'get_supplier_viral_metrics',
      {
        supplier_id: supplierId,
      },
    );

    const data = inviteData?.[0] || {};

    return {
      entityId: supplierId,
      entityType: 'supplier',
      totalInvitesSeant: data.total_couple_invites || 0,
      invitesAccepted: data.couples_joined || 0,
      inviteConversionRate:
        data.couples_joined > 0
          ? data.couples_joined / (data.total_couple_invites || 1)
          : 0,
      networkSize: data.vendor_network_size || 0,
      networkGrowthRate: data.network_growth_rate || 0,
      referralsSent: data.vendor_referrals_sent || 0,
      referralsConverted: data.vendor_referrals_converted || 0,
      socialShares: data.social_media_shares || 0,
      contentEngagement: data.portfolio_engagement || 0,
      vendorConnections: data.vendor_network_size || 0,
      coupleConnections: data.active_couples || 0,
      crossVendorReferrals: data.cross_vendor_referrals || 0,
      seasonalActivity: this.getSeasonalMultiplier(),
      engagementQuality: data.client_satisfaction_score || 0.75,
      trustScore: data.review_score || 0.8,
    };
  }

  /**
   * Extract viral features for couples
   */
  private async extractCoupleViralFeatures(
    coupleId: string,
  ): Promise<ViralFeatures> {
    const { data: coupleData } = await this.supabase.rpc(
      'get_couple_viral_metrics',
      {
        couple_id: coupleId,
      },
    );

    const data = coupleData?.[0] || {};

    return {
      entityId: coupleId,
      entityType: 'couple',
      totalInvitesSeant: data.vendor_invites_sent || 0,
      invitesAccepted: data.vendors_joined || 0,
      inviteConversionRate:
        data.vendors_joined > 0
          ? data.vendors_joined / (data.vendor_invites_sent || 1)
          : 0,
      networkSize: data.wedding_network_size || 0,
      networkGrowthRate: 0.1, // Couples typically grow network during planning
      referralsSent: data.friend_referrals_sent || 0,
      referralsConverted: data.friend_referrals_converted || 0,
      socialShares: data.social_shares || 0,
      contentEngagement: data.planning_activity_score || 0,
      vendorConnections: data.connected_vendors || 0,
      coupleConnections: data.friend_couples || 0,
      crossVendorReferrals: 0, // Couples don't typically refer vendors
      seasonalActivity: this.getSeasonalMultiplier(),
      engagementQuality: data.planning_engagement_score || 0.6,
      trustScore: data.social_trust_score || 0.7,
    };
  }

  /**
   * Extract platform-wide viral features
   */
  private async extractPlatformViralFeatures(): Promise<ViralFeatures> {
    const { data: platformData } = await this.supabase.rpc(
      'get_platform_viral_metrics',
    );

    const data = platformData?.[0] || {};

    return {
      entityId: 'platform',
      entityType: 'platform',
      totalInvitesSeant: data.total_invitations_sent || 0,
      invitesAccepted: data.total_invitations_accepted || 0,
      inviteConversionRate: data.platform_conversion_rate || 0.15,
      networkSize: data.total_active_users || 0,
      networkGrowthRate: data.monthly_growth_rate || 0.08,
      referralsSent: data.total_referrals || 0,
      referralsConverted: data.successful_referrals || 0,
      socialShares: data.total_social_shares || 0,
      contentEngagement: data.platform_engagement_score || 0.65,
      vendorConnections: data.total_suppliers || 0,
      coupleConnections: data.total_couples || 0,
      crossVendorReferrals: data.cross_vendor_connections || 0,
      seasonalActivity: this.getSeasonalMultiplier(),
      engagementQuality: data.platform_satisfaction || 0.78,
      trustScore: data.platform_trust_score || 0.82,
    };
  }

  /**
   * Calculate viral coefficient based on features
   */
  private calculateViralCoefficient(features: ViralFeatures): number {
    // Base viral coefficient calculation
    let coefficient = 0;

    if (features.entityType === 'supplier') {
      // Supplier viral loop: invite couples + refer vendors
      const coupleViralRate =
        features.inviteConversionRate * this.VIRAL_MULTIPLIERS.supplierToCouple;
      const vendorViralRate =
        (features.referralsConverted / Math.max(1, features.referralsSent)) *
        this.VIRAL_MULTIPLIERS.supplierToSupplier;

      coefficient = coupleViralRate + vendorViralRate;
    } else if (features.entityType === 'couple') {
      // Couple viral loop: invite vendors + refer couples
      const vendorViralRate =
        features.inviteConversionRate * this.VIRAL_MULTIPLIERS.coupleToSupplier;
      const coupleViralRate =
        (features.referralsConverted / Math.max(1, features.referralsSent)) *
        this.VIRAL_MULTIPLIERS.coupleToCouple;

      coefficient = vendorViralRate + coupleViralRate;
    } else {
      // Platform-wide viral coefficient
      const overallConversion = features.inviteConversionRate;
      const networkGrowth = features.networkGrowthRate;
      coefficient = overallConversion * networkGrowth * 2; // Amplified by network effects
    }

    // Apply quality multipliers
    const qualityScore =
      features.trustScore * this.VIRAL_QUALITY_FACTORS.trustScore +
      (features.networkSize / 100) *
        this.VIRAL_QUALITY_FACTORS.networkRelevance +
      features.seasonalActivity * this.VIRAL_QUALITY_FACTORS.timingAlignment +
      features.engagementQuality * this.VIRAL_QUALITY_FACTORS.socialProof;

    // Apply seasonal boost
    coefficient *= features.seasonalActivity;

    // Apply quality adjustment
    coefficient *= 0.5 + qualityScore;

    return Math.max(0, Math.min(5.0, coefficient)); // Cap at 5.0 for realistic bounds
  }

  /**
   * Predict number of invitations/referrals
   */
  private predictInvitations(
    features: ViralFeatures,
    viralCoefficient: number,
  ): number {
    let baseInvites = 0;

    if (features.entityType === 'supplier') {
      // Suppliers typically invite 2-5 couples per month during active seasons
      baseInvites = Math.round(
        3 * features.seasonalActivity * (1 + viralCoefficient),
      );
    } else if (features.entityType === 'couple') {
      // Couples invite 8-15 vendors during planning (6-month window)
      const planningIntensity = features.engagementQuality * 10;
      baseInvites = Math.round(planningIntensity * (1 + viralCoefficient));
    } else {
      // Platform-wide invitation prediction
      const monthlyInvites = features.networkSize * 0.15; // 15% of users invite someone monthly
      baseInvites = Math.round(monthlyInvites * (1 + viralCoefficient));
    }

    // Apply trust and engagement multipliers
    const trustMultiplier = 0.5 + features.trustScore;
    const engagementMultiplier = 0.5 + features.engagementQuality;

    return Math.round(baseInvites * trustMultiplier * engagementMultiplier);
  }

  /**
   * Calculate conversion probability for invitations
   */
  private calculateConversionProbability(features: ViralFeatures): number {
    // Base conversion rates by entity type
    const baseConversion =
      features.entityType === 'supplier'
        ? this.VIRAL_MULTIPLIERS.supplierToCouple
        : features.entityType === 'couple'
          ? this.VIRAL_MULTIPLIERS.coupleToSupplier
          : 0.15; // Platform average

    // Adjust for quality factors
    const trustAdjustment = (features.trustScore - 0.5) * 0.3;
    const networkAdjustment = Math.min(0.2, (features.networkSize / 500) * 0.2);
    const seasonalAdjustment = (features.seasonalActivity - 1.0) * 0.1;

    const adjustedConversion =
      baseConversion + trustAdjustment + networkAdjustment + seasonalAdjustment;

    return Math.max(0.05, Math.min(0.95, adjustedConversion));
  }

  /**
   * Calculate network effect strength
   */
  private calculateNetworkEffect(features: ViralFeatures): number {
    // Network effect grows with network size but has diminishing returns
    const networkSizeEffect = Math.log(Math.max(1, features.networkSize)) / 10;

    // Cross-connections amplify network effect
    const connectionDensity =
      (features.vendorConnections + features.coupleConnections) /
      Math.max(1, features.networkSize);

    // Quality of connections matters
    const qualityMultiplier =
      (features.trustScore + features.engagementQuality) / 2;

    const networkEffect =
      networkSizeEffect * connectionDensity * qualityMultiplier;

    return Math.max(0, Math.min(2.0, networkEffect));
  }

  /**
   * Classify growth potential
   */
  private classifyGrowthPotential(
    viralCoefficient: number,
    networkEffect: number,
  ): 'low' | 'medium' | 'high' | 'explosive' {
    const combinedScore = viralCoefficient + networkEffect;

    if (combinedScore >= 3.0) return 'explosive'; // Viral coefficient > 1.5 + strong network
    if (combinedScore >= 2.0) return 'high'; // Strong viral mechanics
    if (combinedScore >= 1.0) return 'medium'; // Moderate growth
    return 'low'; // Limited viral potential
  }

  /**
   * Generate viral optimization recommendations
   */
  private async generateOptimizations(
    features: ViralFeatures,
    viralCoefficient: number,
  ): Promise<ViralOptimization[]> {
    const optimizations: ViralOptimization[] = [];

    // Low trust score optimization
    if (features.trustScore < 0.7) {
      optimizations.push({
        strategy: 'social_proof',
        action: 'Implement review system and testimonials',
        expectedImpact: 0.25,
        implementationCost: 200,
        timeframe: '2-4 weeks',
        priority: 'high',
      });
    }

    // Low conversion rate optimization
    if (features.inviteConversionRate < 0.1) {
      optimizations.push({
        strategy: 'incentive_program',
        action: 'Implement referral rewards program',
        expectedImpact: 0.4,
        implementationCost: 500,
        timeframe: '3-6 weeks',
        priority: 'critical',
      });
    }

    // Low network size optimization
    if (features.networkSize < 50) {
      optimizations.push({
        strategy: 'network_expansion',
        action: 'Launch targeted wedding vendor outreach',
        expectedImpact: 0.6,
        implementationCost: 800,
        timeframe: '4-8 weeks',
        priority: 'high',
      });
    }

    // Low engagement optimization
    if (features.engagementQuality < 0.6) {
      optimizations.push({
        strategy: 'content_sharing',
        action: 'Create shareable wedding planning tools',
        expectedImpact: 0.3,
        implementationCost: 300,
        timeframe: '2-3 weeks',
        priority: 'medium',
      });
    }

    // Seasonal optimization
    if (features.seasonalActivity > 1.2) {
      optimizations.push({
        strategy: 'incentive_program',
        action: 'Launch seasonal referral bonus campaign',
        expectedImpact: 0.5,
        implementationCost: 400,
        timeframe: '1-2 weeks',
        priority: 'critical',
      });
    }

    return optimizations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Map the viral loop for entity type
   */
  private mapViralLoop(features: ViralFeatures, entityType: string): ViralLoop {
    if (entityType === 'supplier') {
      return {
        trigger: 'Supplier imports client list and invites couples',
        touchpoints: ['Email invitation', 'SMS reminder', 'Supplier dashboard'],
        conversionStages: [
          {
            stage: 'Invitation sent',
            conversionRate: 0.85,
            dropoffReasons: ['Email not received', 'Not ready for planning'],
            optimizationOpportunities: [
              'Better timing',
              'Personalized messaging',
            ],
          },
          {
            stage: 'Couple clicks link',
            conversionRate: 0.35,
            dropoffReasons: ['Not interested', 'Already using competitor'],
            optimizationOpportunities: [
              'Social proof',
              'Clear value proposition',
            ],
          },
          {
            stage: 'Couple signs up',
            conversionRate: 0.45,
            dropoffReasons: ['Complex signup', 'Privacy concerns'],
            optimizationOpportunities: [
              'Simplified onboarding',
              'Trust signals',
            ],
          },
        ],
        cycleTime: 14, // 2 weeks average
        compoundingEffect: 1.2, // Each couple invites 1.2 vendors on average
        seasonalBoost: features.seasonalActivity,
      };
    } else if (entityType === 'couple') {
      return {
        trigger: 'Couple needs vendor and invites missing suppliers',
        touchpoints: [
          'Vendor directory gap',
          'Recommendation prompts',
          'Social sharing',
        ],
        conversionStages: [
          {
            stage: 'Vendor invitation sent',
            conversionRate: 0.65,
            dropoffReasons: ['Vendor already has solution', 'Too busy'],
            optimizationOpportunities: [
              'Referral incentives',
              'Timing optimization',
            ],
          },
          {
            stage: 'Vendor evaluates platform',
            conversionRate: 0.25,
            dropoffReasons: ['Feature gaps', 'Pricing concerns'],
            optimizationOpportunities: ['Free trial', 'Feature demos'],
          },
          {
            stage: 'Vendor signs up',
            conversionRate: 0.6,
            dropoffReasons: ['Setup complexity', 'Competitive alternatives'],
            optimizationOpportunities: ['Onboarding assistance', 'Quick wins'],
          },
        ],
        cycleTime: 21, // 3 weeks average
        compoundingEffect: 0.8, // Each vendor invites 0.8 couples on average
        seasonalBoost: features.seasonalActivity,
      };
    } else {
      return {
        trigger: 'Platform viral mechanics across all user types',
        touchpoints: [
          'Email campaigns',
          'In-app prompts',
          'Social media',
          'Word of mouth',
        ],
        conversionStages: [
          {
            stage: 'User receives invitation',
            conversionRate: 0.75,
            dropoffReasons: ['Spam filtering', 'Not wedding planning'],
            optimizationOpportunities: [
              'Better targeting',
              'Delivery optimization',
            ],
          },
          {
            stage: 'User shows interest',
            conversionRate: 0.3,
            dropoffReasons: ['Not ready', 'Competitor preference'],
            optimizationOpportunities: [
              'Market positioning',
              'Feature differentiation',
            ],
          },
          {
            stage: 'User converts',
            conversionRate: 0.5,
            dropoffReasons: ['Onboarding friction', 'Value realization delay'],
            optimizationOpportunities: [
              'Streamlined signup',
              'Immediate value delivery',
            ],
          },
        ],
        cycleTime: 18, // Average across all loops
        compoundingEffect: 1.0, // Platform average
        seasonalBoost: features.seasonalActivity,
      };
    }
  }

  /**
   * Get current seasonal multiplier
   */
  private getSeasonalMultiplier(): number {
    const currentMonth = new Date()
      .toLocaleString('en-US', { month: 'long' })
      .toLowerCase();
    return (
      this.VIRAL_MULTIPLIERS.seasonalBoost[
        currentMonth as keyof typeof this.VIRAL_MULTIPLIERS.seasonalBoost
      ] || 1.0
    );
  }

  /**
   * Calculate prediction confidence
   */
  private calculateViralConfidence(features: ViralFeatures): number {
    let confidence = 0.7; // Base confidence

    // More data = higher confidence
    if (features.totalInvitesSeant > 50) confidence += 0.1;
    if (features.networkSize > 100) confidence += 0.1;

    // Stable patterns increase confidence
    if (
      features.inviteConversionRate > 0 &&
      features.inviteConversionRate < 0.8
    )
      confidence += 0.1;

    // High engagement increases confidence
    if (features.engagementQuality > 0.7) confidence += 0.05;

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Log viral prediction to database
   */
  private async logViralPrediction(
    prediction: ViralPrediction,
    features: ViralFeatures,
  ): Promise<void> {
    try {
      // Store features
      await this.supabase.rpc('store_ml_features', {
        p_entity_type: prediction.entityType,
        p_entity_id: prediction.entityId,
        p_feature_set: `viral_features_v${this.MODEL_VERSION}`,
        p_features: features,
        p_expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days
      });

      // Get model ID
      const { data: model } = await this.supabase
        .from('ml_models')
        .select('id')
        .eq('model_name', 'wedding_viral_growth_predictor')
        .eq('version', this.MODEL_VERSION)
        .single();

      let modelId = model?.id;
      if (!modelId) {
        const { data: newModel } = await this.supabase
          .from('ml_models')
          .insert({
            model_name: 'wedding_viral_growth_predictor',
            model_type: 'viral',
            version: this.MODEL_VERSION,
            algorithm: 'network_analysis',
            status: 'deployed',
          })
          .select('id')
          .single();
        modelId = newModel.id;
      }

      // Log prediction
      if (modelId) {
        await this.supabase.rpc('log_ml_prediction', {
          p_model_id: modelId,
          p_prediction_type: 'viral_growth',
          p_entity_id: prediction.entityId,
          p_entity_type: prediction.entityType,
          p_prediction: {
            viral_coefficient: prediction.viralCoefficient,
            growth_potential: prediction.growthPotential,
            expected_invites: prediction.expectedInvites,
            conversion_probability: prediction.conversionProbability,
            network_effect: prediction.networkEffect,
            optimizations: prediction.optimizations.length,
          },
          p_confidence: prediction.confidence,
          p_features_used: features,
        });
      }
    } catch (error) {
      console.error('Failed to log viral prediction:', error);
    }
  }
}
