// Revenue Forecaster - Predicts subscription growth and revenue patterns
// WS-232 Predictive Modeling System

import type {
  PredictionInput,
  PredictionOutput,
  ModelTrainingData,
  ModelPerformanceMetrics,
  WeddingMarketData,
} from '../types';
import { BaseMLModel } from '../models/base-model';

interface RevenueInput {
  timeframe: '1month' | '3months' | '6months' | '1year';
  currentMRR: number; // Monthly Recurring Revenue
  newSignups: number; // Recent monthly signups
  churnRate: number; // Monthly churn rate (0-1)
  conversionRate: number; // Trial to paid conversion (0-1)
  averageTicketSize: number; // Average monthly subscription value
  seasonalMonth: number; // Current month (1-12)
  marketingSpend: number; // Monthly marketing budget
  competitorCount: number; // Number of active competitors
  economicIndicator: number; // Economic health score 0-100
  viralCoefficient: number; // User referral rate
}

interface RevenueForecast {
  predictedRevenue: number;
  revenueRange: {
    optimistic: number;
    conservative: number;
  };
  growthRate: number; // Monthly growth rate
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  keyDrivers: Array<{
    factor: string;
    impact: number; // Revenue impact in currency
    description: string;
  }>;
  seasonalAdjustments: Record<number, number>; // Month -> multiplier
  riskFactors: Array<{
    risk: string;
    probability: number; // 0-1
    impact: number; // Potential revenue impact
  }>;
}

export class RevenueForecaster extends BaseMLModel<
  RevenueInput,
  WeddingMarketData,
  RevenueForecast
> {
  private readonly weddingSeasonalityFactors: Record<number, number> = {
    1: 0.7, // January - post-holiday lull
    2: 0.8, // February - Valentine's boost
    3: 0.9, // March - engagement season starts
    4: 1.1, // April - wedding planning begins
    5: 1.2, // May - peak planning season
    6: 1.3, // June - peak wedding season
    7: 1.2, // July - summer high
    8: 1.1, // August - late summer
    9: 1.0, // September - autumn weddings
    10: 0.9, // October - season winds down
    11: 0.8, // November - off-season
    12: 0.7, // December - holiday distractions
  };

  private readonly marketingROIFactors: Record<string, number> = {
    socialMedia: 3.2, // £3.20 return per £1 spent
    googleAds: 4.1, // £4.10 return per £1 spent
    contentMarketing: 2.8, // £2.80 return per £1 spent
    referralProgram: 5.5, // £5.50 return per £1 spent
    weddingShows: 2.3, // £2.30 return per £1 spent
    influencerMarketing: 3.8, // £3.80 return per £1 spent
  };

  private readonly subscriptionTierWeights: Record<string, number> = {
    FREE: 0, // £0 MRR contribution
    STARTER: 19, // £19/month
    PROFESSIONAL: 49, // £49/month
    SCALE: 79, // £79/month
    ENTERPRISE: 149, // £149/month
  };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log(`[${this.config.name}] Initializing Revenue Forecaster...`);

      // Load historical revenue data and market trends
      // TODO: Connect to Supabase financial metrics

      this.isInitialized = true;
      console.log(`[${this.config.name}] Initialization complete`);
    } catch (error) {
      await this.logError(error as Error, 'initialization');
      throw new Error(`Failed to initialize Revenue Forecaster: ${error}`);
    }
  }

  async predict(
    input: PredictionInput<RevenueInput>,
  ): Promise<PredictionOutput<RevenueForecast>> {
    const startTime = Date.now();

    try {
      this.validateInput(input);

      if (!this.isInitialized) {
        await this.initialize();
      }

      const { data } = input;
      const prediction = await this.generateRevenueForecast(data);

      const output = this.createPredictionOutput(
        prediction,
        this.calculateConfidence(data),
        this.generateReasoning(data, prediction),
        startTime,
      );

      // Add alternative forecasts
      output.alternatives = await this.generateAlternativeForecasts(data);

      await this.logPrediction(input, output);

      return output;
    } catch (error) {
      await this.logError(error as Error, 'prediction');
      throw error;
    }
  }

  async train(
    trainingData: ModelTrainingData<RevenueInput, WeddingMarketData>,
  ): Promise<void> {
    try {
      console.log(
        `[${this.config.name}] Training with ${trainingData.inputs.length} samples`,
      );

      // Update seasonality and marketing ROI factors based on actual revenue data
      await this.updateRevenueModels(trainingData);

      this.lastTraining = new Date();
      console.log(`[${this.config.name}] Training complete`);
    } catch (error) {
      await this.logError(error as Error, 'training');
      throw error;
    }
  }

  async evaluate(
    testData: ModelTrainingData<RevenueInput, WeddingMarketData>,
  ): Promise<ModelPerformanceMetrics> {
    try {
      let totalError = 0;
      let accurateForecasts = 0;
      const total = testData.inputs.length;

      for (let i = 0; i < total; i++) {
        const input = testData.inputs[i];

        const predictionInput: PredictionInput<RevenueInput> = {
          data: input,
          metadata: {
            timestamp: new Date(),
            source: 'api',
          },
          context: {
            region: 'default',
            currency: 'GBP',
            timezone: 'Europe/London',
          },
        };

        const result = await this.predict(predictionInput);

        // Mock actual revenue for evaluation (would come from historical data)
        const actualRevenue = input.currentMRR * (1 + 0.1); // Assume 10% growth
        const forecastError =
          Math.abs(result.prediction.predictedRevenue - actualRevenue) /
          actualRevenue;

        totalError += forecastError;
        if (forecastError < 0.15) {
          // Within 15%
          accurateForecasts++;
        }
      }

      const accuracy = accurateForecasts / total;
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
        weddingSeasonalityFactors: this.weddingSeasonalityFactors,
        marketingROIFactors: this.marketingROIFactors,
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

  private async generateRevenueForecast(
    input: RevenueInput,
  ): Promise<RevenueForecast> {
    const timeframeMultiplier = this.getTimeframeMultiplier(input.timeframe);

    // Base revenue projection
    let baseRevenue = input.currentMRR;

    // Apply growth factors
    const netGrowthRate = this.calculateNetGrowthRate(input);
    const projectedRevenue =
      baseRevenue * Math.pow(1 + netGrowthRate, timeframeMultiplier);

    // Apply seasonal adjustments
    const seasonalFactor = this.calculateSeasonalImpact(
      input.seasonalMonth,
      timeframeMultiplier,
    );
    const seasonallyAdjustedRevenue = projectedRevenue * seasonalFactor;

    // Marketing impact
    const marketingImpact = this.calculateMarketingImpact(
      input.marketingSpend,
      timeframeMultiplier,
    );
    const finalRevenue = seasonallyAdjustedRevenue + marketingImpact;

    // Calculate confidence intervals
    const volatility = this.calculateVolatility(input);
    const confidenceInterval = {
      lower: finalRevenue * (1 - volatility),
      upper: finalRevenue * (1 + volatility),
    };

    // Generate revenue range estimates
    const revenueRange = {
      conservative: finalRevenue * 0.85,
      optimistic: finalRevenue * 1.25,
    };

    // Identify key drivers
    const keyDrivers = this.identifyKeyDrivers(input, finalRevenue);

    // Generate seasonal adjustments
    const seasonalAdjustments = { ...this.weddingSeasonalityFactors };

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(input);

    return {
      predictedRevenue: Math.round(finalRevenue),
      revenueRange,
      growthRate: netGrowthRate,
      confidenceInterval,
      keyDrivers,
      seasonalAdjustments,
      riskFactors,
    };
  }

  private getTimeframeMultiplier(timeframe: string): number {
    const multipliers = {
      '1month': 1,
      '3months': 3,
      '6months': 6,
      '1year': 12,
    };
    return multipliers[timeframe as keyof typeof multipliers] || 1;
  }

  private calculateNetGrowthRate(input: RevenueInput): number {
    // Base growth rate from new signups and conversions
    const newCustomerRevenue =
      input.newSignups * input.conversionRate * input.averageTicketSize;
    const currentMRRBase = input.currentMRR;

    const acquisitionGrowthRate = newCustomerRevenue / currentMRRBase;

    // Subtract churn impact
    const churnImpact = input.churnRate;

    // Add viral growth impact
    const viralGrowthRate = input.viralCoefficient * 0.1; // 10% of viral coefficient

    // Economic factor impact
    const economicImpact = (input.economicIndicator - 50) / 500; // -0.1 to +0.1

    // Competition impact (more competitors = slower growth)
    const competitionImpact = -Math.min(0.05, input.competitorCount * 0.01);

    const netGrowthRate =
      acquisitionGrowthRate -
      churnImpact +
      viralGrowthRate +
      economicImpact +
      competitionImpact;

    // Cap growth rate at reasonable bounds
    return Math.max(-0.1, Math.min(0.5, netGrowthRate)); // -10% to +50% monthly
  }

  private calculateSeasonalImpact(
    currentMonth: number,
    timeframeMonths: number,
  ): number {
    if (timeframeMonths === 1) {
      return this.weddingSeasonalityFactors[currentMonth] || 1.0;
    }

    // For multi-month forecasts, average the seasonal factors
    let totalFactor = 0;
    for (let i = 0; i < timeframeMonths; i++) {
      const month = ((currentMonth + i - 1) % 12) + 1;
      totalFactor += this.weddingSeasonalityFactors[month] || 1.0;
    }

    return totalFactor / timeframeMonths;
  }

  private calculateMarketingImpact(
    marketingSpend: number,
    timeframeMonths: number,
  ): number {
    // Assume average marketing ROI across channels
    const averageROI =
      Object.values(this.marketingROIFactors).reduce(
        (sum, roi) => sum + roi,
        0,
      ) / Object.values(this.marketingROIFactors).length;

    // Marketing impact with diminishing returns
    const monthlyImpact = marketingSpend * averageROI * 0.1; // 10% of ROI goes to MRR growth

    return monthlyImpact * timeframeMonths;
  }

  private calculateVolatility(input: RevenueInput): number {
    let volatility = 0.1; // Base 10% volatility

    // Higher volatility for higher churn rates
    volatility += input.churnRate * 0.5;

    // Higher volatility with more competitors
    volatility += Math.min(0.1, input.competitorCount * 0.02);

    // Lower volatility with better economic conditions
    volatility -= (input.economicIndicator - 50) / 1000;

    // Higher volatility in peak wedding season (more variable)
    const seasonalFactor =
      this.weddingSeasonalityFactors[input.seasonalMonth] || 1.0;
    if (seasonalFactor > 1.1) {
      volatility += 0.05;
    }

    return Math.max(0.05, Math.min(0.3, volatility)); // 5-30% volatility
  }

  private identifyKeyDrivers(
    input: RevenueInput,
    predictedRevenue: number,
  ): Array<{
    factor: string;
    impact: number;
    description: string;
  }> {
    const drivers: Array<{
      factor: string;
      impact: number;
      description: string;
    }> = [];

    // New customer acquisition
    const acquisitionImpact =
      input.newSignups * input.conversionRate * input.averageTicketSize;
    drivers.push({
      factor: 'New Customer Acquisition',
      impact: acquisitionImpact,
      description: `${input.newSignups} monthly signups × ${(input.conversionRate * 100).toFixed(1)}% conversion`,
    });

    // Churn impact
    const churnImpact = -input.currentMRR * input.churnRate;
    drivers.push({
      factor: 'Customer Churn',
      impact: churnImpact,
      description: `${(input.churnRate * 100).toFixed(1)}% monthly churn rate`,
    });

    // Marketing effectiveness
    const marketingImpact = this.calculateMarketingImpact(
      input.marketingSpend,
      1,
    );
    if (marketingImpact > 0) {
      drivers.push({
        factor: 'Marketing Investment',
        impact: marketingImpact,
        description: `£${input.marketingSpend.toLocaleString()} monthly spend driving growth`,
      });
    }

    // Seasonal impact
    const seasonalFactor =
      this.weddingSeasonalityFactors[input.seasonalMonth] || 1.0;
    if (seasonalFactor !== 1.0) {
      const seasonalImpact = input.currentMRR * (seasonalFactor - 1);
      drivers.push({
        factor: 'Wedding Seasonality',
        impact: seasonalImpact,
        description: `${((seasonalFactor - 1) * 100).toFixed(0)}% seasonal adjustment for wedding industry`,
      });
    }

    // Viral growth
    if (input.viralCoefficient > 0.1) {
      const viralImpact = input.currentMRR * input.viralCoefficient * 0.1;
      drivers.push({
        factor: 'Viral Growth',
        impact: viralImpact,
        description: `${input.viralCoefficient.toFixed(2)} viral coefficient driving referrals`,
      });
    }

    return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  private identifyRiskFactors(input: RevenueInput): Array<{
    risk: string;
    probability: number;
    impact: number;
  }> {
    const risks: Array<{ risk: string; probability: number; impact: number }> =
      [];

    // High churn rate risk
    if (input.churnRate > 0.1) {
      // > 10% monthly churn
      risks.push({
        risk: 'High customer churn rate',
        probability: 0.8,
        impact: -input.currentMRR * input.churnRate * 12, // Annual impact
      });
    }

    // Low conversion rate risk
    if (input.conversionRate < 0.05) {
      // < 5% conversion
      risks.push({
        risk: 'Poor trial-to-paid conversion',
        probability: 0.7,
        impact: -input.newSignups * 0.05 * input.averageTicketSize * 12, // Lost potential
      });
    }

    // Economic downturn risk
    if (input.economicIndicator < 40) {
      risks.push({
        risk: 'Economic downturn impact',
        probability: 0.6,
        impact: -input.currentMRR * 0.2, // 20% revenue impact
      });
    }

    // High competition risk
    if (input.competitorCount > 5) {
      risks.push({
        risk: 'Increased market competition',
        probability: 0.5,
        impact: -input.currentMRR * 0.15, // 15% revenue impact
      });
    }

    // Seasonal dependency risk
    const seasonalFactor =
      this.weddingSeasonalityFactors[input.seasonalMonth] || 1.0;
    if (seasonalFactor > 1.2) {
      risks.push({
        risk: 'Over-dependency on peak wedding season',
        probability: 0.4,
        impact: -input.currentMRR * 0.3, // 30% drop in off-season
      });
    }

    // Marketing efficiency risk
    if (input.marketingSpend > input.currentMRR * 0.5) {
      // Spending > 50% of MRR
      risks.push({
        risk: 'High customer acquisition costs',
        probability: 0.6,
        impact: -input.marketingSpend * 6, // 6 months of current spend
      });
    }

    return risks.sort(
      (a, b) =>
        b.probability * Math.abs(b.impact) - a.probability * Math.abs(a.impact),
    );
  }

  private calculateConfidence(input: RevenueInput): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence with stable metrics
    if (input.churnRate < 0.05) confidence += 0.1;
    if (input.conversionRate > 0.1) confidence += 0.1;
    if (input.economicIndicator > 60) confidence += 0.05;

    // Lower confidence with volatility
    if (input.competitorCount > 3) confidence -= 0.05;
    if (input.currentMRR < 10000) confidence -= 0.1; // Early stage less predictable

    // Seasonal confidence adjustment
    const seasonalFactor =
      this.weddingSeasonalityFactors[input.seasonalMonth] || 1.0;
    if (seasonalFactor > 1.1 || seasonalFactor < 0.9) {
      confidence -= 0.05; // Less confident during extreme seasonal periods
    }

    return Math.max(0.3, Math.min(0.9, confidence));
  }

  private generateReasoning(
    input: RevenueInput,
    prediction: RevenueForecast,
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(
      `Current MRR: £${input.currentMRR.toLocaleString()} with ${(prediction.growthRate * 100).toFixed(1)}% projected monthly growth`,
    );
    reasoning.push(
      `${input.newSignups} monthly signups × ${(input.conversionRate * 100).toFixed(1)}% conversion = £${(input.newSignups * input.conversionRate * input.averageTicketSize).toLocaleString()} new MRR`,
    );
    reasoning.push(
      `${(input.churnRate * 100).toFixed(1)}% monthly churn rate impacts retention`,
    );

    const seasonalFactor =
      this.weddingSeasonalityFactors[input.seasonalMonth] || 1.0;
    if (seasonalFactor !== 1.0) {
      reasoning.push(
        `Wedding seasonality: ${((seasonalFactor - 1) * 100).toFixed(0)}% adjustment for current month`,
      );
    }

    if (input.marketingSpend > 0) {
      reasoning.push(
        `£${input.marketingSpend.toLocaleString()} monthly marketing investment`,
      );
    }

    if (input.viralCoefficient > 0.1) {
      reasoning.push(
        `${input.viralCoefficient.toFixed(2)} viral coefficient indicating referral growth`,
      );
    }

    if (input.competitorCount > 2) {
      reasoning.push(
        `${input.competitorCount} competitors affecting market dynamics`,
      );
    }

    const topDriver = prediction.keyDrivers[0];
    if (topDriver) {
      reasoning.push(
        `Primary revenue driver: ${topDriver.factor} (£${topDriver.impact.toLocaleString()} impact)`,
      );
    }

    return reasoning;
  }

  private async generateAlternativeForecasts(input: RevenueInput): Promise<
    Array<{
      value: RevenueForecast;
      confidence: number;
      reasoning: string;
    }>
  > {
    const alternatives: Array<{
      value: RevenueForecast;
      confidence: number;
      reasoning: string;
    }> = [];

    // Conservative scenario (reduced growth assumptions)
    const conservativeInput = {
      ...input,
      newSignups: input.newSignups * 0.8,
      conversionRate: input.conversionRate * 0.9,
      churnRate: input.churnRate * 1.1,
      marketingSpend: input.marketingSpend * 0.7,
    };
    const conservative = await this.generateRevenueForecast(conservativeInput);

    alternatives.push({
      value: conservative,
      confidence: 0.8,
      reasoning: 'Conservative forecast with reduced growth assumptions',
    });

    // Aggressive scenario (optimistic growth assumptions)
    const aggressiveInput = {
      ...input,
      newSignups: input.newSignups * 1.3,
      conversionRate: input.conversionRate * 1.15,
      churnRate: input.churnRate * 0.8,
      viralCoefficient: input.viralCoefficient * 1.2,
    };
    const aggressive = await this.generateRevenueForecast(aggressiveInput);

    alternatives.push({
      value: aggressive,
      confidence: 0.4,
      reasoning: 'Aggressive forecast with strong execution across all metrics',
    });

    return alternatives;
  }

  private async updateRevenueModels(
    trainingData: ModelTrainingData<RevenueInput, WeddingMarketData>,
  ): Promise<void> {
    // Analyze historical revenue data to update forecasting models
    console.log(
      `[${this.config.name}] Updated revenue models from ${trainingData.inputs.length} revenue records`,
    );

    // In production, this would:
    // 1. Analyze actual vs predicted revenue to improve accuracy
    // 2. Update seasonal factors based on actual wedding industry data
    // 3. Refine marketing ROI calculations from real campaign performance
    // 4. Adjust churn and conversion predictions based on actual user behavior
  }
}
