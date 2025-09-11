import {
  WeddingBudget,
  BudgetAllocation,
  BudgetPriority,
  BudgetConstraint,
  BudgetOptimization,
  BudgetRecommendation,
  SavingsBreakdown,
  BudgetAIConfig,
  OptimizationError,
} from './types';

interface BudgetOptimizationRequest {
  totalBudget: number;
  currentAllocations: BudgetAllocation[];
  priorities: BudgetPriority[];
  constraints: BudgetConstraint[];
  weddingType: string;
  guestCount?: number;
  location?: string;
  seasonality?: string;
  savingsTarget?: number;
}

interface BudgetCategory {
  name: string;
  typicalPercentage: number;
  minPercentage: number;
  maxPercentage: number;
  scalingFactor: number; // How much it scales with guest count
  seasonalImpact: number; // 0-1, how much season affects this category
  qualityImpact: number; // How much reduction affects overall quality
}

export class BudgetOptimizationAI {
  private config: BudgetAIConfig;
  private budgetCategories: Map<string, BudgetCategory>;
  private industryBenchmarks: Map<string, any>;

  constructor(config: BudgetAIConfig) {
    this.config = config;
    this.budgetCategories = this.initializeBudgetCategories();
    this.industryBenchmarks = this.loadIndustryBenchmarks();
  }

  async optimizeBudget(
    request: BudgetOptimizationRequest,
  ): Promise<BudgetOptimization> {
    try {
      // Validate the budget request
      this.validateBudgetRequest(request);

      // Analyze current budget allocation
      const currentAnalysis = this.analyzeBudgetAllocation(request);

      // Generate optimization recommendations
      const optimizations = await this.generateOptimizations(
        request,
        currentAnalysis,
      );

      // Apply optimizations while maintaining quality threshold
      const optimizedAllocations = this.applyOptimizations(
        request.currentAllocations,
        optimizations,
        request.constraints,
      );

      // Calculate total savings and quality impact
      const savingsBreakdown = this.calculateSavingsBreakdown(
        request.currentAllocations,
        optimizedAllocations,
      );

      // Assess risk factors
      const riskFactors = this.assessOptimizationRisks(
        request,
        optimizedAllocations,
        savingsBreakdown,
      );

      // Generate actionable recommendations
      const recommendations = this.generateBudgetRecommendations(
        request,
        optimizations,
        riskFactors,
      );

      const totalSavings = savingsBreakdown.reduce(
        (sum, item) => sum + item.savings,
        0,
      );
      const qualityMaintained = this.assessQualityMaintained(savingsBreakdown);

      return {
        totalSavings,
        optimizedAllocations,
        qualityMaintained,
        savingsBreakdown,
        riskFactors: riskFactors.map((risk) => risk.description),
        confidence: this.calculateOptimizationConfidence(
          request,
          optimizations,
        ),
        recommendations,
      };
    } catch (error) {
      console.error('Budget optimization failed:', error);
      throw new OptimizationError(
        `Budget optimization failed: ${error.message}`,
      );
    }
  }

  private initializeBudgetCategories(): Map<string, BudgetCategory> {
    const categories = new Map<string, BudgetCategory>();

    categories.set('venue', {
      name: 'Venue',
      typicalPercentage: 0.3,
      minPercentage: 0.2,
      maxPercentage: 0.45,
      scalingFactor: 0.8, // Venue costs don't scale linearly with guests
      seasonalImpact: 0.7,
      qualityImpact: 0.9, // High impact on overall quality
    });

    categories.set('catering', {
      name: 'Catering',
      typicalPercentage: 0.25,
      minPercentage: 0.15,
      maxPercentage: 0.35,
      scalingFactor: 1.0, // Linear scaling with guests
      seasonalImpact: 0.3,
      qualityImpact: 0.8,
    });

    categories.set('photography', {
      name: 'Photography',
      typicalPercentage: 0.12,
      minPercentage: 0.08,
      maxPercentage: 0.2,
      scalingFactor: 0.2, // Fixed cost mostly
      seasonalImpact: 0.5,
      qualityImpact: 0.9,
    });

    categories.set('flowers', {
      name: 'Flowers & Decorations',
      typicalPercentage: 0.08,
      minPercentage: 0.04,
      maxPercentage: 0.15,
      scalingFactor: 0.6,
      seasonalImpact: 0.9, // High seasonal impact
      qualityImpact: 0.6,
    });

    categories.set('music', {
      name: 'Music & Entertainment',
      typicalPercentage: 0.08,
      minPercentage: 0.05,
      maxPercentage: 0.15,
      scalingFactor: 0.3,
      seasonalImpact: 0.4,
      qualityImpact: 0.7,
    });

    categories.set('transport', {
      name: 'Transportation',
      typicalPercentage: 0.04,
      minPercentage: 0.02,
      maxPercentage: 0.08,
      scalingFactor: 0.4,
      seasonalImpact: 0.3,
      qualityImpact: 0.5,
    });

    categories.set('attire', {
      name: 'Wedding Attire',
      typicalPercentage: 0.06,
      minPercentage: 0.04,
      maxPercentage: 0.12,
      scalingFactor: 0.0, // Fixed per couple
      seasonalImpact: 0.2,
      qualityImpact: 0.8,
    });

    categories.set('miscellaneous', {
      name: 'Miscellaneous',
      typicalPercentage: 0.07,
      minPercentage: 0.05,
      maxPercentage: 0.15,
      scalingFactor: 0.5,
      seasonalImpact: 0.3,
      qualityImpact: 0.4,
    });

    return categories;
  }

  private loadIndustryBenchmarks(): Map<string, any> {
    const benchmarks = new Map();

    // Average wedding costs by region (UK)
    benchmarks.set('london', { multiplier: 1.4, avgBudget: 35000 });
    benchmarks.set('southeast', { multiplier: 1.2, avgBudget: 28000 });
    benchmarks.set('southwest', { multiplier: 1.1, avgBudget: 25000 });
    benchmarks.set('midlands', { multiplier: 1.0, avgBudget: 22000 });
    benchmarks.set('north', { multiplier: 0.9, avgBudget: 20000 });
    benchmarks.set('scotland', { multiplier: 0.95, avgBudget: 21000 });
    benchmarks.set('wales', { multiplier: 0.9, avgBudget: 19000 });

    // Seasonal pricing factors
    benchmarks.set('seasonality', {
      spring: { venues: 1.1, flowers: 0.9, catering: 1.0 },
      summer: { venues: 1.3, flowers: 1.0, catering: 1.1 },
      autumn: { venues: 1.1, flowers: 1.2, catering: 1.0 },
      winter: { venues: 0.8, flowers: 1.3, catering: 0.9 },
    });

    // Guest count scaling factors
    benchmarks.set('guestScaling', {
      50: 0.7, // Small weddings have higher per-person costs
      75: 0.85,
      100: 1.0, // Sweet spot
      150: 1.2,
      200: 1.4,
      300: 1.8,
    });

    return benchmarks;
  }

  private validateBudgetRequest(request: BudgetOptimizationRequest): void {
    if (request.totalBudget <= 0) {
      throw new OptimizationError('Total budget must be positive');
    }

    if (request.currentAllocations.length === 0) {
      throw new OptimizationError('Current allocations cannot be empty');
    }

    const totalAllocated = request.currentAllocations.reduce(
      (sum, allocation) => sum + allocation.allocated,
      0,
    );

    if (totalAllocated > request.totalBudget * 1.1) {
      // 10% tolerance
      throw new OptimizationError(
        'Total allocations exceed budget by more than 10%',
      );
    }
  }

  private analyzeBudgetAllocation(request: BudgetOptimizationRequest): any {
    const analysis = {
      totalAllocated: 0,
      unallocated: 0,
      inefficiencies: [] as string[],
      opportunities: [] as string[],
      riskAreas: [] as string[],
      benchmarkComparison: {} as any,
    };

    analysis.totalAllocated = request.currentAllocations.reduce(
      (sum, allocation) => sum + allocation.allocated,
      0,
    );
    analysis.unallocated = request.totalBudget - analysis.totalAllocated;

    // Compare against industry benchmarks
    request.currentAllocations.forEach((allocation) => {
      const category = this.budgetCategories.get(
        allocation.category.toLowerCase(),
      );
      if (category) {
        const currentPercentage = allocation.allocated / request.totalBudget;
        const benchmarkPercentage = category.typicalPercentage;

        analysis.benchmarkComparison[allocation.category] = {
          current: currentPercentage,
          benchmark: benchmarkPercentage,
          deviation: currentPercentage - benchmarkPercentage,
        };

        // Identify inefficiencies
        if (currentPercentage > category.maxPercentage) {
          analysis.inefficiencies.push(
            `${allocation.category} allocation (${(currentPercentage * 100).toFixed(1)}%) exceeds recommended maximum (${(category.maxPercentage * 100).toFixed(1)}%)`,
          );
        }

        // Identify opportunities
        if (currentPercentage < category.minPercentage && allocation.flexible) {
          analysis.opportunities.push(
            `${allocation.category} could be optimized - currently below typical allocation`,
          );
        }

        // Identify risk areas
        if (
          currentPercentage < category.minPercentage &&
          category.qualityImpact > 0.8
        ) {
          analysis.riskAreas.push(
            `${allocation.category} allocation may be too low for maintaining quality`,
          );
        }
      }
    });

    return analysis;
  }

  private async generateOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): Promise<any[]> {
    const optimizations = [];

    // 1. Seasonal optimization
    if (request.seasonality) {
      const seasonalOptimizations = this.generateSeasonalOptimizations(
        request,
        analysis,
      );
      optimizations.push(...seasonalOptimizations);
    }

    // 2. Guest count optimization
    if (request.guestCount) {
      const guestCountOptimizations = this.generateGuestCountOptimizations(
        request,
        analysis,
      );
      optimizations.push(...guestCountOptimizations);
    }

    // 3. Vendor negotiation opportunities
    const negotiationOptimizations = this.generateNegotiationOptimizations(
      request,
      analysis,
    );
    optimizations.push(...negotiationOptimizations);

    // 4. Alternative approach optimizations
    const alternativeOptimizations = this.generateAlternativeOptimizations(
      request,
      analysis,
    );
    optimizations.push(...alternativeOptimizations);

    // 5. Timing-based optimizations
    const timingOptimizations = this.generateTimingOptimizations(
      request,
      analysis,
    );
    optimizations.push(...timingOptimizations);

    // Sort by potential impact and feasibility
    optimizations.sort(
      (a, b) =>
        b.potentialSavings * b.feasibility - a.potentialSavings * a.feasibility,
    );

    return optimizations;
  }

  private generateSeasonalOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): any[] {
    const optimizations = [];
    const seasonalFactors = this.industryBenchmarks.get('seasonality');

    if (!seasonalFactors || !request.seasonality) return optimizations;

    const season = this.getSeason(request.seasonality);
    const factors = seasonalFactors[season];

    if (!factors) return optimizations;

    Object.entries(factors).forEach(([category, factor]) => {
      const allocation = request.currentAllocations.find(
        (a) => a.category.toLowerCase() === category,
      );

      if (allocation && allocation.flexible && factor < 1.0) {
        const potentialSavings =
          allocation.allocated * ((1 - factor) as number);

        optimizations.push({
          type: 'seasonal',
          category,
          description: `Take advantage of ${season} pricing for ${category}`,
          potentialSavings,
          qualityImpact: -0.05, // Minimal quality impact
          feasibility: 0.9,
          implementation: `Book ${category} during off-peak ${season} period`,
          timeConstraint: 'Must book in advance',
          riskLevel: 'low',
        });
      }
    });

    return optimizations;
  }

  private generateGuestCountOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): any[] {
    const optimizations = [];

    if (!request.guestCount) return optimizations;

    // Identify categories that scale with guest count
    const scalableCategories = ['catering', 'venue', 'flowers'];

    scalableCategories.forEach((category) => {
      const allocation = request.currentAllocations.find(
        (a) => a.category.toLowerCase() === category,
      );

      if (allocation && allocation.flexible) {
        const categoryData = this.budgetCategories.get(category);
        if (categoryData && categoryData.scalingFactor > 0.5) {
          // Check if guest count could be optimized
          const perGuestCost = allocation.allocated / request.guestCount;
          const industryAverage = this.getIndustryAveragePerGuest(category);

          if (perGuestCost > industryAverage * 1.2) {
            const potentialSavings =
              allocation.allocated - industryAverage * request.guestCount;

            optimizations.push({
              type: 'guest_optimization',
              category,
              description: `Optimize ${category} cost per guest`,
              potentialSavings: Math.max(potentialSavings, 0),
              qualityImpact: -0.1,
              feasibility: 0.8,
              implementation: `Negotiate better per-guest pricing for ${category}`,
              timeConstraint: 'Requires vendor negotiation',
              riskLevel: 'medium',
            });
          }
        }
      }
    });

    // Guest list optimization
    if (request.guestCount > 120) {
      const guestReductionSavings = this.calculateGuestReductionSavings(
        request.guestCount,
        request.currentAllocations,
      );

      if (guestReductionSavings > 1000) {
        optimizations.push({
          type: 'guest_reduction',
          category: 'overall',
          description: 'Consider reducing guest count for significant savings',
          potentialSavings: guestReductionSavings,
          qualityImpact: 0.2, // Positive - more intimate wedding
          feasibility: 0.6, // Emotionally difficult
          implementation: 'Reduce guest list by 10-15%',
          timeConstraint: 'Must be done before RSVPs',
          riskLevel: 'high', // Emotionally challenging
        });
      }
    }

    return optimizations;
  }

  private generateNegotiationOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): any[] {
    const optimizations = [];

    // Identify high-value categories for negotiation
    const highValueCategories = request.currentAllocations
      .filter((a) => a.allocated > request.totalBudget * 0.15) // >15% of budget
      .filter((a) => a.flexible);

    highValueCategories.forEach((allocation) => {
      const category = this.budgetCategories.get(
        allocation.category.toLowerCase(),
      );

      if (category) {
        const negotiationPotential = this.calculateNegotiationPotential(
          allocation,
          category,
        );

        if (negotiationPotential.savings > 500) {
          optimizations.push({
            type: 'negotiation',
            category: allocation.category,
            description: `Negotiate better terms for ${allocation.category}`,
            potentialSavings: negotiationPotential.savings,
            qualityImpact: negotiationPotential.qualityImpact,
            feasibility: negotiationPotential.feasibility,
            implementation: negotiationPotential.strategy,
            timeConstraint: 'Allow 2-4 weeks for negotiations',
            riskLevel: 'low',
          });
        }
      }
    });

    return optimizations;
  }

  private generateAlternativeOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): any[] {
    const optimizations = [];

    // DIY alternatives for suitable categories
    const diyCategories = ['flowers', 'decorations', 'favors', 'invitations'];

    diyCategories.forEach((category) => {
      const allocation = request.currentAllocations.find((a) =>
        a.category.toLowerCase().includes(category),
      );

      if (allocation && allocation.flexible && allocation.allocated > 1000) {
        optimizations.push({
          type: 'diy_alternative',
          category: allocation.category,
          description: `DIY approach for ${allocation.category}`,
          potentialSavings: allocation.allocated * 0.4, // 40% savings
          qualityImpact: -0.2, // Some quality trade-off
          feasibility: 0.7,
          implementation: `Create ${category} in-house with family/friends help`,
          timeConstraint: 'Requires 2-3 months advance planning',
          riskLevel: 'medium',
        });
      }
    });

    // Package deal alternatives
    const packageOpportunities = this.identifyPackageOpportunities(
      request.currentAllocations,
    );
    packageOpportunities.forEach((opportunity) => {
      optimizations.push({
        type: 'package_deal',
        category: opportunity.categories.join(' + '),
        description: `Bundle ${opportunity.categories.join(' and ')} for savings`,
        potentialSavings: opportunity.savings,
        qualityImpact: 0.1, // Often better coordination
        feasibility: opportunity.feasibility,
        implementation: opportunity.implementation,
        timeConstraint: 'Must coordinate vendor selection',
        riskLevel: 'low',
      });
    });

    return optimizations;
  }

  private generateTimingOptimizations(
    request: BudgetOptimizationRequest,
    analysis: any,
  ): any[] {
    const optimizations = [];

    // Early booking discounts
    request.currentAllocations.forEach((allocation) => {
      if (allocation.flexible && allocation.allocated > 2000) {
        const earlyBookingDiscount = allocation.allocated * 0.1; // 10% early booking discount

        optimizations.push({
          type: 'early_booking',
          category: allocation.category,
          description: `Early booking discount for ${allocation.category}`,
          potentialSavings: earlyBookingDiscount,
          qualityImpact: 0.05, // Better vendor selection
          feasibility: 0.9,
          implementation: `Book ${allocation.category} 6+ months in advance`,
          timeConstraint: 'Must book early',
          riskLevel: 'low',
        });
      }
    });

    // Off-peak timing
    if (request.seasonality && this.isPeakSeason(request.seasonality)) {
      const offPeakSavings = this.calculateOffPeakSavings(
        request.currentAllocations,
      );

      if (offPeakSavings > 2000) {
        optimizations.push({
          type: 'off_peak_timing',
          category: 'overall',
          description: 'Move wedding to off-peak period',
          potentialSavings: offPeakSavings,
          qualityImpact: 0.0,
          feasibility: 0.4, // Often not flexible
          implementation: 'Schedule wedding during off-peak season',
          timeConstraint: 'Must change wedding date',
          riskLevel: 'high',
        });
      }
    }

    return optimizations;
  }

  private applyOptimizations(
    currentAllocations: BudgetAllocation[],
    optimizations: any[],
    constraints: BudgetConstraint[],
  ): BudgetAllocation[] {
    const optimizedAllocations = [...currentAllocations];

    // Apply optimizations in order of impact and feasibility
    const viableOptimizations = optimizations.filter(
      (opt) => opt.feasibility > 0.6 && opt.potentialSavings > 100,
    );

    viableOptimizations.forEach((optimization) => {
      const allocationIndex = optimizedAllocations.findIndex(
        (a) =>
          a.category.toLowerCase() === optimization.category.toLowerCase() ||
          optimization.category
            .toLowerCase()
            .includes(a.category.toLowerCase()),
      );

      if (allocationIndex !== -1) {
        const allocation = optimizedAllocations[allocationIndex];

        // Check constraints
        const constraint = constraints.find(
          (c) => c.category === allocation.category,
        );
        const minAmount =
          constraint?.type === 'minimum' ? constraint.amount : 0;

        const newAmount = Math.max(
          allocation.allocated -
            optimization.potentialSavings * optimization.feasibility,
          minAmount,
        );

        optimizedAllocations[allocationIndex] = {
          ...allocation,
          allocated: newAmount,
          notes: `${allocation.notes || ''} Optimized: ${optimization.description}`,
        };
      }
    });

    return optimizedAllocations;
  }

  private calculateSavingsBreakdown(
    original: BudgetAllocation[],
    optimized: BudgetAllocation[],
  ): SavingsBreakdown[] {
    const breakdown: SavingsBreakdown[] = [];

    original.forEach((originalAllocation) => {
      const optimizedAllocation = optimized.find(
        (o) => o.category === originalAllocation.category,
      );

      if (optimizedAllocation) {
        const savings =
          originalAllocation.allocated - optimizedAllocation.allocated;
        const savingsPercentage = savings / originalAllocation.allocated;

        if (savings > 0) {
          breakdown.push({
            category: originalAllocation.category,
            originalAmount: originalAllocation.allocated,
            optimizedAmount: optimizedAllocation.allocated,
            savings,
            savingsPercentage,
            qualityImpact: this.calculateCategoryQualityImpact(
              originalAllocation.category,
              savingsPercentage,
            ),
            reasoning:
              optimizedAllocation.notes || 'Budget optimization applied',
          });
        }
      }
    });

    return breakdown;
  }

  private assessOptimizationRisks(
    request: BudgetOptimizationRequest,
    optimizedAllocations: BudgetAllocation[],
    savingsBreakdown: SavingsBreakdown[],
  ): any[] {
    const risks = [];

    // Quality impact risk
    const highQualityImpactItems = savingsBreakdown.filter(
      (item) => item.qualityImpact < -0.3,
    );

    if (highQualityImpactItems.length > 0) {
      risks.push({
        type: 'quality_impact',
        severity: 'medium',
        description: `Significant quality impact in: ${highQualityImpactItems.map((i) => i.category).join(', ')}`,
        mitigation:
          'Consider reducing savings in these categories or finding alternative vendors',
      });
    }

    // Under-allocation risk
    optimizedAllocations.forEach((allocation) => {
      const category = this.budgetCategories.get(
        allocation.category.toLowerCase(),
      );
      if (category) {
        const percentage = allocation.allocated / request.totalBudget;
        if (percentage < category.minPercentage) {
          risks.push({
            type: 'under_allocation',
            severity: 'high',
            description: `${allocation.category} may be under-allocated at ${(percentage * 100).toFixed(1)}%`,
            mitigation: `Consider allocating at least ${(category.minPercentage * 100).toFixed(1)}% to ${allocation.category}`,
          });
        }
      }
    });

    // Timeline risk
    const timeConstrainedOptimizations = savingsBreakdown.filter(
      (item) =>
        item.reasoning.includes('early booking') ||
        item.reasoning.includes('timing'),
    );

    if (timeConstrainedOptimizations.length > 0) {
      risks.push({
        type: 'timeline_risk',
        severity: 'medium',
        description: 'Some optimizations require specific timing',
        mitigation:
          'Ensure adequate time for early booking and vendor negotiations',
      });
    }

    return risks;
  }

  private generateBudgetRecommendations(
    request: BudgetOptimizationRequest,
    optimizations: any[],
    risks: any[],
  ): BudgetRecommendation[] {
    const recommendations: BudgetRecommendation[] = [];

    // Priority-based recommendations
    const highImpactOptimizations = optimizations
      .filter((opt) => opt.potentialSavings > 1000)
      .slice(0, 5);

    highImpactOptimizations.forEach((opt, index) => {
      recommendations.push({
        category: opt.category,
        action: this.determineRecommendationAction(opt),
        amount: opt.potentialSavings,
        reasoning: opt.description,
        priority: index + 1,
        implementation: opt.implementation,
      });
    });

    // Risk mitigation recommendations
    risks.forEach((risk, index) => {
      if (risk.severity === 'high') {
        recommendations.push({
          category: this.extractCategoryFromRisk(risk),
          action: 'increase',
          amount: this.calculateRiskMitigationAmount(risk, request),
          reasoning: risk.mitigation,
          priority: recommendations.length + 1,
          implementation: risk.mitigation,
        });
      }
    });

    return recommendations;
  }

  // Helper methods

  private getSeason(seasonality: string): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private getIndustryAveragePerGuest(category: string): number {
    const averages: { [key: string]: number } = {
      catering: 85, // £85 per guest
      venue: 120, // £120 per guest
      flowers: 15, // £15 per guest
    };
    return averages[category] || 50;
  }

  private calculateGuestReductionSavings(
    guestCount: number,
    allocations: BudgetAllocation[],
  ): number {
    const reductionPercentage = 0.125; // 12.5% reduction
    const scalableCategories = ['catering', 'venue', 'flowers'];

    let savings = 0;
    scalableCategories.forEach((category) => {
      const allocation = allocations.find(
        (a) => a.category.toLowerCase() === category,
      );
      if (allocation) {
        const categoryData = this.budgetCategories.get(category);
        const scalingFactor = categoryData?.scalingFactor || 1.0;
        savings += allocation.allocated * reductionPercentage * scalingFactor;
      }
    });

    return savings;
  }

  private calculateNegotiationPotential(
    allocation: BudgetAllocation,
    category: BudgetCategory,
  ): any {
    return {
      savings: allocation.allocated * 0.15, // 15% negotiation savings
      qualityImpact: -0.05,
      feasibility: allocation.flexible ? 0.8 : 0.3,
      strategy: `Negotiate package deal and payment terms for ${allocation.category}`,
    };
  }

  private identifyPackageOpportunities(allocations: BudgetAllocation[]): any[] {
    const opportunities = [];

    // Venue + Catering package
    const venue = allocations.find((a) => a.category.toLowerCase() === 'venue');
    const catering = allocations.find(
      (a) => a.category.toLowerCase() === 'catering',
    );

    if (venue && catering && venue.flexible && catering.flexible) {
      opportunities.push({
        categories: ['venue', 'catering'],
        savings: (venue.allocated + catering.allocated) * 0.12,
        feasibility: 0.8,
        implementation: 'Book venue and catering as package deal',
      });
    }

    return opportunities;
  }

  private isPeakSeason(seasonality: string): boolean {
    const peakMonths = [5, 6, 7, 8, 9]; // May through September
    const month = new Date().getMonth();
    return peakMonths.includes(month);
  }

  private calculateOffPeakSavings(allocations: BudgetAllocation[]): number {
    return allocations.reduce((savings, allocation) => {
      const category = this.budgetCategories.get(
        allocation.category.toLowerCase(),
      );
      if (category && category.seasonalImpact > 0.5) {
        return savings + allocation.allocated * 0.2; // 20% off-peak savings
      }
      return savings;
    }, 0);
  }

  private calculateCategoryQualityImpact(
    category: string,
    savingsPercentage: number,
  ): number {
    const categoryData = this.budgetCategories.get(category.toLowerCase());
    if (categoryData) {
      return -savingsPercentage * categoryData.qualityImpact;
    }
    return -savingsPercentage * 0.5; // Default quality impact
  }

  private assessQualityMaintained(
    savingsBreakdown: SavingsBreakdown[],
  ): boolean {
    const avgQualityImpact =
      savingsBreakdown.reduce((sum, item) => sum + item.qualityImpact, 0) /
      savingsBreakdown.length;

    return avgQualityImpact > -0.2; // Less than 20% quality impact
  }

  private calculateOptimizationConfidence(
    request: BudgetOptimizationRequest,
    optimizations: any[],
  ): number {
    const avgFeasibility =
      optimizations.reduce((sum, opt) => sum + opt.feasibility, 0) /
      optimizations.length;

    const allocationFlexibility =
      request.currentAllocations.filter((a) => a.flexible).length /
      request.currentAllocations.length;

    return (avgFeasibility + allocationFlexibility) / 2;
  }

  private determineRecommendationAction(
    optimization: any,
  ): 'reduce' | 'increase' | 'redistribute' | 'eliminate' | 'add' {
    if (optimization.potentialSavings > 0) return 'reduce';
    if (optimization.type === 'package_deal') return 'redistribute';
    if (optimization.type === 'diy_alternative') return 'eliminate';
    return 'reduce';
  }

  private extractCategoryFromRisk(risk: any): string {
    if (risk.description.includes(':')) {
      return risk.description.split(':')[1].trim().split(',')[0];
    }
    return 'miscellaneous';
  }

  private calculateRiskMitigationAmount(
    risk: any,
    request: BudgetOptimizationRequest,
  ): number {
    if (risk.type === 'under_allocation') {
      return request.totalBudget * 0.05; // 5% buffer
    }
    return 500; // Default mitigation amount
  }
}

export { BudgetOptimizationAI };
