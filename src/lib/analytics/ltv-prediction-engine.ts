import { createClient } from '@supabase/supabase-js';

export interface SupplierFeatures {
  supplierId: string;
  businessType: string;
  subscriptionTier: string;
  acquisitionChannel: string;
  monthsActive: number;
  totalRevenue: number;
  averageMonthlyRevenue: number;
  lastPaymentDate: Date;
  engagementScore: number;
  seasonalActivity: number;
  marketPosition: 'premium' | 'standard' | 'budget';
  referralScore: number;
  customerSatisfaction: number;
}

export interface LTVPredictionResult {
  supplierId: string;
  historicalLTV: number;
  predictedLTV: number;
  totalLTV: number;
  confidence: number;
  paybackPeriod: number;
  ltvCacRatio: number;
  predictionBreakdown: ModelBreakdown[];
  calculatedAt: Date;
  modelVersion: string;
  riskFactors: string[];
  churnProbability: number;
  expansionPotential: number;
}

export interface ModelBreakdown {
  modelType: 'cohort_based' | 'probabilistic' | 'ml_regression' | 'ensemble';
  prediction: number;
  confidence: number;
  weight: number;
  contributingFactors: string[];
}

export interface BatchLTVPredictionResult {
  predictions: LTVPredictionResult[];
  totalProcessed: number;
  averageLTV: number;
  highValueSuppliers: number;
  processedAt: Date;
  executionTime: number;
}

export interface SegmentFilter {
  businessType?: string[];
  subscriptionTier?: string[];
  acquisitionChannel?: string[];
  monthsActiveMin?: number;
  monthsActiveMax?: number;
  revenueMin?: number;
  revenueMax?: number;
}

export interface EnsemblePrediction {
  finalPrediction: number;
  confidence: number;
  modelPredictions: ModelBreakdown[];
  uncertaintyRange: [number, number];
  qualityScore: number;
}

export interface PredictionModel {
  id: string;
  type: 'cohort_based' | 'probabilistic' | 'ml_regression';
  weight: number;
  accuracy: number;
  predict(
    features: SupplierFeatures,
  ): Promise<{ prediction: number; confidence: number }>;
}

export interface CohortBasedModel {
  cohortData: Map<
    string,
    {
      retentionRates: number[];
      averageRevenue: number;
      survivalCurve: number[];
      sampleSize: number;
    }
  >;
}

export interface BayesianModel {
  priorDistribution: {
    mean: number;
    variance: number;
  };
  likelihoodParams: {
    alpha: number;
    beta: number;
  };
  posteriorUpdates: number;
}

export interface MLRegressionModel {
  features: string[];
  coefficients: number[];
  intercept: number;
  featureImportance: Record<string, number>;
  trainingAccuracy: number;
}

export class LTVPredictionEngine {
  private supabase: any;
  private models: Map<string, PredictionModel> = new Map();
  private cohortModel: CohortBasedModel;
  private bayesianModel: BayesianModel;
  private mlModel: MLRegressionModel;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    this.initializeModels();
  }

  async predictSupplierLTV(
    supplierId: string,
    predictionHorizon: number = 24,
  ): Promise<LTVPredictionResult> {
    try {
      // Extract supplier features
      const features = await this.extractSupplierFeatures(supplierId);

      // Run multiple prediction models
      const modelPredictions = await this.runMultipleModels(features);

      // Generate ensemble prediction
      const ensemblePrediction = await this.ensembleModelPrediction(
        features,
        Array.from(this.models.values()),
      );

      // Apply wedding industry seasonal adjustments
      const seasonallyAdjusted = this.applySeasonalAdjustments(
        ensemblePrediction,
        features,
      );

      // Calculate additional metrics
      const historicalLTV = await this.calculateHistoricalLTV(supplierId);
      const paybackPeriod = this.calculatePaybackPeriod(
        features,
        seasonallyAdjusted.finalPrediction,
      );
      const ltvCacRatio = await this.calculateLTVCACRatio(
        supplierId,
        seasonallyAdjusted.finalPrediction,
      );

      // Assess risk factors
      const riskFactors = this.assessRiskFactors(features);
      const churnProbability = this.calculateChurnProbability(features);
      const expansionPotential = this.calculateExpansionPotential(features);

      return {
        supplierId,
        historicalLTV,
        predictedLTV: seasonallyAdjusted.finalPrediction,
        totalLTV: historicalLTV + seasonallyAdjusted.finalPrediction,
        confidence: seasonallyAdjusted.confidence,
        paybackPeriod,
        ltvCacRatio,
        predictionBreakdown: seasonallyAdjusted.modelPredictions,
        calculatedAt: new Date(),
        modelVersion: 'v2.1-ensemble',
        riskFactors,
        churnProbability,
        expansionPotential,
      };
    } catch (error) {
      throw new Error(
        `LTV prediction failed for supplier ${supplierId}: ${error.message}`,
      );
    }
  }

  async batchPredictLTV(
    supplierIds: string[],
    segmentFilters: SegmentFilter[] = [],
  ): Promise<BatchLTVPredictionResult> {
    const startTime = Date.now();
    const predictions: LTVPredictionResult[] = [];

    try {
      // Apply segment filtering if provided
      const filteredSuppliers =
        segmentFilters.length > 0
          ? await this.applySegmentFilters(supplierIds, segmentFilters)
          : supplierIds;

      // Process in batches for performance
      const batchSize = 100;
      for (let i = 0; i < filteredSuppliers.length; i += batchSize) {
        const batch = filteredSuppliers.slice(i, i + batchSize);

        const batchPredictions = await Promise.all(
          batch.map((supplierId) => this.predictSupplierLTV(supplierId)),
        );

        predictions.push(...batchPredictions);
      }

      const averageLTV =
        predictions.reduce((sum, p) => sum + p.totalLTV, 0) /
        predictions.length;
      const highValueSuppliers = predictions.filter(
        (p) => p.totalLTV > 2000,
      ).length;

      return {
        predictions,
        totalProcessed: predictions.length,
        averageLTV,
        highValueSuppliers,
        processedAt: new Date(),
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Batch LTV prediction failed: ${error.message}`);
    }
  }

  private async ensembleModelPrediction(
    supplierFeatures: SupplierFeatures,
    models: PredictionModel[],
  ): Promise<EnsemblePrediction> {
    const modelPredictions: ModelBreakdown[] = [];
    let totalWeight = 0;
    let weightedSum = 0;
    let confidenceSum = 0;

    // Run each model and collect predictions
    for (const model of models) {
      try {
        const result = await model.predict(supplierFeatures);

        const breakdown: ModelBreakdown = {
          modelType: model.type,
          prediction: result.prediction,
          confidence: result.confidence,
          weight: model.weight * model.accuracy, // Weight by accuracy
          contributingFactors: this.getModelContributingFactors(
            model.type,
            supplierFeatures,
          ),
        };

        modelPredictions.push(breakdown);

        const effectiveWeight = breakdown.weight * breakdown.confidence;
        weightedSum += breakdown.prediction * effectiveWeight;
        totalWeight += effectiveWeight;
        confidenceSum += breakdown.confidence * model.weight;
      } catch (error) {
        console.warn(`Model ${model.type} failed: ${error.message}`);
      }
    }

    if (totalWeight === 0) {
      throw new Error('All models failed to generate predictions');
    }

    const finalPrediction = weightedSum / totalWeight;
    const confidence = Math.min(0.95, confidenceSum / models.length);

    // Calculate uncertainty range based on model variance
    const predictions = modelPredictions.map((m) => m.prediction);
    const variance = this.calculateVariance(predictions);
    const uncertaintyRange: [number, number] = [
      Math.max(0, finalPrediction - Math.sqrt(variance) * 1.96),
      finalPrediction + Math.sqrt(variance) * 1.96,
    ];

    // Quality score based on model agreement and confidence
    const modelAgreement = 1 - Math.sqrt(variance) / finalPrediction;
    const qualityScore = (confidence + Math.max(0, modelAgreement)) / 2;

    return {
      finalPrediction,
      confidence,
      modelPredictions,
      uncertaintyRange,
      qualityScore,
    };
  }

  private async extractSupplierFeatures(
    supplierId: string,
  ): Promise<SupplierFeatures> {
    const { data: supplier, error } = await this.supabase
      .from('suppliers')
      .select(
        `
        id,
        business_type,
        subscription_tier,
        acquisition_channel,
        created_at,
        metadata
      `,
      )
      .eq('id', supplierId)
      .single();

    if (error) throw error;

    // Calculate derived features from transactions and activity
    const { data: transactions } = await this.supabase
      .from('supplier_transactions')
      .select('amount, created_at')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    const { data: activities } = await this.supabase
      .from('supplier_activity_logs')
      .select('activity_type, created_at, engagement_score')
      .eq('supplier_id', supplierId)
      .gte(
        'created_at',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      );

    const totalRevenue =
      transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const monthsActive = Math.max(
      1,
      (Date.now() - new Date(supplier.created_at).getTime()) /
        (30 * 24 * 60 * 60 * 1000),
    );
    const averageMonthlyRevenue = totalRevenue / monthsActive;

    const engagementScore =
      activities?.reduce((sum, a) => sum + (a.engagement_score || 0), 0) || 0;
    const lastPaymentDate = transactions?.[0]?.created_at
      ? new Date(transactions[0].created_at)
      : new Date();

    return {
      supplierId,
      businessType: supplier.business_type || 'unknown',
      subscriptionTier: supplier.subscription_tier || 'basic',
      acquisitionChannel: supplier.acquisition_channel || 'organic',
      monthsActive,
      totalRevenue,
      averageMonthlyRevenue,
      lastPaymentDate,
      engagementScore,
      seasonalActivity: this.calculateSeasonalActivity(activities || []),
      marketPosition: this.determineMarketPosition(
        totalRevenue,
        supplier.business_type,
      ),
      referralScore: supplier.metadata?.referral_score || 0,
      customerSatisfaction: supplier.metadata?.satisfaction_score || 0.75,
    };
  }

  private async initializeModels(): Promise<void> {
    // Initialize Cohort-based Model
    await this.initializeCohortModel();

    // Initialize Bayesian Model
    this.initializeBayesianModel();

    // Initialize ML Regression Model
    await this.initializeMLModel();

    // Register models with weights
    this.models.set('cohort', {
      id: 'cohort-v1',
      type: 'cohort_based',
      weight: 0.4,
      accuracy: 0.82,
      predict: this.cohortBasedPredict.bind(this),
    });

    this.models.set('bayesian', {
      id: 'bayesian-v1',
      type: 'probabilistic',
      weight: 0.3,
      accuracy: 0.78,
      predict: this.bayesianPredict.bind(this),
    });

    this.models.set('ml', {
      id: 'ml-regression-v1',
      type: 'ml_regression',
      weight: 0.3,
      accuracy: 0.87,
      predict: this.mlRegressionPredict.bind(this),
    });
  }

  private async initializeCohortModel(): Promise<void> {
    const { data: cohorts, error } = await this.supabase
      .from('mv_cohort_ltv_analysis')
      .select('*');

    if (error) throw error;

    this.cohortModel = {
      cohortData: new Map(),
    };

    cohorts?.forEach((cohort) => {
      const key = `${cohort.acquisition_channel}_${cohort.plan_tier}`;
      this.cohortModel.cohortData.set(key, {
        retentionRates: [
          cohort.retention_month_1,
          cohort.retention_month_6,
          cohort.retention_month_12,
          cohort.retention_month_24,
        ],
        averageRevenue: cohort.avg_ltv_24m,
        survivalCurve: this.generateSurvivalCurve(cohort),
        sampleSize: cohort.cohort_size,
      });
    });
  }

  private initializeBayesianModel(): void {
    this.bayesianModel = {
      priorDistribution: {
        mean: 1800, // Industry average LTV
        variance: 400000, // High uncertainty initially
      },
      likelihoodParams: {
        alpha: 2, // Shape parameter
        beta: 0.001, // Rate parameter
      },
      posteriorUpdates: 0,
    };
  }

  private async initializeMLModel(): Promise<void> {
    // In a real implementation, this would load from trained model weights
    this.mlModel = {
      features: [
        'monthsActive',
        'averageMonthlyRevenue',
        'engagementScore',
        'seasonalActivity',
        'referralScore',
        'customerSatisfaction',
      ],
      coefficients: [120, 18, 0.8, 2.1, 150, 800],
      intercept: 200,
      featureImportance: {
        averageMonthlyRevenue: 0.35,
        monthsActive: 0.25,
        engagementScore: 0.15,
        customerSatisfaction: 0.12,
        referralScore: 0.08,
        seasonalActivity: 0.05,
      },
      trainingAccuracy: 0.87,
    };
  }

  private async cohortBasedPredict(
    features: SupplierFeatures,
  ): Promise<{ prediction: number; confidence: number }> {
    const cohortKey = `${features.acquisitionChannel}_${features.subscriptionTier}`;
    const cohortData = this.cohortModel.cohortData.get(cohortKey);

    if (!cohortData || cohortData.sampleSize < 10) {
      // Fallback to similar cohorts
      const fallbackPrediction = features.averageMonthlyRevenue * 18; // 18 month average
      return { prediction: fallbackPrediction, confidence: 0.4 };
    }

    // Use survival curve and retention rates for prediction
    const monthlyDecay = 1 - (1 - cohortData.retentionRates[2]) / 12; // Monthly churn rate
    let prediction = 0;
    let currentRevenue = features.averageMonthlyRevenue;

    for (let month = 1; month <= 24; month++) {
      const survivalProbability = Math.pow(monthlyDecay, month);
      prediction += currentRevenue * survivalProbability;
      currentRevenue *= 1.02; // Assume 2% monthly revenue growth for active users
    }

    const confidence = Math.min(0.9, cohortData.sampleSize / 100);

    return { prediction, confidence };
  }

  private async bayesianPredict(
    features: SupplierFeatures,
  ): Promise<{ prediction: number; confidence: number }> {
    // Bayesian update based on supplier features
    const likelihood = this.calculateLikelihood(features);
    const posterior = this.updateBayesianPosterior(features, likelihood);

    const prediction = posterior.mean;
    const confidence = Math.min(
      0.85,
      1 / Math.sqrt(posterior.variance / 10000),
    );

    return { prediction, confidence };
  }

  private async mlRegressionPredict(
    features: SupplierFeatures,
  ): Promise<{ prediction: number; confidence: number }> {
    let prediction = this.mlModel.intercept;

    // Apply feature coefficients
    prediction += features.monthsActive * this.mlModel.coefficients[0];
    prediction += features.averageMonthlyRevenue * this.mlModel.coefficients[1];
    prediction += features.engagementScore * this.mlModel.coefficients[2];
    prediction += features.seasonalActivity * this.mlModel.coefficients[3];
    prediction += features.referralScore * this.mlModel.coefficients[4];
    prediction += features.customerSatisfaction * this.mlModel.coefficients[5];

    // Apply business logic adjustments
    if (features.businessType === 'photographer') prediction *= 1.15;
    if (features.businessType === 'venue') prediction *= 1.25;
    if (features.subscriptionTier === 'premium') prediction *= 1.3;
    if (features.subscriptionTier === 'enterprise') prediction *= 1.5;

    const confidence = this.mlModel.trainingAccuracy;

    return { prediction: Math.max(0, prediction), confidence };
  }

  // Helper methods
  private calculateSeasonalActivity(activities: any[]): number {
    const currentMonth = new Date().getMonth();
    const weddingPeakMonths = [4, 5, 8, 9]; // May, June, September, October
    const baseActivity = activities.length / 90; // Activities per day

    return weddingPeakMonths.includes(currentMonth)
      ? baseActivity * 1.4
      : baseActivity;
  }

  private determineMarketPosition(
    revenue: number,
    businessType: string,
  ): 'premium' | 'standard' | 'budget' {
    const thresholds = {
      photographer: { premium: 2000, standard: 800 },
      venue: { premium: 5000, standard: 2000 },
      caterer: { premium: 3000, standard: 1200 },
      default: { premium: 1500, standard: 600 },
    };

    const threshold =
      thresholds[businessType as keyof typeof thresholds] || thresholds.default;

    if (revenue >= threshold.premium) return 'premium';
    if (revenue >= threshold.standard) return 'standard';
    return 'budget';
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return (
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length
    );
  }

  private applySeasonalAdjustments(
    prediction: EnsemblePrediction,
    features: SupplierFeatures,
  ): EnsemblePrediction {
    const currentMonth = new Date().getMonth();
    const seasonalMultiplier = this.getSeasonalMultiplier(
      currentMonth,
      features.businessType,
    );

    return {
      ...prediction,
      finalPrediction: prediction.finalPrediction * seasonalMultiplier,
      uncertaintyRange: [
        prediction.uncertaintyRange[0] * seasonalMultiplier,
        prediction.uncertaintyRange[1] * seasonalMultiplier,
      ],
    };
  }

  private getSeasonalMultiplier(month: number, businessType: string): number {
    const baseMultipliers: Record<string, number[]> = {
      photographer: [
        0.8, 0.85, 0.95, 1.1, 1.3, 1.4, 1.2, 1.0, 1.35, 1.25, 0.9, 0.85,
      ],
      venue: [0.7, 0.8, 0.9, 1.2, 1.5, 1.6, 1.3, 1.1, 1.45, 1.35, 0.85, 0.8],
      default: [
        0.85, 0.9, 0.95, 1.05, 1.15, 1.2, 1.1, 1.0, 1.2, 1.15, 0.95, 0.9,
      ],
    };

    const multipliers =
      baseMultipliers[businessType] || baseMultipliers.default;
    return multipliers[month];
  }

  private async calculateHistoricalLTV(supplierId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('supplier_transactions')
      .select('amount')
      .eq('supplier_id', supplierId);

    if (error) return 0;

    return data?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
  }

  private calculatePaybackPeriod(
    features: SupplierFeatures,
    predictedLTV: number,
  ): number {
    const estimatedCAC = this.estimateCAC(features.acquisitionChannel);
    return estimatedCAC > 0
      ? Math.ceil(estimatedCAC / (features.averageMonthlyRevenue || 1))
      : 0;
  }

  private async calculateLTVCACRatio(
    supplierId: string,
    predictedLTV: number,
  ): Promise<number> {
    // Simplified CAC calculation - in production, this would use the CAC calculation system
    const { data } = await this.supabase
      .from('marketing_attribution')
      .select('cost_per_touchpoint')
      .eq('customer_id', supplierId);

    const totalCAC =
      data?.reduce((sum, touch) => sum + (touch.cost_per_touchpoint || 0), 0) ||
      100;
    return totalCAC > 0 ? predictedLTV / totalCAC : 0;
  }

  private estimateCAC(channel: string): number {
    const averageCACs = {
      organic: 25,
      email: 35,
      social: 45,
      paid_search: 85,
      display: 65,
      referral: 15,
    };

    return averageCACs[channel as keyof typeof averageCACs] || 50;
  }

  private assessRiskFactors(features: SupplierFeatures): string[] {
    const risks: string[] = [];

    if (features.monthsActive < 3) risks.push('New supplier - limited history');
    if (features.averageMonthlyRevenue < 50) risks.push('Low monthly revenue');
    if (features.engagementScore < 10) risks.push('Low platform engagement');
    if (features.customerSatisfaction < 0.7)
      risks.push('Below average satisfaction');
    if (
      Date.now() - features.lastPaymentDate.getTime() >
      45 * 24 * 60 * 60 * 1000
    ) {
      risks.push('Payment delay risk');
    }

    return risks;
  }

  private calculateChurnProbability(features: SupplierFeatures): number {
    let churnScore = 0;

    // Activity-based indicators
    if (features.monthsActive > 24 && features.averageMonthlyRevenue < 30)
      churnScore += 0.3;
    if (features.engagementScore < 5) churnScore += 0.25;
    if (
      Date.now() - features.lastPaymentDate.getTime() >
      60 * 24 * 60 * 60 * 1000
    )
      churnScore += 0.4;

    // Positive indicators (reduce churn probability)
    if (features.referralScore > 5) churnScore -= 0.15;
    if (features.customerSatisfaction > 0.85) churnScore -= 0.1;
    if (
      features.subscriptionTier === 'premium' ||
      features.subscriptionTier === 'enterprise'
    )
      churnScore -= 0.1;

    return Math.max(0, Math.min(1, churnScore));
  }

  private calculateExpansionPotential(features: SupplierFeatures): number {
    let expansionScore = 0;

    if (
      features.averageMonthlyRevenue > 200 &&
      features.subscriptionTier === 'basic'
    )
      expansionScore += 0.4;
    if (features.engagementScore > 50) expansionScore += 0.3;
    if (features.referralScore > 10) expansionScore += 0.2;
    if (features.customerSatisfaction > 0.8) expansionScore += 0.2;
    if (
      features.businessType === 'venue' ||
      features.businessType === 'photographer'
    )
      expansionScore += 0.1;

    return Math.max(0, Math.min(1, expansionScore));
  }

  private getModelContributingFactors(
    modelType: string,
    features: SupplierFeatures,
  ): string[] {
    switch (modelType) {
      case 'cohort_based':
        return [
          'Historical cohort performance',
          'Retention rates',
          'Channel effectiveness',
        ];
      case 'probabilistic':
        return [
          'Bayesian inference',
          'Prior distribution',
          'Feature likelihood',
        ];
      case 'ml_regression':
        return ['Revenue trend', 'Engagement patterns', 'Satisfaction score'];
      default:
        return [
          'Multi-model ensemble',
          'Feature importance',
          'Historical patterns',
        ];
    }
  }

  // Additional helper methods for Bayesian calculation
  private calculateLikelihood(features: SupplierFeatures): number {
    // Simplified likelihood calculation based on feature similarity to historical successful suppliers
    const factors = [
      features.averageMonthlyRevenue / 100,
      features.engagementScore / 50,
      features.customerSatisfaction,
      features.monthsActive / 12,
    ];

    return factors.reduce(
      (product, factor) => product * Math.max(0.1, factor),
      1,
    );
  }

  private updateBayesianPosterior(
    features: SupplierFeatures,
    likelihood: number,
  ) {
    const prior = this.bayesianModel.priorDistribution;
    const observedRevenue = features.totalRevenue;

    // Simplified Bayesian update
    const precision = 1 / prior.variance;
    const observationPrecision = likelihood;

    const posteriorPrecision = precision + observationPrecision;
    const posteriorMean =
      (precision * prior.mean + observationPrecision * observedRevenue) /
      posteriorPrecision;

    return {
      mean: posteriorMean,
      variance: 1 / posteriorPrecision,
    };
  }

  private generateSurvivalCurve(cohort: any): number[] {
    return [
      1.0,
      cohort.retention_month_1,
      cohort.retention_month_6,
      cohort.retention_month_12,
      cohort.retention_month_24,
    ];
  }

  private async applySegmentFilters(
    supplierIds: string[],
    filters: SegmentFilter[],
  ): Promise<string[]> {
    // Implementation would filter supplier IDs based on segment criteria
    // For now, return all suppliers
    return supplierIds;
  }

  private async runMultipleModels(
    features: SupplierFeatures,
  ): Promise<ModelBreakdown[]> {
    const results: ModelBreakdown[] = [];

    for (const [modelId, model] of Array.from(this.models.entries())) {
      try {
        const prediction = await model.predict(features);
        results.push({
          modelType: model.type,
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          weight: model.weight,
          contributingFactors: this.getModelContributingFactors(
            model.type,
            features,
          ),
        });
      } catch (error) {
        console.warn(`Model ${modelId} failed:`, error);
      }
    }

    return results;
  }
}
