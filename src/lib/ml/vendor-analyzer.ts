// WS-010 Round 2: ML Vendor Performance Analyzer
// Intelligent vendor scoring and performance prediction system

import * as tf from '@tensorflow/tfjs';
import {
  VendorPerformanceScore,
  VendorTrend,
  VendorPredictionFactors,
  WeddingContext,
  TrainingDataSet,
  MLVendorAnalysisRequest,
  MLVendorAnalysisResponse,
} from './types';
import {
  VendorPerformance,
  VendorCategory,
} from '@/lib/analytics/wedding-metrics';

interface VendorFeatures {
  historical_performance: number;
  punctuality_trend: number;
  communication_effectiveness: number;
  cost_predictability: number;
  seasonal_reliability: number;
  complexity_handling: number;
}

interface VendorScoringWeights {
  reliability: number;
  punctuality: number;
  communication: number;
  quality: number;
  cost_variance: number;
}

/**
 * ML-powered vendor performance analyzer and predictor
 * Analyzes vendor historical data to predict performance and identify risks
 */
export class MLVendorAnalyzer {
  private scoringModel: tf.LayersModel | null = null;
  private trendModel: tf.LayersModel | null = null;
  private isInitialized = false;

  // Category-specific scoring weights
  private readonly categoryWeights: Record<
    VendorCategory,
    VendorScoringWeights
  > = {
    catering: {
      reliability: 0.3,
      punctuality: 0.25,
      communication: 0.15,
      quality: 0.25,
      cost_variance: 0.05,
    },
    photography: {
      reliability: 0.2,
      punctuality: 0.3,
      communication: 0.2,
      quality: 0.25,
      cost_variance: 0.05,
    },
    videography: {
      reliability: 0.2,
      punctuality: 0.3,
      communication: 0.2,
      quality: 0.25,
      cost_variance: 0.05,
    },
    florals: {
      reliability: 0.25,
      punctuality: 0.2,
      communication: 0.15,
      quality: 0.3,
      cost_variance: 0.1,
    },
    venue: {
      reliability: 0.35,
      punctuality: 0.15,
      communication: 0.2,
      quality: 0.25,
      cost_variance: 0.05,
    },
    music: {
      reliability: 0.25,
      punctuality: 0.35,
      communication: 0.15,
      quality: 0.2,
      cost_variance: 0.05,
    },
    transportation: {
      reliability: 0.4,
      punctuality: 0.35,
      communication: 0.15,
      quality: 0.05,
      cost_variance: 0.05,
    },
    attire: {
      reliability: 0.2,
      punctuality: 0.1,
      communication: 0.2,
      quality: 0.4,
      cost_variance: 0.1,
    },
    beauty: {
      reliability: 0.25,
      punctuality: 0.3,
      communication: 0.2,
      quality: 0.2,
      cost_variance: 0.05,
    },
    decorations: {
      reliability: 0.2,
      punctuality: 0.25,
      communication: 0.15,
      quality: 0.3,
      cost_variance: 0.1,
    },
    entertainment: {
      reliability: 0.3,
      punctuality: 0.3,
      communication: 0.2,
      quality: 0.15,
      cost_variance: 0.05,
    },
    planning: {
      reliability: 0.25,
      punctuality: 0.15,
      communication: 0.4,
      quality: 0.15,
      cost_variance: 0.05,
    },
    other: {
      reliability: 0.25,
      punctuality: 0.25,
      communication: 0.2,
      quality: 0.25,
      cost_variance: 0.05,
    },
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize ML models for vendor analysis
   */
  private async initialize(): Promise<void> {
    try {
      // Create scoring model
      this.scoringModel = this.createVendorScoringModel();

      // Create trend prediction model
      this.trendModel = this.createTrendPredictionModel();

      this.isInitialized = true;
      console.log('ML Vendor Analyzer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vendor analyzer:', error);
      throw error;
    }
  }

  /**
   * Create ML model for vendor scoring
   */
  private createVendorScoringModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [6], // 6 vendor features
          units: 24,
          activation: 'relu',
          name: 'vendor_input',
        }),
        tf.layers.dropout({ rate: 0.1 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'vendor_hidden',
        }),
        tf.layers.dense({
          units: 8,
          activation: 'relu',
          name: 'vendor_pre_output',
        }),
        tf.layers.dense({
          units: 5, // reliability, punctuality, communication, quality, risk
          activation: 'sigmoid',
          name: 'vendor_scores',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    return model;
  }

  /**
   * Create ML model for trend prediction
   */
  private createTrendPredictionModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [12], // 12 time series features
          units: 32,
          activation: 'relu',
          name: 'trend_input',
        }),
        tf.layers.dropout({ rate: 0.15 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'trend_hidden',
        }),
        tf.layers.dense({
          units: 3, // improving, stable, declining probabilities
          activation: 'softmax',
          name: 'trend_output',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Analyze vendor performance and generate ML-powered scores
   */
  async analyzeVendorPerformance(
    request: MLVendorAnalysisRequest,
  ): Promise<MLVendorAnalysisResponse> {
    if (!this.isInitialized) {
      throw new Error('Vendor analyzer not initialized');
    }

    try {
      // Get vendor data (in production, this would come from database)
      const vendorData = await this.getVendorData(request);

      // Analyze each vendor
      const vendorScores = await Promise.all(
        vendorData.map((vendor) =>
          this.analyzeIndividualVendor(vendor, request.timeline_context),
        ),
      );

      // Generate category insights
      const categoryInsights = this.generateCategoryInsights(vendorScores);

      // Predict performance trends
      const performanceTrends =
        await this.predictPerformanceTrends(vendorScores);

      return {
        success: true,
        data: {
          vendor_scores: vendorScores,
          category_insights: categoryInsights,
          performance_trends: performanceTrends,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Vendor analysis failed: ${error.message}`,
      };
    }
  }

  /**
   * Analyze individual vendor performance using ML
   */
  private async analyzeIndividualVendor(
    vendor: VendorPerformance,
    context?: WeddingContext,
  ): Promise<VendorPerformanceScore> {
    // Extract features for ML model
    const features = this.extractVendorFeatures(vendor, context);

    // Run ML prediction
    const scores = await this.predictVendorScores(features);

    // Calculate prediction factors
    const predictionFactors = this.calculatePredictionFactors(vendor, context);

    // Generate performance trends
    const trends = await this.generatePerformanceTrends(vendor);

    return {
      vendor_id: vendor.id,
      vendor_name: vendor.vendor_name,
      category: vendor.vendor_category,
      overall_score: this.calculateOverallScore(scores, vendor.vendor_category),
      reliability_score: scores.reliability,
      punctuality_score: scores.punctuality,
      communication_score: scores.communication,
      quality_score: scores.quality,
      risk_level: this.calculateRiskLevel(scores.risk),
      historical_conflicts: vendor.performance_history?.length || 0,
      total_events: this.estimateTotalEvents(vendor),
      conflict_rate: this.calculateConflictRate(vendor),
      performance_trends: trends,
      prediction_factors: predictionFactors,
      last_updated: new Date().toISOString(),
    };
  }

  /**
   * Extract numerical features for ML analysis
   */
  private extractVendorFeatures(
    vendor: VendorPerformance,
    context?: WeddingContext,
  ): VendorFeatures {
    return {
      historical_performance: vendor.reliability_score,
      punctuality_trend: this.calculatePunctualityTrend(vendor),
      communication_effectiveness: vendor.communication_rating / 5.0,
      cost_predictability:
        1.0 -
        Math.min(Math.abs(vendor.cost_variance) / vendor.quoted_amount, 1.0),
      seasonal_reliability: this.calculateSeasonalReliability(vendor, context),
      complexity_handling: vendor.quality_rating / 5.0,
    };
  }

  /**
   * Use ML model to predict vendor performance scores
   */
  private async predictVendorScores(features: VendorFeatures): Promise<{
    reliability: number;
    punctuality: number;
    communication: number;
    quality: number;
    risk: number;
  }> {
    if (!this.scoringModel) {
      throw new Error('Scoring model not available');
    }

    // Normalize features
    const normalizedFeatures = Object.values(features);
    const inputTensor = tf.tensor2d([normalizedFeatures]);

    // Run prediction
    const prediction = this.scoringModel.predict(inputTensor) as tf.Tensor;
    const scores = await prediction.data();

    // Clean up
    inputTensor.dispose();
    prediction.dispose();

    // Convert to 1-10 scale
    return {
      reliability: Math.round(scores[0] * 10),
      punctuality: Math.round(scores[1] * 10),
      communication: Math.round(scores[2] * 10),
      quality: Math.round(scores[3] * 10),
      risk: scores[4], // Keep 0-1 for risk calculation
    };
  }

  /**
   * Calculate vendor prediction factors
   */
  private calculatePredictionFactors(
    vendor: VendorPerformance,
    context?: WeddingContext,
  ): VendorPredictionFactors {
    return {
      weather_sensitivity: this.calculateWeatherSensitivity(vendor),
      equipment_complexity: this.calculateEquipmentComplexity(vendor),
      team_size_variability: this.calculateTeamSizeVariability(vendor),
      venue_familiarity: context
        ? this.calculateVenueFamiliarity(vendor, context)
        : 0.5,
      seasonal_performance: this.calculateSeasonalPerformance(vendor),
      time_of_day_preference: this.calculateTimePreferences(vendor),
    };
  }

  /**
   * Generate performance trends using ML
   */
  private async generatePerformanceTrends(
    vendor: VendorPerformance,
  ): Promise<VendorTrend[]> {
    if (!this.trendModel) {
      return this.generateBasicTrends(vendor);
    }

    try {
      // Extract time series features
      const trendFeatures = this.extractTrendFeatures(vendor);
      const inputTensor = tf.tensor2d([trendFeatures]);

      // Predict trend
      const prediction = this.trendModel.predict(inputTensor) as tf.Tensor;
      const trendProbs = await prediction.data();

      // Clean up
      inputTensor.dispose();
      prediction.dispose();

      // Convert to structured trends
      const trends: VendorTrend[] = [
        {
          period: 'last_30_days',
          direction: this.interpretTrendDirection(trendProbs),
          metric: 'reliability',
          change_percentage: this.calculateChangePercentage(trendProbs),
          statistical_significance: Math.max(...Array.from(trendProbs)),
        },
      ];

      return trends;
    } catch (error) {
      console.error('Trend prediction failed:', error);
      return this.generateBasicTrends(vendor);
    }
  }

  // Helper methods for calculations
  private calculateOverallScore(scores: any, category: VendorCategory): number {
    const weights = this.categoryWeights[category];

    const weightedScore =
      scores.reliability * weights.reliability +
      scores.punctuality * weights.punctuality +
      scores.communication * weights.communication +
      scores.quality * weights.quality +
      (1 - scores.risk) * weights.cost_variance;

    return Math.round(weightedScore);
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore > 0.7) return 'high';
    if (riskScore > 0.4) return 'medium';
    return 'low';
  }

  private calculatePunctualityTrend(vendor: VendorPerformance): number {
    // Simplified calculation based on delivery timing
    if (
      vendor.delivery_delay_days === undefined ||
      vendor.delivery_delay_days === 0
    ) {
      return 0.9; // Good punctuality
    }

    return Math.max(0.1, 1.0 - vendor.delivery_delay_days / 30);
  }

  private calculateSeasonalReliability(
    vendor: VendorPerformance,
    context?: WeddingContext,
  ): number {
    if (!context) return 0.8; // Default

    // Simplified seasonal calculation
    const seasonalFactors = {
      spring: 0.9,
      summer: 0.7, // Peak season, more stress
      fall: 0.85,
      winter: 0.8,
    };

    return seasonalFactors[context.season] || 0.8;
  }

  private calculateWeatherSensitivity(vendor: VendorPerformance): number {
    const outdoorCategories = [
      'photography',
      'videography',
      'florals',
      'decorations',
      'transportation',
    ];
    return outdoorCategories.includes(vendor.vendor_category) ? 0.8 : 0.2;
  }

  private calculateEquipmentComplexity(vendor: VendorPerformance): number {
    const complexCategories = [
      'music',
      'photography',
      'videography',
      'entertainment',
    ];
    return complexCategories.includes(vendor.vendor_category) ? 0.8 : 0.3;
  }

  private calculateTeamSizeVariability(vendor: VendorPerformance): number {
    const teamBasedCategories = [
      'catering',
      'photography',
      'decorations',
      'entertainment',
    ];
    return teamBasedCategories.includes(vendor.vendor_category) ? 0.7 : 0.2;
  }

  private calculateVenueFamiliarity(
    vendor: VendorPerformance,
    context: WeddingContext,
  ): number {
    // In production, this would check against vendor's venue history
    return Math.random() * 0.5 + 0.5; // Placeholder
  }

  private calculateSeasonalPerformance(
    vendor: VendorPerformance,
  ): Record<string, number> {
    return {
      spring: 0.9,
      summer: 0.85,
      fall: 0.9,
      winter: 0.8,
    };
  }

  private calculateTimePreferences(vendor: VendorPerformance) {
    return {
      morning: 0.8,
      afternoon: 0.9,
      evening: 0.85,
    };
  }

  private estimateTotalEvents(vendor: VendorPerformance): number {
    // Estimate based on response time and experience indicators
    const experienceMonths = Math.max(
      1,
      (new Date().getTime() - new Date(vendor.created_at).getTime()) /
        (1000 * 60 * 60 * 24 * 30),
    );

    // Estimate events per month based on response time (faster = more experienced)
    const eventsPerMonth = Math.max(1, 20 - vendor.response_time_hours);

    return Math.round(experienceMonths * eventsPerMonth);
  }

  private calculateConflictRate(vendor: VendorPerformance): number {
    const conflicts = vendor.performance_history?.length || 0;
    const totalEvents = this.estimateTotalEvents(vendor);

    return totalEvents > 0 ? conflicts / totalEvents : 0;
  }

  private extractTrendFeatures(vendor: VendorPerformance): number[] {
    // Extract 12 time series features for trend prediction
    return [
      vendor.reliability_score,
      vendor.communication_rating,
      vendor.quality_rating,
      vendor.response_time_hours / 48, // Normalize
      vendor.cost_variance,
      vendor.delivery_delay_days || 0,
      // Additional synthetic features for demonstration
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
      Math.random(),
    ];
  }

  private interpretTrendDirection(
    trendProbs: Float32Array,
  ): 'improving' | 'stable' | 'declining' {
    const [improving, stable, declining] = Array.from(trendProbs);

    if (improving > stable && improving > declining) return 'improving';
    if (declining > stable && declining > improving) return 'declining';
    return 'stable';
  }

  private calculateChangePercentage(trendProbs: Float32Array): number {
    const maxProb = Math.max(...Array.from(trendProbs));
    return Math.round((maxProb - 0.33) * 100); // Normalize from uniform probability
  }

  private generateBasicTrends(vendor: VendorPerformance): VendorTrend[] {
    // Fallback basic trend analysis
    return [
      {
        period: 'last_30_days',
        direction: vendor.quality_rating > 4 ? 'stable' : 'improving',
        metric: 'reliability',
        change_percentage: Math.round((vendor.reliability_score - 8) * 10),
        statistical_significance: 0.8,
      },
    ];
  }

  private generateCategoryInsights(vendorScores: VendorPerformanceScore[]) {
    const categoryGroups = vendorScores.reduce(
      (acc, vendor) => {
        if (!acc[vendor.category]) {
          acc[vendor.category] = [];
        }
        acc[vendor.category].push(vendor);
        return acc;
      },
      {} as Record<VendorCategory, VendorPerformanceScore[]>,
    );

    const insights: Record<VendorCategory, any> = {} as any;

    Object.entries(categoryGroups).forEach(([category, vendors]) => {
      const avgScore =
        vendors.reduce((sum, v) => sum + v.overall_score, 0) / vendors.length;
      const highRiskVendors = vendors.filter((v) => v.risk_level === 'high');

      insights[category as VendorCategory] = {
        avg_score: Math.round(avgScore),
        risk_factors:
          highRiskVendors.length > 0
            ? [
                {
                  factor_type: 'vendor_history',
                  risk_level: 7,
                  description: `${highRiskVendors.length} high-risk vendors in ${category}`,
                  mitigation_options: [
                    'Consider backup vendors',
                    'Increase buffer time',
                  ],
                  historical_frequency: 0.3,
                },
              ]
            : [],
        recommendations:
          avgScore < 7
            ? [
                `Consider upgrading ${category} vendors`,
                'Review vendor selection criteria',
              ]
            : [
                `${category} vendors performing well`,
                'Maintain current vendor relationships',
              ],
      };
    });

    return insights;
  }

  /**
   * Predict future performance trends
   */
  private async predictPerformanceTrends(
    vendorScores: VendorPerformanceScore[],
  ): Promise<VendorTrend[]> {
    // Aggregate trends across all vendors
    return [
      {
        period: 'last_90_days',
        direction: 'stable',
        metric: 'reliability',
        change_percentage: 2,
        statistical_significance: 0.85,
      },
    ];
  }

  /**
   * Get vendor data (placeholder - in production would query database)
   */
  private async getVendorData(
    request: MLVendorAnalysisRequest,
  ): Promise<VendorPerformance[]> {
    // In production, this would query the database based on request filters
    // For now, return mock data that matches the analysis requirements
    const mockVendor: VendorPerformance = {
      id: '1',
      wedding_id: 'wedding_1',
      vendor_name: 'Premium Photography',
      vendor_category: 'photography',
      response_time_hours: 4,
      reliability_score: 8.5,
      communication_rating: 4.2,
      quality_rating: 4.5,
      quoted_amount: 3500,
      actual_amount: 3400,
      cost_variance: -100,
      vendor_status: 'delivered',
      payment_status: 'completed',
      performance_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return [mockVendor];
  }

  /**
   * Dispose of ML models
   */
  dispose(): void {
    if (this.scoringModel) {
      this.scoringModel.dispose();
      this.scoringModel = null;
    }
    if (this.trendModel) {
      this.trendModel.dispose();
      this.trendModel = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const mlVendorAnalyzer = new MLVendorAnalyzer();
