import { createClient } from '@/lib/database/supabase-admin';
import {
  AdvancedViralCalculator,
  EnhancedViralCoefficient,
  ViralBottleneck,
  OptimizationRecommendation,
} from './advanced-viral-calculator';
import {
  WeddingViralAnalyzer,
  CohortViralData,
  VendorNetworkMetrics,
} from './wedding-viral-analyzer';

export interface ViralIntervention {
  type:
    | 'invitation_incentive'
    | 'onboarding_optimization'
    | 'seasonal_campaign'
    | 'referral_bonus'
    | 'network_effect_boost';
  parameters: InterventionParameters;
  targetSegment?: 'all' | 'photographers' | 'venues' | 'couples' | 'new_users';
  duration: number; // days
  cost: number; // estimated cost in currency
}

export interface InterventionParameters {
  // Invitation incentive parameters
  incentiveAmount?: number;
  incentiveType?: 'monetary' | 'feature_access' | 'service_credit';

  // Onboarding optimization parameters
  flowOptimization?: 'streamline' | 'gamification' | 'personal_touch';
  reductionInSteps?: number;

  // Seasonal campaign parameters
  campaignType?:
    | 'social_media'
    | 'email'
    | 'partnerships'
    | 'content_marketing';
  targetSeason?: 'peak' | 'shoulder' | 'off';

  // Referral bonus parameters
  bonusStructure?: 'flat' | 'tiered' | 'performance_based';
  bonusAmount?: number;

  // Network effect boost parameters
  networkTargeting?: 'hubs' | 'bridges' | 'clusters';
  amplificationTarget?: number;
}

export interface ViralSimulationResult {
  intervention: ViralIntervention;
  currentMetrics: EnhancedViralCoefficient;
  projectedMetrics: EnhancedViralCoefficient;
  impact: SimulationImpact;
  confidence: number; // 0-1 confidence score
  risks: SimulationRisk[];
  timeline: SimulationTimeline[];
  roi: ROIAnalysis;
}

export interface SimulationImpact {
  coefficientIncrease: number;
  userGrowthImpact: number;
  revenueImpact: number;
  retentionImpact: number;
  qualityImpact: number;
  networkStrengthImpact: number;
}

export interface SimulationRisk {
  type:
    | 'cannibalisation'
    | 'quality_degradation'
    | 'cost_overrun'
    | 'seasonality_mismatch'
    | 'network_saturation';
  probability: number; // 0-1
  impact: number; // 0-1
  description: string;
  mitigation: string;
}

export interface SimulationTimeline {
  day: number;
  projectedCoefficient: number;
  cumulativeUsers: number;
  cumulativeRevenue: number;
  confidence: number;
}

export interface ROIAnalysis {
  investmentRequired: number;
  breakEvenDays: number;
  projectedRevenue: number;
  netROI: number;
  paybackPeriod: number;
  riskAdjustedROI: number;
}

export interface BottleneckAnalysis {
  bottlenecks: ViralBottleneck[];
  criticalPath: string[];
  optimizationPotential: number;
  quickWins: QuickWin[];
  longTermOpportunities: LongTermOpportunity[];
  seasonalConsiderations: SeasonalConsideration[];
}

export interface QuickWin {
  action: string;
  estimatedImpact: number;
  implementationDays: number;
  cost: number;
  confidence: number;
  dependencies: string[];
}

export interface LongTermOpportunity {
  opportunity: string;
  potentialImpact: number;
  timeToImplement: number; // months
  resourceRequirement: 'low' | 'medium' | 'high';
  strategicValue: number; // 0-1
}

export interface SeasonalConsideration {
  season: 'peak' | 'shoulder' | 'off';
  opportunities: string[];
  challenges: string[];
  recommendedActions: string[];
  timeline: string;
}

export class ViralOptimizationEngine {
  private readonly supabase = createClient();
  private readonly viralCalculator: AdvancedViralCalculator;
  private readonly weddingAnalyzer: WeddingViralAnalyzer;

  constructor() {
    this.viralCalculator = new AdvancedViralCalculator();
    this.weddingAnalyzer = new WeddingViralAnalyzer();
  }

  async simulateViralIntervention(
    intervention: ViralIntervention,
  ): Promise<ViralSimulationResult> {
    // Get current metrics as baseline
    const currentMetrics = await this.viralCalculator.calculateEnhanced({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    // Calculate intervention effects
    const interventionEffects = await this.calculateInterventionEffects(
      intervention,
      currentMetrics,
    );

    // Project new metrics
    const projectedMetrics = await this.applyInterventionEffects(
      currentMetrics,
      interventionEffects,
    );

    // Calculate impact
    const impact = this.calculateSimulationImpact(
      currentMetrics,
      projectedMetrics,
    );

    // Assess confidence
    const confidence = await this.assessSimulationConfidence(
      intervention,
      impact,
    );

    // Identify risks
    const risks = await this.identifySimulationRisks(intervention, impact);

    // Generate timeline
    const timeline = await this.generateSimulationTimeline(
      intervention,
      currentMetrics,
      projectedMetrics,
    );

    // Calculate ROI
    const roi = await this.calculateROI(intervention, impact);

    return {
      intervention,
      currentMetrics,
      projectedMetrics,
      impact,
      confidence,
      risks,
      timeline,
      roi,
    };
  }

  private async calculateInterventionEffects(
    intervention: ViralIntervention,
    currentMetrics: EnhancedViralCoefficient,
  ): Promise<Record<string, number>> {
    const effects: Record<string, number> = {};

    switch (intervention.type) {
      case 'invitation_incentive':
        effects.invitationRateMultiplier = this.calculateIncentiveEffect(
          intervention.parameters,
        );
        effects.qualityScoreImpact = -0.1; // Slight quality decrease due to incentivized invites
        break;

      case 'onboarding_optimization':
        effects.activationRateMultiplier = this.calculateOnboardingEffect(
          intervention.parameters,
        );
        effects.timeToInviteReduction = 0.3; // 30% faster to first invite
        break;

      case 'seasonal_campaign':
        effects.seasonalMultiplierBoost = this.calculateSeasonalCampaignEffect(
          intervention.parameters,
        );
        effects.networkReachIncrease = 0.2; // 20% more reach
        break;

      case 'referral_bonus':
        effects.invitationRateMultiplier = this.calculateReferralBonusEffect(
          intervention.parameters,
        );
        effects.qualityScoreImpact = 0.1; // Higher quality due to monetary motivation
        break;

      case 'network_effect_boost':
        effects.networkEfficiencyMultiplier = this.calculateNetworkBoostEffect(
          intervention.parameters,
        );
        effects.amplificationIncrease = 0.4; // 40% more secondary referrals
        break;
    }

    return effects;
  }

  private calculateIncentiveEffect(parameters: InterventionParameters): number {
    const baseMultiplier = 1.3; // 30% increase baseline
    const incentiveAmount = parameters.incentiveAmount || 0;

    // Diminishing returns on incentive amount
    const amountMultiplier = Math.min(2.0, 1 + (incentiveAmount / 100) * 0.1);

    const typeMultiplier = {
      monetary: 1.2,
      feature_access: 1.1,
      service_credit: 1.15,
    }[parameters.incentiveType || 'monetary'];

    return baseMultiplier * amountMultiplier * typeMultiplier;
  }

  private calculateOnboardingEffect(
    parameters: InterventionParameters,
  ): number {
    const baseMultiplier = 1.25; // 25% improvement baseline
    const flowOptimization = parameters.flowOptimization || 'streamline';

    const optimizationMultiplier = {
      streamline: 1.3,
      gamification: 1.4,
      personal_touch: 1.2,
    }[flowOptimization];

    const stepReduction = parameters.reductionInSteps || 0;
    const stepMultiplier = 1 + stepReduction * 0.05; // 5% improvement per step reduced

    return baseMultiplier * optimizationMultiplier * stepMultiplier;
  }

  private calculateSeasonalCampaignEffect(
    parameters: InterventionParameters,
  ): number {
    const baseMultiplier = 1.2; // 20% improvement baseline
    const campaignType = parameters.campaignType || 'email';

    const typeMultiplier = {
      social_media: 1.4,
      email: 1.2,
      partnerships: 1.5,
      content_marketing: 1.3,
    }[campaignType];

    const seasonMultiplier = {
      peak: 0.9, // Less effective in peak season due to saturation
      shoulder: 1.2, // Most effective in shoulder season
      off: 1.4, // Very effective in off-season due to low activity
    }[parameters.targetSeason || 'shoulder'];

    return baseMultiplier * typeMultiplier * seasonMultiplier;
  }

  private calculateReferralBonusEffect(
    parameters: InterventionParameters,
  ): number {
    const baseMultiplier = 1.35; // 35% improvement baseline
    const bonusAmount = parameters.bonusAmount || 0;
    const bonusStructure = parameters.bonusStructure || 'flat';

    const amountMultiplier = Math.min(1.8, 1 + (bonusAmount / 50) * 0.1);

    const structureMultiplier = {
      flat: 1.1,
      tiered: 1.3,
      performance_based: 1.4,
    }[bonusStructure];

    return baseMultiplier * amountMultiplier * structureMultiplier;
  }

  private calculateNetworkBoostEffect(
    parameters: InterventionParameters,
  ): number {
    const baseMultiplier = 1.4; // 40% improvement baseline
    const networkTargeting = parameters.networkTargeting || 'hubs';

    const targetingMultiplier = {
      hubs: 1.5, // Most effective - target high-influence vendors
      bridges: 1.3, // Effective - improve network connectivity
      clusters: 1.2, // Less effective - localized impact
    }[networkTargeting];

    const amplificationTarget = parameters.amplificationTarget || 1.2;
    const amplificationMultiplier = Math.min(2.0, amplificationTarget);

    return baseMultiplier * targetingMultiplier * amplificationMultiplier;
  }

  private async applyInterventionEffects(
    currentMetrics: EnhancedViralCoefficient,
    effects: Record<string, number>,
  ): Promise<EnhancedViralCoefficient> {
    const projected: EnhancedViralCoefficient = { ...currentMetrics };

    // Apply effects to relevant metrics
    if (effects.invitationRateMultiplier) {
      projected.invitationRate *= effects.invitationRateMultiplier;
    }

    if (effects.activationRateMultiplier) {
      projected.activationRate *= effects.activationRateMultiplier;
    }

    if (effects.qualityScoreImpact) {
      projected.qualityScore = Math.max(
        0,
        Math.min(1, projected.qualityScore + effects.qualityScoreImpact),
      );
    }

    if (effects.timeToInviteReduction) {
      projected.timeToInvite *= 1 - effects.timeToInviteReduction;
    }

    if (effects.seasonalMultiplierBoost) {
      projected.weddingSeasonMultiplier *= effects.seasonalMultiplierBoost;
    }

    if (effects.networkEfficiencyMultiplier) {
      projected.loopEfficiency *= effects.networkEfficiencyMultiplier;
    }

    // Recalculate composite metrics
    projected.coefficient =
      projected.invitationRate *
      projected.acceptanceRate *
      projected.activationRate;
    projected.adjustedCoefficient =
      projected.coefficient * projected.weddingSeasonMultiplier;
    projected.sustainableCoefficient = projected.coefficient * 0.85; // Conservative adjustment

    // Update loops with amplification effects
    if (effects.amplificationIncrease) {
      projected.loops = projected.loops.map((loop) => ({
        ...loop,
        amplification: loop.amplification * (1 + effects.amplificationIncrease),
      }));
    }

    return projected;
  }

  private calculateSimulationImpact(
    current: EnhancedViralCoefficient,
    projected: EnhancedViralCoefficient,
  ): SimulationImpact {
    return {
      coefficientIncrease: projected.coefficient - current.coefficient,
      userGrowthImpact: this.calculateUserGrowthImpact(
        current.coefficient,
        projected.coefficient,
      ),
      revenueImpact: this.calculateRevenueImpact(
        current.coefficient,
        projected.coefficient,
      ),
      retentionImpact: projected.qualityScore - current.qualityScore,
      qualityImpact: projected.qualityScore - current.qualityScore,
      networkStrengthImpact: projected.loopEfficiency - current.loopEfficiency,
    };
  }

  private calculateUserGrowthImpact(
    currentCoeff: number,
    projectedCoeff: number,
  ): number {
    // Simplified user growth calculation based on viral coefficient
    const currentGrowthRate = Math.pow(currentCoeff, 30); // 30-day growth
    const projectedGrowthRate = Math.pow(projectedCoeff, 30);
    return projectedGrowthRate - currentGrowthRate;
  }

  private calculateRevenueImpact(
    currentCoeff: number,
    projectedCoeff: number,
  ): number {
    // Simplified revenue calculation - assumes £50 average revenue per user
    const userGrowthImpact = this.calculateUserGrowthImpact(
      currentCoeff,
      projectedCoeff,
    );
    return userGrowthImpact * 50; // £50 per user
  }

  private async assessSimulationConfidence(
    intervention: ViralIntervention,
    impact: SimulationImpact,
  ): Promise<number> {
    let confidence = 0.7; // Base confidence

    // Adjust based on intervention type (some are more predictable)
    const typeConfidenceAdjustment = {
      invitation_incentive: 0.1, // Well understood
      onboarding_optimization: 0.05, // Somewhat predictable
      seasonal_campaign: -0.05, // External factors
      referral_bonus: 0.1, // Well understood
      network_effect_boost: -0.1, // Complex interactions
    };

    confidence += typeConfidenceAdjustment[intervention.type] || 0;

    // Adjust based on magnitude of impact (larger changes are riskier)
    if (Math.abs(impact.coefficientIncrease) > 0.5) {
      confidence -= 0.2; // Large changes are less predictable
    } else if (Math.abs(impact.coefficientIncrease) > 0.2) {
      confidence -= 0.1;
    }

    // Adjust based on historical data availability
    const hasHistoricalData = await this.checkHistoricalDataAvailability(
      intervention.type,
    );
    if (!hasHistoricalData) {
      confidence -= 0.15;
    }

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private async checkHistoricalDataAvailability(
    interventionType: string,
  ): Promise<boolean> {
    // Check if we have historical data for this type of intervention
    const { count, error } = await this.supabase
      .from('viral_loop_metrics')
      .select('*', { count: 'exact', head: true })
      .eq('loop_type', interventionType)
      .gte(
        'start_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      );

    return !error && (count || 0) > 5; // At least 5 historical data points
  }

  private async identifySimulationRisks(
    intervention: ViralIntervention,
    impact: SimulationImpact,
  ): Promise<SimulationRisk[]> {
    const risks: SimulationRisk[] = [];

    // Cannibalisation risk
    if (impact.coefficientIncrease > 0.3) {
      risks.push({
        type: 'cannibalisation',
        probability: 0.4,
        impact: 0.6,
        description: 'High growth might cannibalize organic referrals',
        mitigation: 'Monitor organic vs incentivized referral ratios',
      });
    }

    // Quality degradation risk
    if (
      intervention.type === 'invitation_incentive' &&
      intervention.parameters.incentiveAmount! > 20
    ) {
      risks.push({
        type: 'quality_degradation',
        probability: 0.6,
        impact: 0.5,
        description: 'High incentives may attract low-quality referrals',
        mitigation: 'Implement quality scoring and referral validation',
      });
    }

    // Cost overrun risk
    if (intervention.cost > 10000) {
      risks.push({
        type: 'cost_overrun',
        probability: 0.3,
        impact: 0.7,
        description: 'High-cost interventions may exceed budget',
        mitigation: 'Implement daily spend limits and monitoring',
      });
    }

    // Seasonality mismatch
    const currentMonth = new Date().getMonth() + 1;
    const isPeakSeason = [5, 6, 7, 8, 9].includes(currentMonth);
    if (intervention.type === 'seasonal_campaign' && isPeakSeason) {
      risks.push({
        type: 'seasonality_mismatch',
        probability: 0.5,
        impact: 0.4,
        description: 'Peak season campaigns face higher competition',
        mitigation: 'Focus on niche segments or off-peak timing',
      });
    }

    // Network saturation
    if (impact.networkStrengthImpact > 0.4) {
      risks.push({
        type: 'network_saturation',
        probability: 0.3,
        impact: 0.6,
        description: 'Network may reach saturation point',
        mitigation: 'Expand to new geographic or vendor segments',
      });
    }

    return risks.sort(
      (a, b) => b.probability * b.impact - a.probability * a.impact,
    );
  }

  private async generateSimulationTimeline(
    intervention: ViralIntervention,
    current: EnhancedViralCoefficient,
    projected: EnhancedViralCoefficient,
  ): Promise<SimulationTimeline[]> {
    const timeline: SimulationTimeline[] = [];
    const duration = intervention.duration;
    const rampUpPeriod = Math.min(14, duration * 0.3); // 30% of duration or max 14 days

    for (
      let day = 0;
      day <= duration;
      day += Math.max(1, Math.floor(duration / 20))
    ) {
      let progress: number;

      if (day <= rampUpPeriod) {
        // Gradual ramp-up
        progress = (day / rampUpPeriod) * 0.6; // 60% effect during ramp-up
      } else if (day <= duration * 0.8) {
        // Full effect period
        progress =
          0.6 + ((day - rampUpPeriod) / (duration * 0.8 - rampUpPeriod)) * 0.4;
      } else {
        // Stable period
        progress = 1.0;
      }

      const dailyCoefficient =
        current.coefficient +
        (projected.coefficient - current.coefficient) * progress;

      const cumulativeUsers = this.calculateCumulativeUsers(
        dailyCoefficient,
        day,
      );
      const cumulativeRevenue = cumulativeUsers * 50; // £50 average revenue per user

      // Confidence decreases with time due to increasing uncertainty
      const confidence = Math.max(0.3, 0.9 - (day / duration) * 0.3);

      timeline.push({
        day,
        projectedCoefficient: dailyCoefficient,
        cumulativeUsers,
        cumulativeRevenue,
        confidence,
      });
    }

    return timeline;
  }

  private calculateCumulativeUsers(coefficient: number, days: number): number {
    // Simplified exponential growth calculation
    const baseUsers = 1000; // Starting user base
    const dailyGrowthRate = Math.pow(coefficient, 1 / 30); // Daily equivalent of monthly coefficient
    return baseUsers * Math.pow(dailyGrowthRate, days);
  }

  private async calculateROI(
    intervention: ViralIntervention,
    impact: SimulationImpact,
  ): Promise<ROIAnalysis> {
    const investmentRequired = intervention.cost;
    const projectedRevenue = Math.abs(impact.revenueImpact);

    // Calculate break-even days
    const dailyRevenue = projectedRevenue / intervention.duration;
    const breakEvenDays =
      dailyRevenue > 0
        ? investmentRequired / dailyRevenue
        : intervention.duration;

    // Net ROI calculation
    const netROI =
      projectedRevenue > 0
        ? (projectedRevenue - investmentRequired) / investmentRequired
        : -1;

    // Payback period (simplified)
    const paybackPeriod = breakEvenDays;

    // Risk-adjusted ROI (apply 20% discount for uncertainty)
    const riskAdjustedROI = netROI * 0.8;

    return {
      investmentRequired,
      breakEvenDays,
      projectedRevenue,
      netROI,
      paybackPeriod,
      riskAdjustedROI,
    };
  }

  async analyzeViralBottlenecks(): Promise<BottleneckAnalysis> {
    // Get current viral metrics
    const currentMetrics = await this.viralCalculator.calculateEnhanced({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    // Get current users for bottleneck analysis
    const { data: users, error } = await this.supabase
      .from('user_profiles')
      .select('id')
      .gte(
        'created_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    if (error)
      throw new Error(
        `Failed to get users for bottleneck analysis: ${error.message}`,
      );

    const userIds = users?.map((u) => u.id) || [];

    // Identify bottlenecks
    const bottlenecks =
      await this.viralCalculator.identifyViralBottlenecks(userIds);

    // Determine critical path
    const criticalPath = this.determineCriticalPath(bottlenecks);

    // Calculate optimization potential
    const optimizationPotential =
      this.calculateOptimizationPotential(bottlenecks);

    // Identify quick wins
    const quickWins = await this.identifyQuickWins(bottlenecks, currentMetrics);

    // Identify long-term opportunities
    const longTermOpportunities = await this.identifyLongTermOpportunities(
      bottlenecks,
      currentMetrics,
    );

    // Get seasonal considerations
    const seasonalConsiderations = this.getSeasonalConsiderations();

    return {
      bottlenecks,
      criticalPath,
      optimizationPotential,
      quickWins,
      longTermOpportunities,
      seasonalConsiderations,
    };
  }

  private determineCriticalPath(bottlenecks: ViralBottleneck[]): string[] {
    // Order bottlenecks by impact to determine critical path
    const sortedBottlenecks = [...bottlenecks].sort(
      (a, b) => b.impact - a.impact,
    );

    // Critical path is the sequence of stages from highest to lowest impact
    return sortedBottlenecks.map((bottleneck) => bottleneck.stage);
  }

  private calculateOptimizationPotential(
    bottlenecks: ViralBottleneck[],
  ): number {
    // Sum up all the improvement potential from bottlenecks
    return bottlenecks.reduce(
      (total, bottleneck) => total + bottleneck.estimatedImprovementPotential,
      0,
    );
  }

  private async identifyQuickWins(
    bottlenecks: ViralBottleneck[],
    currentMetrics: EnhancedViralCoefficient,
  ): Promise<QuickWin[]> {
    const quickWins: QuickWin[] = [];

    bottlenecks.forEach((bottleneck) => {
      switch (bottleneck.stage) {
        case 'invitation':
          if (bottleneck.impact > 0.3) {
            quickWins.push({
              action: 'Add invitation prompts to onboarding flow',
              estimatedImpact: 0.15,
              implementationDays: 3,
              cost: 500,
              confidence: 0.8,
              dependencies: ['UI changes', 'A/B testing setup'],
            });
          }
          break;

        case 'acceptance':
          if (bottleneck.impact > 0.2) {
            quickWins.push({
              action: 'Improve invitation email templates and subject lines',
              estimatedImpact: 0.12,
              implementationDays: 2,
              cost: 200,
              confidence: 0.85,
              dependencies: ['Email template updates', 'A/B test framework'],
            });
          }
          break;

        case 'activation':
          if (bottleneck.impact > 0.25) {
            quickWins.push({
              action: 'Streamline signup flow and reduce friction points',
              estimatedImpact: 0.18,
              implementationDays: 5,
              cost: 1000,
              confidence: 0.75,
              dependencies: ['Form optimization', 'User testing'],
            });
          }
          break;

        case 'amplification':
          if (bottleneck.impact > 0.15) {
            quickWins.push({
              action: 'Add post-signup invitation suggestions',
              estimatedImpact: 0.1,
              implementationDays: 4,
              cost: 700,
              confidence: 0.7,
              dependencies: ['Feature development', 'Analytics tracking'],
            });
          }
          break;
      }
    });

    // Sort by ROI (impact / (cost + time))
    return quickWins.sort((a, b) => {
      const roiA =
        a.estimatedImpact / (a.cost / 1000 + a.implementationDays / 10);
      const roiB =
        b.estimatedImpact / (b.cost / 1000 + b.implementationDays / 10);
      return roiB - roiA;
    });
  }

  private async identifyLongTermOpportunities(
    bottlenecks: ViralBottleneck[],
    currentMetrics: EnhancedViralCoefficient,
  ): Promise<LongTermOpportunity[]> {
    const opportunities: LongTermOpportunity[] = [];

    // AI-powered referral matching
    if (currentMetrics.qualityScore < 0.6) {
      opportunities.push({
        opportunity:
          'Implement AI-powered referral quality scoring and matching',
        potentialImpact: 0.3,
        timeToImplement: 6,
        resourceRequirement: 'high',
        strategicValue: 0.9,
      });
    }

    // Advanced network analysis
    if (currentMetrics.loopEfficiency < 0.5) {
      opportunities.push({
        opportunity:
          'Build advanced network analysis for vendor ecosystem mapping',
        potentialImpact: 0.25,
        timeToImplement: 4,
        resourceRequirement: 'medium',
        strategicValue: 0.8,
      });
    }

    // Predictive viral modeling
    opportunities.push({
      opportunity: 'Develop predictive viral coefficient modeling with ML',
      potentialImpact: 0.4,
      timeToImplement: 8,
      resourceRequirement: 'high',
      strategicValue: 0.95,
    });

    // Geographic expansion optimization
    if (currentMetrics.geographicSpread.length < 5) {
      opportunities.push({
        opportunity:
          'Geographic viral expansion with localized referral strategies',
        potentialImpact: 0.35,
        timeToImplement: 12,
        resourceRequirement: 'high',
        strategicValue: 0.85,
      });
    }

    // Wedding industry partnerships
    opportunities.push({
      opportunity:
        'Strategic partnerships with wedding industry leaders for viral amplification',
      potentialImpact: 0.5,
      timeToImplement: 9,
      resourceRequirement: 'medium',
      strategicValue: 0.9,
    });

    return opportunities.sort((a, b) => b.strategicValue - a.strategicValue);
  }

  private getSeasonalConsiderations(): SeasonalConsideration[] {
    return [
      {
        season: 'peak',
        opportunities: [
          'High wedding density creates natural viral opportunities',
          'Vendor-to-vendor referrals are most active',
          'Cross-wedding network effects are strongest',
        ],
        challenges: [
          'High competition for vendor attention',
          'Resource scarcity limits referral incentives',
          'Market saturation in popular regions',
        ],
        recommendedActions: [
          'Focus on quality over quantity referrals',
          'Target underserved geographic markets',
          'Leverage vendor collaboration during busy season',
        ],
        timeline: 'May-September',
      },
      {
        season: 'shoulder',
        opportunities: [
          'Vendors have more time for relationship building',
          'Lower competition for marketing channels',
          'Opportunity for strategic partnership development',
        ],
        challenges: [
          'Reduced wedding volume limits natural virality',
          'Couple engagement may be lower',
          'Seasonal budget constraints',
        ],
        recommendedActions: [
          'Launch relationship-building campaigns',
          'Focus on vendor education and training',
          'Prepare for peak season viral acceleration',
        ],
        timeline: 'April & October',
      },
      {
        season: 'off',
        opportunities: [
          'Maximum vendor availability for engagement',
          'Lowest cost for incentive programs',
          'Best time for system improvements and testing',
        ],
        challenges: [
          'Very low natural wedding activity',
          'Couple acquisition is most difficult',
          'Long sales cycles',
        ],
        recommendedActions: [
          'Focus on vendor acquisition and retention',
          'Build anticipation for upcoming season',
          'Implement major platform improvements',
        ],
        timeline: 'November-March',
      },
    ];
  }
}
