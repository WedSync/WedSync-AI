// WS-230 Enhanced Viral Coefficient Tracking System
// Viral Simulation Engine - Core simulation logic for testing different interventions

import {
  ViralMetrics,
  ViralCoefficientResult,
  ViralBottleneck,
} from '../../types/viral-analytics';

export interface ViralIntervention {
  type:
    | 'INVITE_FLOW_IMPROVEMENT'
    | 'ONBOARDING_OPTIMIZATION'
    | 'ENGAGEMENT_BOOST'
    | 'SEASONAL_CAMPAIGN'
    | 'TIER_UPGRADE_INCENTIVE';
  name: string;
  description: string;
  targetMetric:
    | 'acceptance_rate'
    | 'conversion_rate'
    | 'engagement_rate'
    | 'overall';
  expectedImprovement: number; // Percentage improvement (e.g., 0.15 for 15%)
  implementationCost: number; // In GBP
  implementationTimeWeeks: number;
  confidence: number; // 0-1 confidence in the improvement estimate
}

export interface SimulationScenario {
  name: string;
  description: string;
  baselineMetrics: ViralMetrics;
  interventions: ViralIntervention[];
  seasonality?: 'peak' | 'normal' | 'off';
  duration: number; // Simulation duration in days
  cohortSize: number; // Number of users to simulate
}

export interface SimulationResult {
  scenario: string;
  intervention: ViralIntervention;

  // Current vs Projected Metrics
  currentCoefficient: number;
  projectedCoefficient: number;
  coefficientImprovement: number;

  // Business Impact
  additionalUsers: number;
  additionalRevenue: number;
  roi: number; // Return on Investment
  breakEvenDays: number;

  // Statistical Confidence
  confidenceScore: number;
  statisticalSignificance: number;
  sampleSize: number;

  // Risk Assessment
  risks: string[];
  assumptions: string[];
  sensitivity: SensitivityAnalysis;
}

export interface SensitivityAnalysis {
  optimisticCoefficient: number;
  pessimisticCoefficient: number;
  optimisticROI: number;
  pessimisticROI: number;
  riskAdjustedROI: number;
}

export interface ABTestConfiguration {
  testName: string;
  controlGroup: ViralMetrics;
  treatmentGroup: ViralMetrics;
  sampleSize: number;
  duration: number; // days
  significanceLevel: number; // e.g., 0.05 for 95% confidence
  minimumDetectableEffect: number; // Minimum effect size to detect
}

export interface ABTestResult {
  testName: string;
  statisticallySignificant: boolean;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
  power: number;
  recommendation: 'IMPLEMENT' | 'REJECT' | 'EXTEND_TEST' | 'REDESIGN';
}

export class ViralSimulationEngine {
  private readonly WEDDING_SEASONS = {
    peak: { months: [5, 6, 7, 8, 9, 10], multiplier: 1.4 },
    normal: { months: [3, 4, 11], multiplier: 1.0 },
    off: { months: [1, 2, 12], multiplier: 0.7 },
  };

  private readonly TIER_MULTIPLIERS = {
    STARTER: 1.0,
    PROFESSIONAL: 1.2,
    SCALE: 1.5,
    ENTERPRISE: 1.8,
  };

  private readonly AVERAGE_REVENUE_PER_USER = {
    STARTER: 19 * 12, // Annual value
    PROFESSIONAL: 49 * 12,
    SCALE: 79 * 12,
    ENTERPRISE: 149 * 12,
  };

  /**
   * Run a comprehensive viral intervention simulation
   */
  async simulateIntervention(
    scenario: SimulationScenario,
  ): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    for (const intervention of scenario.interventions) {
      const result = await this.runSingleInterventionSimulation(
        scenario,
        intervention,
      );
      results.push(result);
    }

    return results.sort((a, b) => b.roi - a.roi); // Sort by ROI descending
  }

  /**
   * Run A/B test simulation to validate intervention effectiveness
   */
  async runABTestSimulation(
    config: ABTestConfiguration,
  ): Promise<ABTestResult> {
    // Calculate effect size
    const controlCoefficient = this.calculateViralCoefficient(
      config.controlGroup,
    );
    const treatmentCoefficient = this.calculateViralCoefficient(
      config.treatmentGroup,
    );
    const effectSize = treatmentCoefficient - controlCoefficient;

    // Calculate statistical power and significance
    const power = this.calculateStatisticalPower(
      effectSize,
      config.sampleSize,
      config.significanceLevel,
    );

    const pValue = this.calculatePValue(
      controlCoefficient,
      treatmentCoefficient,
      config.sampleSize,
    );

    const confidenceInterval = this.calculateConfidenceInterval(
      effectSize,
      config.sampleSize,
      config.significanceLevel,
    );

    const recommendation = this.generateABTestRecommendation(
      pValue,
      effectSize,
      power,
      config.minimumDetectableEffect,
    );

    return {
      testName: config.testName,
      statisticallySignificant: pValue < config.significanceLevel,
      pValue,
      confidenceInterval,
      effectSize,
      power,
      recommendation,
    };
  }

  /**
   * Validate simulation accuracy against real historical data
   */
  async validateSimulationAccuracy(
    historicalMetrics: ViralMetrics[],
    simulatedMetrics: ViralMetrics[],
  ): Promise<ValidationResults> {
    if (historicalMetrics.length !== simulatedMetrics.length) {
      throw new Error(
        'Historical and simulated metrics arrays must have the same length',
      );
    }

    const accuracyScores: number[] = [];
    const deviations: number[] = [];

    for (let i = 0; i < historicalMetrics.length; i++) {
      const historical = this.calculateViralCoefficient(historicalMetrics[i]);
      const simulated = this.calculateViralCoefficient(simulatedMetrics[i]);

      const deviation = Math.abs(historical - simulated) / historical;
      const accuracy = 1 - Math.min(deviation, 1);

      accuracyScores.push(accuracy);
      deviations.push(deviation);
    }

    const avgAccuracy =
      accuracyScores.reduce((sum, score) => sum + score, 0) /
      accuracyScores.length;
    const avgDeviation =
      deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);

    return {
      averageAccuracy: avgAccuracy,
      averageDeviation: avgDeviation,
      maxDeviation: maxDeviation,
      withinTolerancePercentage:
        accuracyScores.filter((score) => score >= 0.95).length /
        accuracyScores.length,
      validationPassed: avgAccuracy >= 0.95 && maxDeviation <= 0.15, // Within 5% average, 15% max
      recommendations: this.generateValidationRecommendations(
        avgAccuracy,
        maxDeviation,
      ),
    };
  }

  /**
   * Generate wedding industry-specific simulation scenarios
   */
  generateWeddingScenarios(): SimulationScenario[] {
    return [
      {
        name: 'Peak Season Photography Boost',
        description:
          'Photographer referral optimization during peak wedding season',
        baselineMetrics: {
          totalInvites: 2000,
          acceptedInvites: 1200,
          newUserRegistrations: 960,
          activeEngagement: 720,
          timeframe: 30,
          tier: 'PROFESSIONAL',
        },
        interventions: [
          {
            type: 'ENGAGEMENT_BOOST',
            name: 'Photo Gallery Showcase',
            description:
              'Show photographers successful couple galleries to encourage invites',
            targetMetric: 'engagement_rate',
            expectedImprovement: 0.25,
            implementationCost: 5000,
            implementationTimeWeeks: 3,
            confidence: 0.8,
          },
        ],
        seasonality: 'peak',
        duration: 90,
        cohortSize: 1000,
      },
      {
        name: 'Off-Season Venue Incentive',
        description:
          'Venue referral campaign during off-season to maintain growth',
        baselineMetrics: {
          totalInvites: 800,
          acceptedInvites: 480,
          newUserRegistrations: 336,
          activeEngagement: 235,
          timeframe: 30,
          tier: 'SCALE',
        },
        interventions: [
          {
            type: 'SEASONAL_CAMPAIGN',
            name: 'Winter Wedding Package',
            description:
              'Special incentives for venues to refer couples in off-season',
            targetMetric: 'acceptance_rate',
            expectedImprovement: 0.35,
            implementationCost: 8000,
            implementationTimeWeeks: 2,
            confidence: 0.75,
          },
        ],
        seasonality: 'off',
        duration: 120,
        cohortSize: 500,
      },
      {
        name: 'Tier Upgrade Viral Boost',
        description:
          'Upgrade existing users to higher tiers to increase viral coefficient',
        baselineMetrics: {
          totalInvites: 1500,
          acceptedInvites: 1050,
          newUserRegistrations: 840,
          activeEngagement: 630,
          timeframe: 30,
          tier: 'STARTER',
        },
        interventions: [
          {
            type: 'TIER_UPGRADE_INCENTIVE',
            name: 'Professional Feature Access',
            description:
              'Offer 2-month free upgrade to Professional tier for active referrers',
            targetMetric: 'overall',
            expectedImprovement: 0.45, // Higher tier = better viral coefficient
            implementationCost: 12000, // Cost of free upgrades
            implementationTimeWeeks: 1,
            confidence: 0.85,
          },
        ],
        seasonality: 'normal',
        duration: 60,
        cohortSize: 800,
      },
    ];
  }

  private async runSingleInterventionSimulation(
    scenario: SimulationScenario,
    intervention: ViralIntervention,
  ): Promise<SimulationResult> {
    // Calculate baseline metrics
    const currentCoefficient = this.calculateViralCoefficient(
      scenario.baselineMetrics,
    );

    // Apply intervention improvements
    const improvedMetrics = this.applyIntervention(
      scenario.baselineMetrics,
      intervention,
    );
    const projectedCoefficient =
      this.calculateViralCoefficient(improvedMetrics);

    // Apply seasonal adjustments
    const seasonalMultiplier = scenario.seasonality
      ? this.WEDDING_SEASONS[scenario.seasonality].multiplier
      : 1.0;

    const seasonallyAdjustedProjected =
      projectedCoefficient * seasonalMultiplier;

    // Calculate business impact
    const coefficientImprovement =
      seasonallyAdjustedProjected - currentCoefficient * seasonalMultiplier;
    const additionalUsers = this.calculateAdditionalUsers(
      coefficientImprovement,
      scenario.cohortSize,
      scenario.duration,
    );

    const avgRevenuePerUser =
      this.AVERAGE_REVENUE_PER_USER[scenario.baselineMetrics.tier];
    const additionalRevenue = additionalUsers * avgRevenuePerUser;
    const roi =
      (additionalRevenue - intervention.implementationCost) /
      intervention.implementationCost;

    // Calculate break-even point
    const breakEvenDays = this.calculateBreakEvenDays(
      intervention.implementationCost,
      additionalUsers,
      avgRevenuePerUser,
      scenario.duration,
    );

    // Generate sensitivity analysis
    const sensitivity = this.runSensitivityAnalysis(
      currentCoefficient,
      projectedCoefficient,
      intervention,
      seasonalMultiplier,
      scenario.cohortSize,
      avgRevenuePerUser,
    );

    // Calculate confidence and significance
    const confidenceScore =
      intervention.confidence *
      this.calculateImplementationConfidence(intervention);
    const sampleSize = this.calculateRequiredSampleSize(coefficientImprovement);

    return {
      scenario: scenario.name,
      intervention,
      currentCoefficient: currentCoefficient * seasonalMultiplier,
      projectedCoefficient: seasonallyAdjustedProjected,
      coefficientImprovement,
      additionalUsers,
      additionalRevenue,
      roi,
      breakEvenDays,
      confidenceScore,
      statisticalSignificance: this.calculateStatisticalSignificance(
        coefficientImprovement,
        sampleSize,
      ),
      sampleSize,
      risks: this.identifyImplementationRisks(intervention, scenario),
      assumptions: this.listKeyAssumptions(intervention, scenario),
      sensitivity,
    };
  }

  private calculateViralCoefficient(metrics: ViralMetrics): number {
    if (metrics.totalInvites === 0) return 0;

    const baseCoefficient = metrics.newUserRegistrations / metrics.totalInvites;
    const engagementMultiplier =
      0.8 + (metrics.activeEngagement / metrics.newUserRegistrations) * 0.4;
    const tierMultiplier = this.TIER_MULTIPLIERS[metrics.tier];

    return baseCoefficient * engagementMultiplier * tierMultiplier;
  }

  private applyIntervention(
    baseMetrics: ViralMetrics,
    intervention: ViralIntervention,
  ): ViralMetrics {
    const improved = { ...baseMetrics };

    switch (intervention.targetMetric) {
      case 'acceptance_rate':
        improved.acceptedInvites = Math.min(
          improved.totalInvites,
          improved.acceptedInvites * (1 + intervention.expectedImprovement),
        );
        // Proportionally adjust downstream metrics
        const acceptanceRatio =
          improved.acceptedInvites / baseMetrics.acceptedInvites;
        improved.newUserRegistrations = Math.floor(
          baseMetrics.newUserRegistrations * acceptanceRatio,
        );
        improved.activeEngagement = Math.floor(
          baseMetrics.activeEngagement * acceptanceRatio,
        );
        break;

      case 'conversion_rate':
        improved.newUserRegistrations = Math.min(
          improved.acceptedInvites,
          improved.newUserRegistrations *
            (1 + intervention.expectedImprovement),
        );
        // Proportionally adjust engagement
        const conversionRatio =
          improved.newUserRegistrations / baseMetrics.newUserRegistrations;
        improved.activeEngagement = Math.floor(
          baseMetrics.activeEngagement * conversionRatio,
        );
        break;

      case 'engagement_rate':
        improved.activeEngagement = Math.min(
          improved.newUserRegistrations,
          improved.activeEngagement * (1 + intervention.expectedImprovement),
        );
        break;

      case 'overall':
        // Apply improvement across all metrics proportionally
        improved.acceptedInvites = Math.floor(
          improved.acceptedInvites *
            (1 + intervention.expectedImprovement * 0.6),
        );
        improved.newUserRegistrations = Math.floor(
          improved.newUserRegistrations *
            (1 + intervention.expectedImprovement * 0.8),
        );
        improved.activeEngagement = Math.floor(
          improved.activeEngagement * (1 + intervention.expectedImprovement),
        );
        break;
    }

    return improved;
  }

  private calculateAdditionalUsers(
    coefficientImprovement: number,
    cohortSize: number,
    duration: number,
  ): number {
    // Compound growth model accounting for viral loops
    const growthCycles = Math.floor(duration / 30); // Assume 30-day viral cycles
    let additionalUsers = 0;

    for (let cycle = 0; cycle < growthCycles; cycle++) {
      const cycleGrowth =
        cohortSize * coefficientImprovement * Math.pow(1.1, cycle); // 10% acceleration
      additionalUsers += cycleGrowth;
    }

    return Math.floor(additionalUsers);
  }

  private calculateBreakEvenDays(
    implementationCost: number,
    additionalUsers: number,
    avgRevenuePerUser: number,
    totalDuration: number,
  ): number {
    if (additionalUsers === 0) return -1; // Never breaks even

    const dailyRevenue = (additionalUsers * avgRevenuePerUser) / totalDuration;
    return Math.ceil(implementationCost / dailyRevenue);
  }

  private runSensitivityAnalysis(
    currentCoefficient: number,
    projectedCoefficient: number,
    intervention: ViralIntervention,
    seasonalMultiplier: number,
    cohortSize: number,
    avgRevenuePerUser: number,
  ): SensitivityAnalysis {
    // Optimistic scenario (20% better than expected)
    const optimisticImprovement = intervention.expectedImprovement * 1.2;
    const optimisticCoefficient =
      currentCoefficient + (projectedCoefficient - currentCoefficient) * 1.2;
    const optimisticAdditionalUsers = this.calculateAdditionalUsers(
      optimisticCoefficient - currentCoefficient,
      cohortSize,
      90,
    );
    const optimisticROI =
      (optimisticAdditionalUsers * avgRevenuePerUser -
        intervention.implementationCost) /
      intervention.implementationCost;

    // Pessimistic scenario (50% worse than expected)
    const pessimisticImprovement = intervention.expectedImprovement * 0.5;
    const pessimisticCoefficient =
      currentCoefficient + (projectedCoefficient - currentCoefficient) * 0.5;
    const pessimisticAdditionalUsers = this.calculateAdditionalUsers(
      pessimisticCoefficient - currentCoefficient,
      cohortSize,
      90,
    );
    const pessimisticROI =
      (pessimisticAdditionalUsers * avgRevenuePerUser -
        intervention.implementationCost) /
      intervention.implementationCost;

    // Risk-adjusted ROI (weighted average with confidence factor)
    const riskAdjustedROI =
      optimisticROI * 0.2 +
      pessimisticROI * 0.3 +
      ((optimisticROI + pessimisticROI) / 2) * 0.5;

    return {
      optimisticCoefficient: optimisticCoefficient * seasonalMultiplier,
      pessimisticCoefficient: pessimisticCoefficient * seasonalMultiplier,
      optimisticROI,
      pessimisticROI,
      riskAdjustedROI,
    };
  }

  private calculateImplementationConfidence(
    intervention: ViralIntervention,
  ): number {
    // Adjust confidence based on implementation complexity
    let confidenceAdjustment = 1.0;

    if (intervention.implementationTimeWeeks > 8) {
      confidenceAdjustment *= 0.9; // Longer implementations are riskier
    }

    if (intervention.implementationCost > 20000) {
      confidenceAdjustment *= 0.85; // Higher cost = higher risk
    }

    if (intervention.type === 'SEASONAL_CAMPAIGN') {
      confidenceAdjustment *= 0.95; // Seasonal campaigns have timing risks
    }

    return Math.max(confidenceAdjustment, 0.5); // Minimum 50% confidence
  }

  private calculateRequiredSampleSize(expectedEffect: number): number {
    // Statistical power calculation for detecting effect size
    const alpha = 0.05; // Significance level
    const beta = 0.2; // Type II error rate (80% power)
    const effectSize = Math.abs(expectedEffect);

    if (effectSize === 0) return 10000; // Large sample needed for no effect

    // Simplified sample size calculation
    const zAlpha = 1.96; // Z-score for 95% confidence
    const zBeta = 0.84; // Z-score for 80% power

    return Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
  }

  private calculateStatisticalSignificance(
    effectSize: number,
    sampleSize: number,
  ): number {
    // Simplified significance calculation
    const standardError = 1 / Math.sqrt(sampleSize);
    const zScore = effectSize / standardError;

    // Convert z-score to p-value approximation
    return Math.max(0.001, 1 - Math.abs(zScore) / 4); // Simplified
  }

  private calculateStatisticalPower(
    effectSize: number,
    sampleSize: number,
    alpha: number,
  ): number {
    // Simplified power calculation
    const standardError = 1 / Math.sqrt(sampleSize);
    const criticalValue = 1.96; // For alpha = 0.05
    const nonCentrality = effectSize / standardError;

    return Math.min(
      0.99,
      Math.max(0.5, (nonCentrality - criticalValue) / 4 + 0.5),
    );
  }

  private calculatePValue(
    control: number,
    treatment: number,
    sampleSize: number,
  ): number {
    const effectSize = Math.abs(treatment - control);
    const standardError = Math.sqrt(2) / Math.sqrt(sampleSize);
    const zScore = effectSize / standardError;

    // Convert to p-value (simplified)
    return Math.max(0.001, Math.min(0.999, 2 * (1 - zScore / 4)));
  }

  private calculateConfidenceInterval(
    effectSize: number,
    sampleSize: number,
    alpha: number,
  ): [number, number] {
    const standardError = Math.sqrt(2) / Math.sqrt(sampleSize);
    const criticalValue = 1.96; // For 95% confidence
    const margin = criticalValue * standardError;

    return [effectSize - margin, effectSize + margin];
  }

  private generateABTestRecommendation(
    pValue: number,
    effectSize: number,
    power: number,
    minimumDetectableEffect: number,
  ): 'IMPLEMENT' | 'REJECT' | 'EXTEND_TEST' | 'REDESIGN' {
    if (pValue < 0.05 && effectSize >= minimumDetectableEffect) {
      return 'IMPLEMENT';
    }

    if (pValue > 0.1 && power < 0.8) {
      return 'EXTEND_TEST';
    }

    if (pValue < 0.05 && effectSize < minimumDetectableEffect) {
      return 'REDESIGN';
    }

    return 'REJECT';
  }

  private identifyImplementationRisks(
    intervention: ViralIntervention,
    scenario: SimulationScenario,
  ): string[] {
    const risks: string[] = [];

    if (intervention.implementationTimeWeeks > 6) {
      risks.push(
        'Extended implementation timeline may delay benefits and increase costs',
      );
    }

    if (intervention.confidence < 0.7) {
      risks.push(
        'Low confidence in expected improvement - results may vary significantly',
      );
    }

    if (
      scenario.seasonality === 'off' &&
      intervention.expectedImprovement > 0.3
    ) {
      risks.push(
        'High improvement expectations during off-season may be unrealistic',
      );
    }

    if (intervention.implementationCost > 15000) {
      risks.push(
        'High implementation cost increases financial risk and break-even time',
      );
    }

    return risks;
  }

  private listKeyAssumptions(
    intervention: ViralIntervention,
    scenario: SimulationScenario,
  ): string[] {
    const assumptions: string[] = [
      'User behavior remains consistent throughout the intervention period',
      'No competing platforms launch major viral features during test period',
      'Wedding industry seasonal patterns continue as historically observed',
      'Implementation quality meets specifications and user expectations',
    ];

    if (scenario.seasonality === 'peak') {
      assumptions.push('Peak season demand patterns continue as expected');
    }

    if (intervention.type === 'TIER_UPGRADE_INCENTIVE') {
      assumptions.push(
        'Users who upgrade will maintain higher activity levels',
      );
      assumptions.push(
        'Free upgrade period converts to paid subscriptions at expected rates',
      );
    }

    return assumptions;
  }

  private generateValidationRecommendations(
    avgAccuracy: number,
    maxDeviation: number,
  ): string[] {
    const recommendations: string[] = [];

    if (avgAccuracy < 0.95) {
      recommendations.push(
        'Improve simulation model accuracy by incorporating more historical data',
      );
      recommendations.push(
        'Review and adjust calculation methods for better precision',
      );
    }

    if (maxDeviation > 0.15) {
      recommendations.push(
        'Investigate outlier scenarios causing high deviation',
      );
      recommendations.push('Add error bounds to simulation results');
    }

    if (avgAccuracy >= 0.98) {
      recommendations.push(
        'Simulation model is highly accurate - suitable for production use',
      );
    }

    return recommendations;
  }
}

// Supporting interfaces
export interface ValidationResults {
  averageAccuracy: number;
  averageDeviation: number;
  maxDeviation: number;
  withinTolerancePercentage: number;
  validationPassed: boolean;
  recommendations: string[];
}
