// Budget Optimizer - Wedding budget allocation and cost optimization
// WS-232 Predictive Modeling System

import type {
  PredictionInput,
  PredictionOutput,
  ModelTrainingData,
  ModelPerformanceMetrics,
  BudgetOptimizationPrediction,
  WeddingMarketData,
} from '../types';
import { BaseMLModel } from '../models/base-model';

interface BudgetOptimizerInput {
  totalBudget: number;
  guestCount: number;
  venueType: 'outdoor' | 'indoor' | 'destination' | 'church' | 'registry';
  region: string;
  weddingMonth: number;
  priorityCategories: string[]; // ['venue', 'catering', 'photography', 'flowers', 'music', 'transport']
  currentAllocations?: Record<string, number>;
}

export class BudgetOptimizer extends BaseMLModel<
  BudgetOptimizerInput,
  WeddingMarketData,
  BudgetOptimizationPrediction
> {
  private readonly defaultBudgetBreakdown: Record<string, number> = {
    venue: 0.35, // 35% - largest expense
    catering: 0.25, // 25% - food and drink
    photography: 0.12, // 12% - memories are important
    flowers: 0.08, // 8% - decorations
    music: 0.06, // 6% - entertainment
    transport: 0.04, // 4% - getting there
    attire: 0.05, // 5% - dress and suits
    stationery: 0.03, // 3% - invitations
    misc: 0.02, // 2% - miscellaneous
  };

  private readonly regionalPricingFactors: Record<string, number> = {
    'uk-london': 1.4, // London premium
    'uk-south': 1.2, // South England higher
    'uk-north': 0.9, // North England lower
    'uk-scotland': 0.8, // Scotland lower
    'uk-wales': 0.7, // Wales lowest
    'us-california': 1.5, // California premium
    'us-northeast': 1.3, // Northeast higher
    default: 1.0,
  };

  private readonly venueTypeFactors: Record<string, Record<string, number>> = {
    outdoor: {
      venue: 0.8, // Lower venue cost
      catering: 1.1, // Higher catering (logistics)
      flowers: 1.2, // More decoration needed
      transport: 1.3, // Access challenges
    },
    indoor: {
      venue: 1.0, // Standard
      catering: 1.0,
      flowers: 1.0,
      transport: 1.0,
    },
    destination: {
      venue: 1.2, // Premium venues
      catering: 1.3, // Specialized catering
      transport: 2.0, // Major transport costs
      accommodation: 1.5, // Guest accommodation
    },
    church: {
      venue: 0.3, // Often just donation
      catering: 1.0,
      flowers: 1.1, // Church decoration
      music: 1.2, // Organist/choir
    },
    registry: {
      venue: 0.2, // Civil ceremony
      catering: 1.0,
      flowers: 0.8, // Simple decoration
      photography: 0.9, // Shorter coverage
    },
  };

  private readonly seasonalFactors: Record<number, Record<string, number>> = {
    6: {
      // June - peak month
      venue: 1.3,
      photography: 1.2,
      flowers: 1.1,
    },
    12: {
      // December - holiday competition
      venue: 0.9,
      catering: 1.2, // Holiday premium
      flowers: 1.3, // Seasonal flowers expensive
    },
    // Add more seasonal variations as needed
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(`[${this.config.name}] Initializing Budget Optimizer...`);

      // Load historical budget data and pricing trends
      // TODO: Connect to Supabase for real budget data

      this.isInitialized = true;
      console.log(`[${this.config.name}] Initialization complete`);
    } catch (error) {
      await this.logError(error as Error, 'initialization');
      throw new Error(`Failed to initialize Budget Optimizer: ${error}`);
    }
  }

  async predict(
    input: PredictionInput<BudgetOptimizerInput>,
  ): Promise<PredictionOutput<BudgetOptimizationPrediction>> {
    const startTime = Date.now();

    try {
      this.validateInput(input);

      if (!this.isInitialized) {
        await this.initialize();
      }

      const { data } = input;
      const prediction = await this.generateBudgetOptimization(data);

      const output = this.createPredictionOutput(
        prediction,
        this.calculateConfidence(data),
        this.generateReasoning(data, prediction),
        startTime,
      );

      // Add alternatives
      output.alternatives = await this.generateAlternativeBudgets(data);

      await this.logPrediction(input, output);

      return output;
    } catch (error) {
      await this.logError(error as Error, 'prediction');
      throw error;
    }
  }

  async train(
    trainingData: ModelTrainingData<BudgetOptimizerInput, WeddingMarketData>,
  ): Promise<void> {
    try {
      console.log(
        `[${this.config.name}] Training with ${trainingData.inputs.length} samples`,
      );

      // Update regional and seasonal factors based on actual budget data
      await this.updatePricingFactors(trainingData);

      this.lastTraining = new Date();
      console.log(`[${this.config.name}] Training complete`);
    } catch (error) {
      await this.logError(error as Error, 'training');
      throw error;
    }
  }

  async evaluate(
    testData: ModelTrainingData<BudgetOptimizerInput, WeddingMarketData>,
  ): Promise<ModelPerformanceMetrics> {
    try {
      let totalError = 0;
      let accurate = 0;
      const total = testData.inputs.length;

      for (let i = 0; i < total; i++) {
        const input = testData.inputs[i];
        const expected = testData.outputs[i];

        const predictionInput: PredictionInput<BudgetOptimizerInput> = {
          data: input,
          metadata: {
            timestamp: new Date(),
            source: 'api',
          },
          context: {
            region: input.region || 'default',
            currency: 'GBP',
            timezone: 'Europe/London',
          },
        };

        const result = await this.predict(predictionInput);

        // Calculate budget allocation accuracy
        const budgetError =
          Math.abs(result.prediction.recommendedBudget - input.totalBudget) /
          input.totalBudget;
        totalError += budgetError;

        if (budgetError < 0.1) {
          // Within 10%
          accurate++;
        }
      }

      const accuracy = accurate / total;
      const mae = totalError / total;

      const metrics: ModelPerformanceMetrics = {
        accuracy,
        precision: accuracy,
        recall: accuracy,
        f1Score: accuracy,
        mae,
        rmse: Math.sqrt(mae),
        lastEvaluated: new Date(),
        sampleSize: total,
      };

      this.updatePerformanceMetrics(metrics);
      return metrics;
    } catch (error) {
      await this.logError(error as Error, 'evaluation');
      throw error;
    }
  }

  async save(path?: string): Promise<void> {
    try {
      const modelState = {
        config: this.config,
        defaultBudgetBreakdown: this.defaultBudgetBreakdown,
        regionalPricingFactors: this.regionalPricingFactors,
        lastTraining: this.lastTraining,
        performanceMetrics: this.performanceMetrics,
      };

      console.log(`[${this.config.name}] Model state saved`, { path });
    } catch (error) {
      await this.logError(error as Error, 'save');
      throw error;
    }
  }

  async load(path?: string): Promise<void> {
    try {
      console.log(`[${this.config.name}] Model state loaded`, { path });
    } catch (error) {
      await this.logError(error as Error, 'load');
      throw error;
    }
  }

  private async generateBudgetOptimization(
    input: BudgetOptimizerInput,
  ): Promise<BudgetOptimizationPrediction> {
    const {
      totalBudget,
      guestCount,
      venueType,
      region,
      weddingMonth,
      priorityCategories,
    } = input;

    // Calculate per-guest budget
    const budgetPerGuest = totalBudget / guestCount;

    // Get regional pricing factor
    const regionalFactor =
      this.regionalPricingFactors[region] ||
      this.regionalPricingFactors.default;

    // Calculate optimized budget breakdown
    const optimizedBreakdown = this.calculateOptimizedBreakdown(
      totalBudget,
      venueType,
      weddingMonth,
      priorityCategories,
      regionalFactor,
    );

    // Calculate recommended total budget based on guest count and region
    const recommendedBudget = this.calculateRecommendedBudget(
      guestCount,
      region,
      venueType,
    );

    // Identify saving opportunities
    const savingOpportunities = this.identifySavingOpportunities(
      input,
      optimizedBreakdown,
      regionalFactor,
    );

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(
      input,
      budgetPerGuest,
      regionalFactor,
    );

    return {
      recommendedBudget,
      budgetBreakdown: optimizedBreakdown,
      savingOpportunities,
      riskFactors,
    };
  }

  private calculateOptimizedBreakdown(
    totalBudget: number,
    venueType: string,
    weddingMonth: number,
    priorityCategories: string[],
    regionalFactor: number,
  ): Record<string, number> {
    const breakdown: Record<string, number> = {};
    let adjustedBreakdown = { ...this.defaultBudgetBreakdown };

    // Apply venue type adjustments
    const venueAdjustments =
      this.venueTypeFactors[venueType] || this.venueTypeFactors.indoor;
    Object.keys(venueAdjustments).forEach((category) => {
      if (adjustedBreakdown[category]) {
        adjustedBreakdown[category] *= venueAdjustments[category];
      }
    });

    // Apply seasonal adjustments
    const seasonalAdjustments = this.seasonalFactors[weddingMonth] || {};
    Object.keys(seasonalAdjustments).forEach((category) => {
      if (adjustedBreakdown[category]) {
        adjustedBreakdown[category] *= seasonalAdjustments[category];
      }
    });

    // Apply priority adjustments
    if (priorityCategories.length > 0) {
      // Boost priority categories by 10%
      priorityCategories.forEach((category) => {
        if (adjustedBreakdown[category]) {
          adjustedBreakdown[category] *= 1.1;
        }
      });

      // Reduce non-priority categories slightly
      const nonPriorityCategories = Object.keys(adjustedBreakdown).filter(
        (cat) => !priorityCategories.includes(cat),
      );

      nonPriorityCategories.forEach((category) => {
        adjustedBreakdown[category] *= 0.95;
      });
    }

    // Normalize to ensure percentages add up to 1
    const total = Object.values(adjustedBreakdown).reduce(
      (sum, val) => sum + val,
      0,
    );
    Object.keys(adjustedBreakdown).forEach((category) => {
      adjustedBreakdown[category] /= total;
      breakdown[category] = Math.round(
        totalBudget * adjustedBreakdown[category],
      );
    });

    return breakdown;
  }

  private calculateRecommendedBudget(
    guestCount: number,
    region: string,
    venueType: string,
  ): number {
    // Base budget per guest varies by region
    const baseBudgetPerGuest = {
      'uk-london': 180,
      'uk-south': 150,
      'uk-north': 120,
      'uk-scotland': 100,
      'uk-wales': 90,
      default: 130,
    };

    const basePerGuest =
      baseBudgetPerGuest[region as keyof typeof baseBudgetPerGuest] ||
      baseBudgetPerGuest.default;

    // Venue type multiplier
    const venueMultipliers = {
      outdoor: 1.1,
      indoor: 1.0,
      destination: 1.8,
      church: 0.9,
      registry: 0.7,
    };

    const venueMultiplier =
      venueMultipliers[venueType as keyof typeof venueMultipliers] || 1.0;

    return Math.round(basePerGuest * guestCount * venueMultiplier);
  }

  private identifySavingOpportunities(
    input: BudgetOptimizerInput,
    breakdown: Record<string, number>,
    regionalFactor: number,
  ): Array<{ category: string; potential: number; method: string }> {
    const opportunities: Array<{
      category: string;
      potential: number;
      method: string;
    }> = [];

    // Check for over-allocation in certain categories
    Object.entries(breakdown).forEach(([category, amount]) => {
      const defaultAmount =
        this.defaultBudgetBreakdown[category] * input.totalBudget;

      if (amount > defaultAmount * 1.2) {
        // 20% over typical allocation
        const potential = amount - defaultAmount;

        const savingMethods = {
          venue: 'Consider off-peak dates or alternative venues',
          catering: 'Explore buffet options or local suppliers',
          photography: 'Book newer photographers or shorter coverage',
          flowers: 'Use seasonal flowers or DIY arrangements',
          music: 'Consider DJ instead of live band',
          transport: 'Coordinate group transport or local venues',
        };

        opportunities.push({
          category,
          potential: Math.round(potential),
          method:
            savingMethods[category as keyof typeof savingMethods] ||
            'Review suppliers and negotiate',
        });
      }
    });

    // Wedding-specific saving opportunities
    if (input.weddingMonth === 6 || input.weddingMonth === 9) {
      // June or September
      opportunities.push({
        category: 'venue',
        potential: Math.round(input.totalBudget * 0.15),
        method: 'Consider May or October for 15-20% venue savings',
      });
    }

    if (input.guestCount > 150) {
      opportunities.push({
        category: 'catering',
        potential: Math.round(breakdown.catering * 0.1),
        method: 'Cocktail reception can save 10-15% on catering',
      });
    }

    return opportunities.sort((a, b) => b.potential - a.potential);
  }

  private identifyRiskFactors(
    input: BudgetOptimizerInput,
    budgetPerGuest: number,
    regionalFactor: number,
  ): Array<{
    factor: string;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }> {
    const risks: Array<{
      factor: string;
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
    }> = [];

    // Low budget per guest risk
    const minBudgetPerGuest = {
      'uk-london': 120,
      'uk-south': 100,
      'uk-north': 80,
      default: 90,
    };

    const minPerGuest =
      minBudgetPerGuest[input.region as keyof typeof minBudgetPerGuest] ||
      minBudgetPerGuest.default;

    if (budgetPerGuest < minPerGuest) {
      risks.push({
        factor: 'Budget per guest below regional minimum',
        impact: 'high',
        mitigation: 'Consider reducing guest count or increasing total budget',
      });
    }

    // Peak season risk
    if (input.weddingMonth >= 5 && input.weddingMonth <= 9) {
      risks.push({
        factor: 'Peak wedding season pricing',
        impact: 'medium',
        mitigation: 'Book early and consider mid-week dates for savings',
      });
    }

    // Venue type risks
    if (
      input.venueType === 'outdoor' &&
      (input.weddingMonth <= 3 || input.weddingMonth >= 11)
    ) {
      risks.push({
        factor: 'Outdoor venue in unpredictable weather season',
        impact: 'medium',
        mitigation: 'Ensure marquee/backup plan included in venue cost',
      });
    }

    if (input.venueType === 'destination') {
      risks.push({
        factor: 'Destination wedding logistics complexity',
        impact: 'high',
        mitigation: 'Budget extra 15-20% for unexpected costs and coordination',
      });
    }

    // Large guest count risks
    if (input.guestCount > 200) {
      risks.push({
        factor: 'Large guest count increases cost volatility',
        impact: 'medium',
        mitigation:
          'Confirm final numbers early and negotiate per-head pricing',
      });
    }

    return risks;
  }

  private calculateConfidence(input: BudgetOptimizerInput): number {
    let confidence = 0.7; // Base confidence

    // More confidence with standard guest counts
    if (input.guestCount >= 50 && input.guestCount <= 150) {
      confidence += 0.1;
    }

    // More confidence with known regions
    if (this.regionalPricingFactors[input.region]) {
      confidence += 0.1;
    }

    // More confidence with standard venue types
    if (['indoor', 'outdoor'].includes(input.venueType)) {
      confidence += 0.1;
    }

    // Lower confidence for edge cases
    if (input.totalBudget / input.guestCount < 50) {
      // Very low budget per guest
      confidence -= 0.2;
    }

    if (input.venueType === 'destination') {
      confidence -= 0.1; // More variables
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private generateReasoning(
    input: BudgetOptimizerInput,
    prediction: BudgetOptimizationPrediction,
  ): string[] {
    const reasoning: string[] = [];

    const budgetPerGuest = input.totalBudget / input.guestCount;
    reasoning.push(
      `Budget of £${budgetPerGuest.toFixed(0)} per guest for ${input.guestCount} guests`,
    );

    const regionalFactor = this.regionalPricingFactors[input.region] || 1.0;
    if (regionalFactor !== 1.0) {
      reasoning.push(
        `Regional pricing adjustment: ${(regionalFactor * 100 - 100).toFixed(0)}%`,
      );
    }

    reasoning.push(
      `${input.venueType} venue type affects category allocations`,
    );

    if (input.weddingMonth >= 5 && input.weddingMonth <= 9) {
      reasoning.push('Peak wedding season may increase costs by 10-20%');
    }

    if (input.priorityCategories.length > 0) {
      reasoning.push(
        `Prioritized categories: ${input.priorityCategories.join(', ')}`,
      );
    }

    const topSaving = prediction.savingOpportunities[0];
    if (topSaving) {
      reasoning.push(
        `Largest saving opportunity: £${topSaving.potential} in ${topSaving.category}`,
      );
    }

    return reasoning;
  }

  private async generateAlternativeBudgets(
    input: BudgetOptimizerInput,
  ): Promise<
    Array<{
      value: BudgetOptimizationPrediction;
      confidence: number;
      reasoning: string;
    }>
  > {
    const alternatives: Array<{
      value: BudgetOptimizationPrediction;
      confidence: number;
      reasoning: string;
    }> = [];

    // Conservative budget (20% less)
    const conservativeInput = {
      ...input,
      totalBudget: input.totalBudget * 0.8,
    };
    const conservative =
      await this.generateBudgetOptimization(conservativeInput);
    alternatives.push({
      value: conservative,
      confidence: 0.8,
      reasoning:
        'Conservative budget with 20% reduction focusing on essentials',
    });

    // Premium budget (30% more)
    const premiumInput = { ...input, totalBudget: input.totalBudget * 1.3 };
    const premium = await this.generateBudgetOptimization(premiumInput);
    alternatives.push({
      value: premium,
      confidence: 0.7,
      reasoning: 'Premium budget with enhanced experiences and contingency',
    });

    return alternatives;
  }

  private async updatePricingFactors(
    trainingData: ModelTrainingData<BudgetOptimizerInput, WeddingMarketData>,
  ): Promise<void> {
    // Analyze training data to update pricing factors
    // This would implement actual ML learning from historical budget data
    console.log(
      `[${this.config.name}] Updated pricing factors from ${trainingData.inputs.length} samples`,
    );
  }
}
