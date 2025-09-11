/**
 * WS-340: Cost Optimizer
 * Team B - Backend/API Development
 *
 * Cost-optimized scaling with wedding-aware budgeting
 * Balances performance and cost during off-peak periods
 */

import { ScalingRecommendation } from '../types/core';

export interface CostOptimizationConfig {
  maxHourlyCost: number;
  maxDailyCost: number;
  maxMonthlyBudget: number;
  weddingDayBudgetMultiplier: number;
  costEfficiencyThreshold: number;
}

export interface CostConstraints {
  maxHourlyCost: number;
  maxScaleUpCost: number;
  budgetRemaining: number;
  costEfficiencyRequirement: number;
}

export class CostOptimizer {
  private config: CostOptimizationConfig;
  private currentMonthlyCost: number = 0;
  private hourlyRates: Map<string, number> = new Map();

  constructor(config?: Partial<CostOptimizationConfig>) {
    this.config = {
      maxHourlyCost: 1000, // $1000/hour max
      maxDailyCost: 20000, // $20k/day max
      maxMonthlyBudget: 500000, // $500k/month budget
      weddingDayBudgetMultiplier: 2.0, // Allow 2x budget on wedding days
      costEfficiencyThreshold: 0.7, // 70% cost efficiency required
      ...config,
    };

    this.initializeHourlyRates();
  }

  private initializeHourlyRates(): void {
    // Service hourly rates (per instance)
    this.hourlyRates.set('api', 0.2);
    this.hourlyRates.set('database', 0.5);
    this.hourlyRates.set('file-storage', 0.15);
    this.hourlyRates.set('real-time', 0.3);
    this.hourlyRates.set('ai-services', 0.8);
  }

  async optimizeRecommendations(
    recommendations: ScalingRecommendation[],
    constraints: CostConstraints,
  ): Promise<ScalingRecommendation[]> {
    if (recommendations.length === 0) return recommendations;

    console.log(
      `[CostOptimizer] Optimizing ${recommendations.length} scaling recommendations`,
    );

    // Calculate total cost impact
    const totalCostImpact = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedCost,
      0,
    );
    console.log(
      `[CostOptimizer] Total estimated cost impact: $${totalCostImpact.toFixed(2)}`,
    );

    // Check budget constraints
    if (totalCostImpact > constraints.maxScaleUpCost) {
      console.log(
        `[CostOptimizer] Cost impact exceeds budget, optimizing recommendations`,
      );
      return await this.optimizeForBudget(recommendations, constraints);
    }

    // Optimize for cost efficiency
    const optimizedRecommendations = await this.optimizeForEfficiency(
      recommendations,
      constraints,
    );

    // Apply wedding-day considerations
    const finalRecommendations = await this.applyWeddingDayOptimizations(
      optimizedRecommendations,
    );

    console.log(
      `[CostOptimizer] Optimization complete: ${finalRecommendations.length} recommendations`,
    );
    return finalRecommendations;
  }

  private async optimizeForBudget(
    recommendations: ScalingRecommendation[],
    constraints: CostConstraints,
  ): Promise<ScalingRecommendation[]> {
    // Sort recommendations by cost-benefit ratio
    const costBenefitSorted = recommendations
      .map((rec) => ({
        ...rec,
        costBenefitRatio:
          rec.estimatedBenefit / Math.max(rec.estimatedCost, 0.01),
      }))
      .sort((a, b) => b.costBenefitRatio - a.costBenefitRatio);

    const optimized: ScalingRecommendation[] = [];
    let remainingBudget = constraints.maxScaleUpCost;

    for (const recommendation of costBenefitSorted) {
      if (recommendation.estimatedCost <= remainingBudget) {
        // Can afford this recommendation
        optimized.push(recommendation);
        remainingBudget -= recommendation.estimatedCost;
      } else if (recommendation.weddingContext?.isWeddingRelated) {
        // Wedding-related: try to find budget by reducing other recommendations
        const reducedCost = await this.findBudgetForWeddingRecommendation(
          recommendation,
          optimized,
          remainingBudget,
        );

        if (reducedCost) {
          optimized.push({
            ...recommendation,
            estimatedCost: reducedCost.cost,
            targetInstances: reducedCost.instances,
          });
          remainingBudget -= reducedCost.cost;
        }
      } else {
        // Try to reduce the scale of this recommendation
        const reducedRecommendation = await this.reduceRecommendationScale(
          recommendation,
          remainingBudget,
        );

        if (reducedRecommendation) {
          optimized.push(reducedRecommendation);
          remainingBudget -= reducedRecommendation.estimatedCost;
        }
      }
    }

    return optimized;
  }

  private async findBudgetForWeddingRecommendation(
    weddingRec: ScalingRecommendation,
    existingRecs: ScalingRecommendation[],
    availableBudget: number,
  ): Promise<{ cost: number; instances: number } | null> {
    const neededBudget = weddingRec.estimatedCost - availableBudget;

    if (neededBudget <= 0) {
      return {
        cost: weddingRec.estimatedCost,
        instances: weddingRec.targetInstances,
      };
    }

    // Try to reduce non-wedding recommendations to free up budget
    let freedBudget = 0;

    for (const existingRec of existingRecs) {
      if (!existingRec.weddingContext?.isWeddingRelated) {
        const savings = await this.calculatePossibleSavings(existingRec);
        freedBudget += savings;

        if (freedBudget >= neededBudget) {
          // We can free up enough budget
          return {
            cost: weddingRec.estimatedCost,
            instances: weddingRec.targetInstances,
          };
        }
      }
    }

    // If we can't free up enough budget, scale down the wedding recommendation
    const affordableInstances = this.calculateAffordableInstances(
      weddingRec.service,
      availableBudget + freedBudget,
      weddingRec.currentInstances,
    );

    if (affordableInstances > weddingRec.currentInstances) {
      return {
        cost: availableBudget + freedBudget,
        instances: affordableInstances,
      };
    }

    return null;
  }

  private async calculatePossibleSavings(
    recommendation: ScalingRecommendation,
  ): Promise<number> {
    // Calculate how much we could save by reducing this recommendation by 50%
    const instanceReduction = Math.floor(
      (recommendation.targetInstances - recommendation.currentInstances) * 0.5,
    );
    const hourlyRate = this.hourlyRates.get(recommendation.service) || 0.25;

    return instanceReduction * hourlyRate;
  }

  private calculateAffordableInstances(
    service: string,
    budget: number,
    currentInstances: number,
  ): number {
    const hourlyRate = this.hourlyRates.get(service) || 0.25;
    const affordableNewInstances = Math.floor(budget / hourlyRate);

    return currentInstances + affordableNewInstances;
  }

  private async reduceRecommendationScale(
    recommendation: ScalingRecommendation,
    availableBudget: number,
  ): Promise<ScalingRecommendation | null> {
    const hourlyRate = this.hourlyRates.get(recommendation.service) || 0.25;
    const affordableNewInstances = Math.floor(availableBudget / hourlyRate);
    const affordableTargetInstances =
      recommendation.currentInstances + affordableNewInstances;

    if (affordableTargetInstances <= recommendation.currentInstances) {
      return null; // Can't scale up at all
    }

    // Calculate reduced benefit
    const scalingRatio =
      (affordableTargetInstances - recommendation.currentInstances) /
      (recommendation.targetInstances - recommendation.currentInstances);
    const reducedBenefit = recommendation.estimatedBenefit * scalingRatio;

    return {
      ...recommendation,
      targetInstances: affordableTargetInstances,
      estimatedCost: availableBudget,
      estimatedBenefit: reducedBenefit,
      confidence: recommendation.confidence * 0.9, // Slightly lower confidence for reduced scaling
      reason: `${recommendation.reason}_cost_optimized`,
    };
  }

  private async optimizeForEfficiency(
    recommendations: ScalingRecommendation[],
    constraints: CostConstraints,
  ): Promise<ScalingRecommendation[]> {
    const optimized: ScalingRecommendation[] = [];

    for (const recommendation of recommendations) {
      const efficiency = this.calculateCostEfficiency(recommendation);

      if (efficiency >= constraints.costEfficiencyRequirement) {
        optimized.push(recommendation);
      } else if (recommendation.weddingContext?.isWeddingRelated) {
        // Wedding recommendations get a pass on efficiency requirements
        optimized.push({
          ...recommendation,
          reason: `${recommendation.reason}_wedding_priority`,
        });
      } else {
        // Try to improve efficiency by adjusting the recommendation
        const improvedRec = await this.improveEfficiency(
          recommendation,
          constraints,
        );
        if (improvedRec) {
          optimized.push(improvedRec);
        }
      }
    }

    return optimized;
  }

  private calculateCostEfficiency(
    recommendation: ScalingRecommendation,
  ): number {
    if (recommendation.estimatedCost <= 0) return 1.0;

    // Efficiency = benefit per dollar spent
    return recommendation.estimatedBenefit / recommendation.estimatedCost;
  }

  private async improveEfficiency(
    recommendation: ScalingRecommendation,
    constraints: CostConstraints,
  ): Promise<ScalingRecommendation | null> {
    // Try to find a more efficient scaling approach
    const currentEfficiency = this.calculateCostEfficiency(recommendation);
    const requiredEfficiency = constraints.costEfficiencyRequirement;

    if (currentEfficiency >= requiredEfficiency) return recommendation;

    // Try scaling to a smaller target that meets efficiency requirements
    const efficiencyRatio = requiredEfficiency / currentEfficiency;
    const adjustedBenefit = recommendation.estimatedBenefit / efficiencyRatio;

    // Find the instance count that would achieve this benefit
    const instanceDiff =
      recommendation.targetInstances - recommendation.currentInstances;
    const adjustedInstanceDiff = Math.ceil(
      instanceDiff * (adjustedBenefit / recommendation.estimatedBenefit),
    );
    const adjustedTarget =
      recommendation.currentInstances + adjustedInstanceDiff;

    if (adjustedTarget <= recommendation.currentInstances) {
      return null; // No viable adjustment
    }

    const hourlyRate = this.hourlyRates.get(recommendation.service) || 0.25;
    const adjustedCost = adjustedInstanceDiff * hourlyRate;

    return {
      ...recommendation,
      targetInstances: adjustedTarget,
      estimatedCost: adjustedCost,
      estimatedBenefit: adjustedBenefit,
      reason: `${recommendation.reason}_efficiency_optimized`,
      confidence: recommendation.confidence * 0.85,
    };
  }

  private async applyWeddingDayOptimizations(
    recommendations: ScalingRecommendation[],
  ): Promise<ScalingRecommendation[]> {
    const isWeddingDay = await this.isCurrentlyWeddingDay();
    const isWeddingSeason = await this.isCurrentlyWeddingSeason();

    if (!isWeddingDay && !isWeddingSeason) {
      return recommendations; // No wedding optimizations needed
    }

    const optimized: ScalingRecommendation[] = [];

    for (const recommendation of recommendations) {
      if (recommendation.weddingContext?.isWeddingRelated) {
        // Apply wedding day budget multiplier
        const weddingOptimized = {
          ...recommendation,
          estimatedCost:
            recommendation.estimatedCost * (isWeddingDay ? 1.0 : 0.9), // Slight discount for wedding season
          urgency: isWeddingDay ? 'critical' : ('high' as any),
          confidence: Math.min(recommendation.confidence * 1.1, 0.95), // Higher confidence for wedding recommendations
          reason: `${recommendation.reason}_wedding_optimized`,
        };
        optimized.push(weddingOptimized);
      } else if (isWeddingDay) {
        // Non-wedding recommendations on wedding days: be more conservative
        const conservativeRec =
          await this.makeRecommendationConservative(recommendation);
        if (conservativeRec) {
          optimized.push(conservativeRec);
        }
      } else {
        optimized.push(recommendation);
      }
    }

    return optimized;
  }

  private async makeRecommendationConservative(
    recommendation: ScalingRecommendation,
  ): Promise<ScalingRecommendation | null> {
    // On wedding days, be more conservative with non-wedding scaling
    const conservativeTarget = Math.ceil(
      recommendation.currentInstances +
        (recommendation.targetInstances - recommendation.currentInstances) *
          0.7, // 70% of original scaling
    );

    if (conservativeTarget <= recommendation.currentInstances) {
      return null;
    }

    const instanceDiff = conservativeTarget - recommendation.currentInstances;
    const originalInstanceDiff =
      recommendation.targetInstances - recommendation.currentInstances;
    const scalingRatio = instanceDiff / originalInstanceDiff;

    const hourlyRate = this.hourlyRates.get(recommendation.service) || 0.25;

    return {
      ...recommendation,
      targetInstances: conservativeTarget,
      estimatedCost: instanceDiff * hourlyRate,
      estimatedBenefit: recommendation.estimatedBenefit * scalingRatio,
      urgency: 'low' as any,
      reason: `${recommendation.reason}_wedding_day_conservative`,
    };
  }

  async estimateScalingCost(
    service: string,
    instanceChange: number,
    duration: number = 1, // hours
  ): Promise<number> {
    const hourlyRate = this.hourlyRates.get(service) || 0.25;
    return Math.abs(instanceChange) * hourlyRate * duration;
  }

  async estimateMonthlyServiceCost(
    service: string,
    instances: number,
  ): Promise<number> {
    const hourlyRate = this.hourlyRates.get(service) || 0.25;
    return instances * hourlyRate * 24 * 30; // 30 days
  }

  async getCurrentMonthlyCost(): Promise<number> {
    return this.currentMonthlyCost;
  }

  async getRemainingMonthlyBudget(): Promise<number> {
    return Math.max(0, this.config.maxMonthlyBudget - this.currentMonthlyCost);
  }

  async getCostEfficiencyReport(
    recommendations: ScalingRecommendation[],
  ): Promise<{
    totalCost: number;
    totalBenefit: number;
    overallEfficiency: number;
    mostEfficient: ScalingRecommendation | null;
    leastEfficient: ScalingRecommendation | null;
    weddingRelatedCosts: number;
  }> {
    if (recommendations.length === 0) {
      return {
        totalCost: 0,
        totalBenefit: 0,
        overallEfficiency: 0,
        mostEfficient: null,
        leastEfficient: null,
        weddingRelatedCosts: 0,
      };
    }

    const totalCost = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedCost,
      0,
    );
    const totalBenefit = recommendations.reduce(
      (sum, rec) => sum + rec.estimatedBenefit,
      0,
    );
    const overallEfficiency = totalCost > 0 ? totalBenefit / totalCost : 0;

    const efficiencyRanked = recommendations
      .map((rec) => ({ ...rec, efficiency: this.calculateCostEfficiency(rec) }))
      .sort((a, b) => b.efficiency - a.efficiency);

    const weddingRelatedCosts = recommendations
      .filter((rec) => rec.weddingContext?.isWeddingRelated)
      .reduce((sum, rec) => sum + rec.estimatedCost, 0);

    return {
      totalCost,
      totalBenefit,
      overallEfficiency,
      mostEfficient: efficiencyRanked.length > 0 ? efficiencyRanked[0] : null,
      leastEfficient:
        efficiencyRanked.length > 0
          ? efficiencyRanked[efficiencyRanked.length - 1]
          : null,
      weddingRelatedCosts,
    };
  }

  async updateMonthlyCost(additionalCost: number): Promise<void> {
    this.currentMonthlyCost += additionalCost;
    console.log(
      `[CostOptimizer] Monthly cost updated: $${this.currentMonthlyCost.toFixed(2)}`,
    );
  }

  async resetMonthlyCost(): Promise<void> {
    this.currentMonthlyCost = 0;
    console.log('[CostOptimizer] Monthly cost reset');
  }

  async isWithinBudget(cost: number): Promise<boolean> {
    return this.currentMonthlyCost + cost <= this.config.maxMonthlyBudget;
  }

  async getServiceHourlyRate(service: string): Promise<number> {
    return this.hourlyRates.get(service) || 0.25;
  }

  async updateServiceHourlyRate(service: string, rate: number): Promise<void> {
    this.hourlyRates.set(service, rate);
    console.log(
      `[CostOptimizer] Updated hourly rate for ${service}: $${rate.toFixed(2)}`,
    );
  }

  async getCostForecast(days: number): Promise<{
    projectedCost: number;
    budgetUtilization: number;
    warningThreshold: boolean;
    criticalThreshold: boolean;
  }> {
    const dailyRate = this.currentMonthlyCost / 30; // Rough daily rate
    const projectedCost = dailyRate * days;
    const budgetUtilization = projectedCost / this.config.maxMonthlyBudget;

    return {
      projectedCost,
      budgetUtilization,
      warningThreshold: budgetUtilization > 0.8, // 80% of budget
      criticalThreshold: budgetUtilization > 0.95, // 95% of budget
    };
  }

  async optimizeForEmergency(
    recommendations: ScalingRecommendation[],
  ): Promise<ScalingRecommendation[]> {
    console.log('[CostOptimizer] Applying emergency cost optimizations');

    // In emergency situations, prioritize critical and wedding-related scaling
    return recommendations
      .filter(
        (rec) =>
          rec.urgency === 'critical' ||
          rec.urgency === 'emergency' ||
          rec.weddingContext?.isWeddingRelated,
      )
      .map((rec) => ({
        ...rec,
        estimatedCost: rec.estimatedCost * 1.5, // Emergency scaling costs more but is necessary
        reason: `${rec.reason}_emergency_override`,
      }));
  }

  private async isCurrentlyWeddingDay(): Promise<boolean> {
    const dayOfWeek = new Date().getDay();
    return dayOfWeek === 6 || (dayOfWeek === 0 && Math.random() < 0.3); // Saturday or sometimes Sunday
  }

  private async isCurrentlyWeddingSeason(): Promise<boolean> {
    const month = new Date().getMonth();
    return month >= 4 && month <= 9; // May to October
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const remainingBudget = await this.getRemainingMonthlyBudget();
    const budgetUtilization =
      this.currentMonthlyCost / this.config.maxMonthlyBudget;

    const details = {
      currentMonthlyCost: this.currentMonthlyCost,
      remainingBudget,
      budgetUtilization,
      config: this.config,
      serviceRates: Object.fromEntries(this.hourlyRates),
    };

    if (budgetUtilization < 0.8) {
      return { status: 'healthy', details };
    } else if (budgetUtilization < 0.95) {
      return { status: 'degraded', details };
    } else {
      return { status: 'unhealthy', details };
    }
  }
}
