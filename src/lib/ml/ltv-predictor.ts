/**
 * WS-232 Lifetime Value Prediction Model
 * Predicts customer LTV with wedding industry-specific factors
 */

import { createServerClient } from '@supabase/ssr';

// Types and interfaces
export interface LTVPrediction {
  supplierId: string;
  predictedLTV: number;
  ltv12Month: number;
  ltv24Month: number;
  ltv60Month: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  ltvSegment: 'bronze' | 'silver' | 'gold' | 'platinum';
  contributingFactors: LTVFactor[];
  optimizations: LTVOptimization[];
  seasonalAdjustment: number;
  modelVersion: string;
  predictedAt: Date;
}

export interface LTVFactor {
  factor: string;
  impact: number; // Contribution to LTV in dollars
  weight: number; // Relative importance 0-1
  description: string;
  currentValue: number | string;
  idealValue?: number | string;
}

export interface LTVOptimization {
  strategy: 'retention' | 'upgrade' | 'expansion' | 'engagement' | 'pricing';
  action: string;
  expectedLTVIncrease: number;
  implementationCost: number;
  timeframe: string;
  roi: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface LTVFeatures {
  supplierId: string;
  vendorType: string;
  subscriptionTier: string;
  monthlyRevenue: number;
  accountAge: number;
  totalRevenue: number;
  paymentHistory: number[];
  upgradeHistory: UpgradeEvent[];
  usageMetrics: UsageMetrics;
  networkMetrics: NetworkMetrics;
  seasonalPerformance: SeasonalMetrics;
  marketFactors: MarketFactors;
}

export interface UpgradeEvent {
  fromTier: string;
  toTier: string;
  date: Date;
  revenue_impact: number;
  triggerEvent?: string;
}

export interface UsageMetrics {
  loginFrequency: number;
  featureAdoption: number;
  formsCreated: number;
  clientsManaged: number;
  apiUsage: number;
  supportTickets: number;
  trainingCompleted: number;
}

export interface NetworkMetrics {
  referralsMade: number;
  referralsReceived: number;
  partnerConnections: number;
  communityEngagement: number;
  reviewsGiven: number;
  reviewScore: number;
}

export interface SeasonalMetrics {
  peakSeasonRevenue: number;
  offSeasonRevenue: number;
  seasonalStability: number;
  weddingVolumeCorrelation: number;
}

export interface MarketFactors {
  competitorPressure: number;
  marketGrowth: number;
  regionalDemand: number;
  economicConditions: string;
}

/**
 * Wedding Industry LTV Prediction System
 * Accounts for seasonal patterns, vendor types, and wedding industry dynamics
 */
export class LTVPredictor {
  private readonly MODEL_VERSION = '1.3.0';

  // Wedding industry LTV patterns by vendor type
  private readonly VENDOR_LTV_PROFILES = {
    photographer: {
      baseLTV: 1850,
      churnRate: 0.15,
      seasonalVariance: 0.4,
      upgradeRate: 0.12,
      networkEffect: 1.3,
    },
    venue: {
      baseLTV: 2800,
      churnRate: 0.08,
      seasonalVariance: 0.2,
      upgradeRate: 0.18,
      networkEffect: 1.6,
    },
    catering: {
      baseLTV: 1650,
      churnRate: 0.12,
      seasonalVariance: 0.3,
      upgradeRate: 0.1,
      networkEffect: 1.2,
    },
    florist: {
      baseLTV: 1200,
      churnRate: 0.18,
      seasonalVariance: 0.5,
      upgradeRate: 0.08,
      networkEffect: 1.1,
    },
    planner: {
      baseLTV: 3200,
      churnRate: 0.1,
      seasonalVariance: 0.25,
      upgradeRate: 0.25,
      networkEffect: 1.8,
    },
    dj: {
      baseLTV: 980,
      churnRate: 0.22,
      seasonalVariance: 0.6,
      upgradeRate: 0.06,
      networkEffect: 1.0,
    },
    other: {
      baseLTV: 1400,
      churnRate: 0.14,
      seasonalVariance: 0.35,
      upgradeRate: 0.1,
      networkEffect: 1.2,
    },
  };

  // LTV calculation weights for different factors
  private readonly LTV_WEIGHTS = {
    baseSubscription: 0.3,
    usageIntensity: 0.25,
    networkValue: 0.15,
    seasonalStability: 0.12,
    paymentReliability: 0.1,
    upgradeHistory: 0.08,
  };

  // Tier multipliers for subscription levels
  private readonly TIER_MULTIPLIERS = {
    free: 0.1,
    starter: 1.0,
    professional: 2.8,
    scale: 4.5,
    enterprise: 8.2,
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
   * Predict lifetime value for a supplier
   * @param supplierId - UUID of the supplier
   * @returns Promise<LTVPrediction>
   */
  async predictLTV(supplierId: string): Promise<LTVPrediction> {
    try {
      // Extract LTV features
      const features = await this.extractLTVFeatures(supplierId);

      // Calculate base LTV prediction
      const predictedLTV = this.calculateBaseLTV(features);

      // Calculate time-based LTV milestones
      const ltv12Month = this.calculateTimeBoundLTV(features, 12);
      const ltv24Month = this.calculateTimeBoundLTV(features, 24);
      const ltv60Month = this.calculateTimeBoundLTV(features, 60);

      // Calculate prediction confidence
      const confidence = this.calculateLTVConfidence(features);

      // Determine risk and segment
      const riskLevel = this.calculateRiskLevel(features, predictedLTV);
      const ltvSegment = this.segmentCustomer(predictedLTV);

      // Analyze contributing factors
      const contributingFactors = this.analyzeLTVFactors(
        features,
        predictedLTV,
      );

      // Generate optimization recommendations
      const optimizations = await this.generateLTVOptimizations(
        features,
        predictedLTV,
      );

      // Calculate seasonal adjustment
      const seasonalAdjustment = this.calculateSeasonalAdjustment(features);

      const prediction: LTVPrediction = {
        supplierId,
        predictedLTV,
        ltv12Month,
        ltv24Month,
        ltv60Month,
        confidence,
        riskLevel,
        ltvSegment,
        contributingFactors,
        optimizations,
        seasonalAdjustment,
        modelVersion: this.MODEL_VERSION,
        predictedAt: new Date(),
      };

      // Log prediction
      await this.logLTVPrediction(prediction, features);

      return prediction;
    } catch (error) {
      console.error('LTV prediction failed:', error);
      throw new Error(
        `LTV prediction failed for supplier ${supplierId}: ${error}`,
      );
    }
  }

  /**
   * Extract LTV features from database
   */
  private async extractLTVFeatures(supplierId: string): Promise<LTVFeatures> {
    // Get comprehensive LTV data
    const { data: ltvData } = await this.supabase
      .rpc('extract_ltv_features', { supplier_id: supplierId })
      .single();

    if (!ltvData) {
      throw new Error(`No LTV features found for supplier ${supplierId}`);
    }

    // Get usage metrics
    const usageMetrics: UsageMetrics = {
      loginFrequency: ltvData.avg_monthly_logins || 15,
      featureAdoption: ltvData.feature_adoption_score || 0.6,
      formsCreated: ltvData.total_forms || 0,
      clientsManaged: ltvData.active_clients || 0,
      apiUsage: ltvData.api_calls_per_month || 0,
      supportTickets: ltvData.support_tickets || 0,
      trainingCompleted: ltvData.training_modules_completed || 0,
    };

    // Get network metrics
    const networkMetrics: NetworkMetrics = {
      referralsMade: ltvData.referrals_made || 0,
      referralsReceived: ltvData.referrals_received || 0,
      partnerConnections: ltvData.vendor_network_size || 0,
      communityEngagement: ltvData.community_posts || 0,
      reviewsGiven: ltvData.reviews_given || 0,
      reviewScore: ltvData.avg_review_score || 0.75,
    };

    // Get seasonal performance
    const seasonalMetrics: SeasonalMetrics = {
      peakSeasonRevenue: ltvData.peak_season_revenue || 0,
      offSeasonRevenue: ltvData.off_season_revenue || 0,
      seasonalStability: ltvData.seasonal_variance || 0.3,
      weddingVolumeCorrelation: ltvData.wedding_volume_correlation || 0.8,
    };

    // Market factors (would be enhanced with external data)
    const marketFactors: MarketFactors = {
      competitorPressure: 0.6, // Moderate competition
      marketGrowth: 0.15, // 15% annual market growth
      regionalDemand: ltvData.regional_demand_score || 0.7,
      economicConditions: 'stable',
    };

    return {
      supplierId,
      vendorType: ltvData.vendor_type || 'other',
      subscriptionTier: ltvData.subscription_tier || 'free',
      monthlyRevenue: ltvData.avg_monthly_revenue || 0,
      accountAge: ltvData.months_active || 1,
      totalRevenue: ltvData.total_revenue || 0,
      paymentHistory: ltvData.payment_history || [],
      upgradeHistory: ltvData.upgrade_history || [],
      usageMetrics,
      networkMetrics,
      seasonalPerformance: seasonalMetrics,
      marketFactors,
    };
  }

  /**
   * Calculate base LTV using weighted factors
   */
  private calculateBaseLTV(features: LTVFeatures): number {
    // Get vendor type profile
    const profile =
      this.VENDOR_LTV_PROFILES[
        features.vendorType as keyof typeof this.VENDOR_LTV_PROFILES
      ] || this.VENDOR_LTV_PROFILES.other;

    // Base calculation: Monthly Revenue / Churn Rate
    const baseRevenue =
      features.monthlyRevenue > 0 ? features.monthlyRevenue : 49; // Default starter price
    const adjustedChurnRate = Math.max(
      0.02,
      profile.churnRate - this.getRetentionBonus(features),
    );
    let baseLTV = (baseRevenue * 12) / adjustedChurnRate;

    // Apply tier multiplier
    const tierMultiplier =
      this.TIER_MULTIPLIERS[
        features.subscriptionTier as keyof typeof this.TIER_MULTIPLIERS
      ] || 1.0;
    baseLTV *= tierMultiplier;

    // Factor-based adjustments
    const usageScore = this.calculateUsageScore(features.usageMetrics);
    const networkScore = this.calculateNetworkScore(features.networkMetrics);
    const stabilityScore = this.calculateStabilityScore(features);
    const paymentScore = this.calculatePaymentReliability(
      features.paymentHistory,
    );
    const upgradeScore = this.calculateUpgradeValue(features.upgradeHistory);

    // Apply weighted adjustments
    const adjustmentFactor =
      usageScore * this.LTV_WEIGHTS.usageIntensity +
      networkScore * this.LTV_WEIGHTS.networkValue +
      stabilityScore * this.LTV_WEIGHTS.seasonalStability +
      paymentScore * this.LTV_WEIGHTS.paymentReliability +
      upgradeScore * this.LTV_WEIGHTS.upgradeHistory;

    // Apply network effect multiplier
    const networkMultiplier =
      1 + (networkScore * profile.networkEffect - 1) * 0.5;

    // Final LTV calculation
    const finalLTV = baseLTV * (1 + adjustmentFactor) * networkMultiplier;

    return Math.max(
      profile.baseLTV * 0.3,
      Math.min(profile.baseLTV * 5.0, finalLTV),
    );
  }

  /**
   * Calculate time-bound LTV predictions
   */
  private calculateTimeBoundLTV(features: LTVFeatures, months: number): number {
    const monthlyRevenue = features.monthlyRevenue || 49;
    const profile =
      this.VENDOR_LTV_PROFILES[
        features.vendorType as keyof typeof this.VENDOR_LTV_PROFILES
      ] || this.VENDOR_LTV_PROFILES.other;

    // Calculate retention probability over time
    const monthlyChurnRate = profile.churnRate / 12;
    const retentionRate = 1 - monthlyChurnRate;
    const survivalProbability = Math.pow(retentionRate, months);

    // Calculate expected revenue with upgrades
    const upgradeValue = this.calculateExpectedUpgrades(features, months);
    const baseRevenue = monthlyRevenue * months * survivalProbability;

    return baseRevenue + upgradeValue;
  }

  /**
   * Calculate usage intensity score
   */
  private calculateUsageScore(usage: UsageMetrics): number {
    const factors = [
      Math.min(1, usage.loginFrequency / 20), // Target: 20+ logins/month
      usage.featureAdoption, // Already 0-1 scale
      Math.min(1, usage.formsCreated / 10), // Target: 10+ forms
      Math.min(1, usage.clientsManaged / 15), // Target: 15+ clients
      Math.min(1, usage.trainingCompleted / 5), // Target: 5+ modules
      1 - Math.min(0.5, usage.supportTickets / 10), // Fewer tickets = better
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  /**
   * Calculate network value score
   */
  private calculateNetworkScore(network: NetworkMetrics): number {
    const factors = [
      Math.min(1, network.referralsMade / 5), // Target: 5+ referrals
      Math.min(1, network.partnerConnections / 10), // Target: 10+ connections
      Math.min(1, network.communityEngagement / 15), // Target: 15+ posts
      network.reviewScore, // Already 0-1 scale
      Math.min(1, network.reviewsGiven / 8), // Target: 8+ reviews given
    ];

    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  /**
   * Calculate seasonal stability score
   */
  private calculateStabilityScore(features: LTVFeatures): number {
    const seasonal = features.seasonalPerformance;

    // Lower variance = higher stability
    const varianceScore = 1 - Math.min(1, seasonal.seasonalStability);

    // Consistent revenue across seasons
    const consistencyScore =
      seasonal.offSeasonRevenue > 0
        ? Math.min(
            1,
            seasonal.offSeasonRevenue / Math.max(1, seasonal.peakSeasonRevenue),
          )
        : 0.3;

    // Account age stability (longer = more stable)
    const ageScore = Math.min(1, features.accountAge / 24); // Target: 24+ months

    return (varianceScore + consistencyScore + ageScore) / 3;
  }

  /**
   * Calculate payment reliability score
   */
  private calculatePaymentReliability(paymentHistory: number[]): number {
    if (paymentHistory.length === 0) return 0.5;

    const failedPayments = paymentHistory.filter(
      (payment) => payment <= 0,
    ).length;
    const successRate = 1 - failedPayments / paymentHistory.length;

    // Penalize recent failures more heavily
    const recentFailures = paymentHistory
      .slice(-6)
      .filter((payment) => payment <= 0).length;
    const recentPenalty = recentFailures * 0.1;

    return Math.max(0, successRate - recentPenalty);
  }

  /**
   * Calculate upgrade value score
   */
  private calculateUpgradeValue(upgradeHistory: UpgradeEvent[]): number {
    if (upgradeHistory.length === 0) return 0.3;

    // Count net upgrades vs downgrades
    const upgrades = upgradeHistory.filter(
      (event) => event.revenue_impact > 0,
    ).length;
    const downgrades = upgradeHistory.filter(
      (event) => event.revenue_impact < 0,
    ).length;

    const upgradeScore = Math.min(1, upgrades / 3); // Target: 3+ upgrades
    const downgradesPenalty = Math.min(0.3, downgrades * 0.1);

    return Math.max(0, upgradeScore - downgradesPenalty);
  }

  /**
   * Calculate retention bonus based on engagement
   */
  private getRetentionBonus(features: LTVFeatures): number {
    const usageScore = this.calculateUsageScore(features.usageMetrics);
    const networkScore = this.calculateNetworkScore(features.networkMetrics);

    // High engagement reduces churn rate
    return ((usageScore + networkScore) / 2) * 0.05; // Up to 5% churn reduction
  }

  /**
   * Calculate expected upgrades over time period
   */
  private calculateExpectedUpgrades(
    features: LTVFeatures,
    months: number,
  ): number {
    const profile =
      this.VENDOR_LTV_PROFILES[
        features.vendorType as keyof typeof this.VENDOR_LTV_PROFILES
      ] || this.VENDOR_LTV_PROFILES.other;

    // Base upgrade probability
    const monthlyUpgradeRate = profile.upgradeRate / 12;
    const expectedUpgrades = monthlyUpgradeRate * months;

    // Average upgrade value by current tier
    const currentTierValue =
      this.TIER_MULTIPLIERS[
        features.subscriptionTier as keyof typeof this.TIER_MULTIPLIERS
      ] || 1.0;
    const upgradeValue = currentTierValue * 30 * 12; // $30/month upgrade for 12 months

    return expectedUpgrades * upgradeValue;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateLTVConfidence(features: LTVFeatures): number {
    let confidence = 0.7;

    // More data = higher confidence
    if (features.accountAge > 12) confidence += 0.1;
    if (features.paymentHistory.length > 6) confidence += 0.1;
    if (features.upgradeHistory.length > 0) confidence += 0.05;

    // Stable patterns increase confidence
    const stabilityScore = this.calculateStabilityScore(features);
    confidence += stabilityScore * 0.1;

    // High usage increases confidence
    const usageScore = this.calculateUsageScore(features.usageMetrics);
    confidence += usageScore * 0.05;

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Calculate risk level based on LTV and features
   */
  private calculateRiskLevel(
    features: LTVFeatures,
    predictedLTV: number,
  ): 'low' | 'medium' | 'high' {
    const profile =
      this.VENDOR_LTV_PROFILES[
        features.vendorType as keyof typeof this.VENDOR_LTV_PROFILES
      ] || this.VENDOR_LTV_PROFILES.other;

    const ltvRatio = predictedLTV / profile.baseLTV;

    if (ltvRatio < 0.6) return 'high'; // LTV significantly below expected
    if (ltvRatio < 0.9) return 'medium'; // LTV somewhat below expected
    return 'low'; // LTV at or above expected
  }

  /**
   * Segment customer based on LTV
   */
  private segmentCustomer(
    predictedLTV: number,
  ): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (predictedLTV >= 5000) return 'platinum';
    if (predictedLTV >= 2500) return 'gold';
    if (predictedLTV >= 1200) return 'silver';
    return 'bronze';
  }

  /**
   * Analyze contributing factors to LTV
   */
  private analyzeLTVFactors(
    features: LTVFeatures,
    predictedLTV: number,
  ): LTVFactor[] {
    const factors: LTVFactor[] = [];

    // Subscription tier impact
    const tierMultiplier =
      this.TIER_MULTIPLIERS[
        features.subscriptionTier as keyof typeof this.TIER_MULTIPLIERS
      ] || 1.0;
    const tierImpact = features.monthlyRevenue * 12 * (tierMultiplier - 1);
    factors.push({
      factor: 'Subscription Tier',
      impact: tierImpact,
      weight: this.LTV_WEIGHTS.baseSubscription,
      description: `${features.subscriptionTier} tier contribution`,
      currentValue: features.subscriptionTier,
      idealValue: 'professional',
    });

    // Usage intensity impact
    const usageScore = this.calculateUsageScore(features.usageMetrics);
    const usageImpact = predictedLTV * 0.25 * (usageScore - 0.5) * 2;
    factors.push({
      factor: 'Usage Intensity',
      impact: usageImpact,
      weight: this.LTV_WEIGHTS.usageIntensity,
      description: `${Math.round(usageScore * 100)}% usage adoption`,
      currentValue: usageScore,
      idealValue: 0.85,
    });

    // Network value impact
    const networkScore = this.calculateNetworkScore(features.networkMetrics);
    const networkImpact = (predictedLTV * 0.15 * (networkScore - 0.3)) / 0.7;
    factors.push({
      factor: 'Network Value',
      impact: networkImpact,
      weight: this.LTV_WEIGHTS.networkValue,
      description: `${features.networkMetrics.partnerConnections} connections, ${features.networkMetrics.referralsMade} referrals`,
      currentValue: networkScore,
      idealValue: 0.8,
    });

    // Seasonal stability impact
    const stabilityScore = this.calculateStabilityScore(features);
    const stabilityImpact =
      (predictedLTV * 0.12 * (stabilityScore - 0.4)) / 0.6;
    factors.push({
      factor: 'Business Stability',
      impact: stabilityImpact,
      weight: this.LTV_WEIGHTS.seasonalStability,
      description: `${features.accountAge} months active, seasonal variance ${features.seasonalPerformance.seasonalStability}`,
      currentValue: stabilityScore,
      idealValue: 0.8,
    });

    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  /**
   * Generate LTV optimization recommendations
   */
  private async generateLTVOptimizations(
    features: LTVFeatures,
    predictedLTV: number,
  ): Promise<LTVOptimization[]> {
    const optimizations: LTVOptimization[] = [];
    const profile =
      this.VENDOR_LTV_PROFILES[
        features.vendorType as keyof typeof this.VENDOR_LTV_PROFILES
      ] || this.VENDOR_LTV_PROFILES.other;

    // Upgrade opportunity
    if (
      features.subscriptionTier === 'free' ||
      features.subscriptionTier === 'starter'
    ) {
      optimizations.push({
        strategy: 'upgrade',
        action: 'Promote to Professional plan with feature showcase',
        expectedLTVIncrease: 1200,
        implementationCost: 50,
        timeframe: '2-4 weeks',
        roi: 24.0,
        priority: 'high',
      });
    }

    // Usage optimization
    const usageScore = this.calculateUsageScore(features.usageMetrics);
    if (usageScore < 0.6) {
      optimizations.push({
        strategy: 'engagement',
        action: 'Implement feature adoption campaign and training',
        expectedLTVIncrease: 450,
        implementationCost: 75,
        timeframe: '3-6 weeks',
        roi: 6.0,
        priority: 'medium',
      });
    }

    // Network expansion
    const networkScore = this.calculateNetworkScore(features.networkMetrics);
    if (networkScore < 0.5) {
      optimizations.push({
        strategy: 'expansion',
        action: 'Launch referral program and community features',
        expectedLTVIncrease: 600,
        implementationCost: 100,
        timeframe: '4-8 weeks',
        roi: 6.0,
        priority: 'medium',
      });
    }

    // Retention focus for high-risk
    if (features.paymentHistory.slice(-3).some((payment) => payment <= 0)) {
      optimizations.push({
        strategy: 'retention',
        action: 'Implement payment recovery and retention campaign',
        expectedLTVIncrease: predictedLTV * 0.3,
        implementationCost: 150,
        timeframe: '1-2 weeks',
        roi: (predictedLTV * 0.3) / 150,
        priority: 'critical',
      });
    }

    // Pricing optimization for high-value customers
    if (predictedLTV > profile.baseLTV * 2) {
      optimizations.push({
        strategy: 'pricing',
        action: 'Offer premium add-ons and enterprise features',
        expectedLTVIncrease: 800,
        implementationCost: 200,
        timeframe: '6-12 weeks',
        roi: 4.0,
        priority: 'medium',
      });
    }

    return optimizations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.roi - a.roi;
      })
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Calculate seasonal adjustment factor
   */
  private calculateSeasonalAdjustment(features: LTVFeatures): number {
    const seasonal = features.seasonalPerformance;
    const currentMonth = new Date().getMonth();

    // Wedding peak seasons: May-September
    const isPeakSeason = [4, 5, 6, 7, 8].includes(currentMonth);

    if (
      isPeakSeason &&
      seasonal.peakSeasonRevenue > seasonal.offSeasonRevenue * 1.2
    ) {
      return 1.15; // 15% boost during peak season
    } else if (!isPeakSeason && seasonal.seasonalStability > 0.4) {
      return 0.9; // 10% reduction during off-season for seasonal vendors
    }

    return 1.0; // No seasonal adjustment
  }

  /**
   * Log LTV prediction to database
   */
  private async logLTVPrediction(
    prediction: LTVPrediction,
    features: LTVFeatures,
  ): Promise<void> {
    try {
      // Store features
      await this.supabase.rpc('store_ml_features', {
        p_entity_type: 'supplier',
        p_entity_id: prediction.supplierId,
        p_feature_set: `ltv_features_v${this.MODEL_VERSION}`,
        p_features: features,
        p_expires_at: new Date(
          Date.now() + 45 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 45 days
      });

      // Get model ID
      const { data: model } = await this.supabase
        .from('ml_models')
        .select('id')
        .eq('model_name', 'wedding_ltv_predictor')
        .eq('version', this.MODEL_VERSION)
        .single();

      let modelId = model?.id;
      if (!modelId) {
        const { data: newModel } = await this.supabase
          .from('ml_models')
          .insert({
            model_name: 'wedding_ltv_predictor',
            model_type: 'ltv',
            version: this.MODEL_VERSION,
            algorithm: 'regression_ensemble',
            status: 'deployed',
            hyperparameters: {
              vendor_profiles: this.VENDOR_LTV_PROFILES,
              ltv_weights: this.LTV_WEIGHTS,
              tier_multipliers: this.TIER_MULTIPLIERS,
            },
          })
          .select('id')
          .single();
        modelId = newModel.id;
      }

      // Log prediction
      if (modelId) {
        await this.supabase.rpc('log_ml_prediction', {
          p_model_id: modelId,
          p_prediction_type: 'ltv_prediction',
          p_entity_id: prediction.supplierId,
          p_entity_type: 'supplier',
          p_prediction: {
            predicted_ltv: prediction.predictedLTV,
            ltv_segment: prediction.ltvSegment,
            ltv_12_month: prediction.ltv12Month,
            ltv_24_month: prediction.ltv24Month,
            ltv_60_month: prediction.ltv60Month,
            risk_level: prediction.riskLevel,
            top_factors: prediction.contributingFactors
              .slice(0, 3)
              .map((f) => f.factor),
            optimizations_count: prediction.optimizations.length,
          },
          p_confidence: prediction.confidence,
          p_features_used: features,
        });
      }
    } catch (error) {
      console.error('Failed to log LTV prediction:', error);
    }
  }
}
